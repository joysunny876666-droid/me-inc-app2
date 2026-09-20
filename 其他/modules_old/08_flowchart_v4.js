// ============================================================
// 模組 08: v4.1 視覺化流程圖系統 (Flowchart Visualization System)
// ============================================================

let flowchartCurrentTask = null; 

function setupFlowchartListeners() {
    const openBtn = document.getElementById('openFlowchartBtn');
    const closeBtn = document.getElementById('closeFlowchartBtn');
    const modal = document.getElementById('flowchartModal');
    
    if (openBtn) openBtn.onclick = () => openFlowchartModal();
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
    
    // 設定時間 Modal
    const closeSetTimeBtn = document.getElementById('closeSetTimeBtn');
    const cancelSetTimeBtn = document.getElementById('cancelSetTimeBtn');
    const confirmSetTimeBtn = document.getElementById('confirmSetTimeBtn');
    const removeBtn = document.getElementById('removeFromFlowchartBtn');
    const setTimeModal = document.getElementById('setTimeModal');
    
    if (closeSetTimeBtn) closeSetTimeBtn.onclick = () => closeTimeModal();
    if (cancelSetTimeBtn) cancelSetTimeBtn.onclick = () => closeTimeModal();
    if (confirmSetTimeBtn) confirmSetTimeBtn.onclick = () => handleSetTimeConfirm();
    if (removeBtn) removeBtn.onclick = () => handleRemoveFromFlowchart();
}

function closeTimeModal() {
    const modal = document.getElementById('setTimeModal');
    if(modal) modal.classList.add('hidden');
    flowchartCurrentTask = null;
}

function findTaskOrGanttById(id) {
    if (state.tasks) {
        let task = state.tasks.find(t => t.id === id || t.id.toString() === id.toString());
        if (task) return task;
    }
    
    const localFindGanttItem = (items, targetId) => {
        if (!items) return null;
        for (const it of items) {
            if (it.id == targetId) return it;
            if (it.children) {
                const found = localFindGanttItem(it.children, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    if (state.ganttSystem && state.ganttSystem.projects) {
        for (const proj of state.ganttSystem.projects) {
            const item = localFindGanttItem(proj.parents, id);
            if (item) return item;
        }
    }
    return null;
}

function renderTodayFlowchart() {
    const todayGrid = document.getElementById('todayGrid');
    if (!todayGrid) return;

    todayGrid.innerHTML = '';
    const todayStr = getLocalDateStr();
    
    let allTasks = [
        ...getTasksForDate(todayStr),
        ...getGanttTasksForDate(todayStr, true)
    ];

    // 1. Draw 24 hours grid
    for (let i = 0; i < 24; i++) {
        const row = document.createElement('div');
        row.className = 'flowchart-hour-row';
        
        const label = document.createElement('div');
        label.className = 'flowchart-hour-label';
        label.textContent = `${i.toString().padStart(2, '0')}:00`;
        
        const content = document.createElement('div');
        content.className = 'flowchart-hour-content';
        content.dataset.hour = i;

        // Drop zone logic
        content.addEventListener('dragover', e => {
            e.preventDefault();
            content.classList.add('drag-over');
        });
        content.addEventListener('dragleave', () => {
            content.classList.remove('drag-over');
        });
        content.addEventListener('drop', e => {
            e.preventDefault();
            content.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            handleDropTask(taskId, i);
        });

        row.appendChild(label);
        row.appendChild(content);
        todayGrid.appendChild(row);
    }

    // 2. Process tasks for absolute positioning
    let tasksWithTime = [];
    allTasks.forEach(t => {
        if (!t.time || t.isBadHabit) return;
        const isChecked = t.isGantt ? t.completed : taskIsCompletedForDate(t, todayStr);
        if (isChecked) return;
        
        const timeParts = t.time.split(':');
        let startMin = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1] || 0, 10);
        let endMin = startMin + 60; // default 1 hour
        if (t.endTime) {
            const endParts = t.endTime.split(':');
            endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] || 0, 10);
            if (endMin <= startMin) endMin += 24 * 60;
        }
        
        tasksWithTime.push({
            originalTask: t,
            startMin: startMin,
            endMin: endMin
        });
    });

    tasksWithTime.sort((a,b) => a.startMin - b.startMin || b.endMin - a.endMin);

    let currentGroup = [];
    let maxEnd = 0;
    let finalGroups = [];
    
    tasksWithTime.forEach(t => {
        if (currentGroup.length === 0) {
            currentGroup.push(t);
            maxEnd = t.endMin;
        } else {
            if (t.startMin < maxEnd) {
                currentGroup.push(t);
                maxEnd = Math.max(maxEnd, t.endMin);
            } else {
                finalGroups.push(currentGroup);
                currentGroup = [t];
                maxEnd = t.endMin;
            }
        }
    });
    if (currentGroup.length > 0) finalGroups.push(currentGroup);

    // 3. Render absolute tasks
    const ROW_HEIGHT = 44; // Matches style.css
    finalGroups.forEach(group => {
        const columnsCount = group.length;
        group.forEach((t, index) => {
            const block = document.createElement('div');
            block.className = 'flowchart-task-block';
            block.style.position = 'absolute';
            
            // 60px is the label width, add 4px padding
            block.style.left = `calc(64px + (100% - 68px) * ${index / columnsCount})`;
            block.style.width = `calc((100% - 68px) / ${columnsCount} - 4px)`;
            
            const topPx = (t.startMin / 60) * ROW_HEIGHT;
            let durationMin = t.endMin - t.startMin;
            if (durationMin < 15) durationMin = 15; // min height
            let heightPx = (durationMin / 60) * ROW_HEIGHT;
            
            // Adjust to fit within bounds visually without overlapping borders
            block.style.top = `${topPx + 2}px`;
            block.style.minHeight = `${heightPx - 4}px`; // Use minHeight instead of height to allow expansion
            block.style.boxSizing = 'border-box';
            block.style.zIndex = '10';
            block.style.overflow = 'visible'; // Allow full text visibility
            block.style.flexDirection = 'column';
            block.style.alignItems = 'center';
            block.style.justifyContent = 'center';
            block.style.textAlign = 'center';

            const ot = t.originalTask;
            const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
            let hash = 0;
            const strForHash = ot.name || (ot.id ? ot.id.toString() : 'task');
            for (let i = 0; i < strForHash.length; i++) {
                hash = strForHash.charCodeAt(i) + ((hash << 5) - hash);
            }
            block.style.backgroundColor = colors[Math.abs(hash) % colors.length];
            if (ot.isGantt) {
                block.classList.add('flowchart-gantt-block');
                block.style.borderLeft = '4px solid var(--accent-blue)';
            }
            let endStr = ot.endTime ? `-${ot.endTime}` : '';
            block.innerHTML = `<span class="ftb-time">${ot.time}${endStr}</span><span class="ftb-name" style="white-space: normal; word-break: break-all; width: 100%;">${ot.name}${ot.isGantt ? ' <span style="font-size:0.7rem;opacity:0.8;">(企劃)</span>' : ''}</span>`;
            block.onclick = () => openTimeRangeModal(ot);
            todayGrid.appendChild(block);
        });
    });
}

function taskIsCompletedForDate(task, dateStr) {
    if(task.type === 'normal') {
        return state.completedHistory && state.completedHistory[dateStr] === true && task.date === dateStr;
    }
    return task.completedHistory && task.completedHistory[dateStr] === true;
}

function renderTodayPendingTasks() {
    const container = document.getElementById('todayPendingTasks');
    if (!container) return;

    container.innerHTML = '';
    const todayStr = getLocalDateStr();
    
    const normalTasks = getTasksForDate(todayStr);
    const ganttTasks = getGanttTasksForDate(todayStr, true);

    let allPending = [];
    
    normalTasks.forEach(t => {
        const isChecked = t.completedHistory && t.completedHistory[todayStr] === true;
        if (isChecked || t.time || t.isBadHabit || t.isPersistent) return;
        allPending.push(t);
    });
    
    ganttTasks.forEach(t => {
        if (t.completed || t.time) return;
        allPending.push(t);
    });

    let count = 0;
    allPending.forEach(task => {
        const chip = document.createElement('div');
        chip.className = 'pending-task-chip';
        if (task.isGantt) {
            chip.classList.add('pending-gantt-chip');
            chip.style.borderLeft = '3px solid var(--accent-blue)';
        }
        chip.draggable = true;
        chip.textContent = task.name + (task.isGantt ? ' (企劃)' : '');
        chip.dataset.id = task.id;

        chip.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', task.id);
            chip.style.opacity = '0.5';
        });
        chip.addEventListener('dragend', () => {
            chip.style.opacity = '1';
        });

        container.appendChild(chip);
        count++;
    });

    if (count === 0) {
        container.innerHTML = '<span style="color:var(--text-secondary);font-size:0.85rem;">目前沒有待排程的任務</span>';
    }

    // 計算今日進度：
    // 過濾出包含 Mission、不含 BadHabit、不含 Persistent、不含扣分項目（分數小於 0 視為扣分）
    const combinedTasks = [...normalTasks, ...ganttTasks];
    const validTodayTasks = combinedTasks.filter(t =>
        !t.isBadHabit &&
        !t.isPersistent && 
        (t.score === undefined || t.score >= 0)
    );
    
    const totalCount = validTodayTasks.length;
    const completedCount = validTodayTasks.filter(t => {
        if (t.isGantt) return t.completed;
        return t.completedHistory && t.completedHistory[todayStr];
    }).length;
    
    const progressSpan = document.getElementById('todayPendingProgressCount');
    if (progressSpan) {
        progressSpan.textContent = `(${completedCount}/${totalCount})`;
        progressSpan.style.color = 'var(--accent-blue)';
        progressSpan.style.fontWeight = 'bold';
        progressSpan.style.marginLeft = '5px';
    }
}

function handleDropTask(taskId, hour) {
    const todayStr = getLocalDateStr();
    const task = findTaskOrGanttById(taskId);
    if (!task) return;

    const hourStr = hour.toString().padStart(2, '0') + ':00';
    
    if (task.isGantt) {
        if (!task.exceptions) task.exceptions = {};
        if (!task.exceptions[todayStr] || typeof task.exceptions[todayStr] !== 'object') {
            task.exceptions[todayStr] = { time: hourStr };
        } else {
            task.exceptions[todayStr].time = hourStr;
        }
    } else if (task.type === 'normal') {
        task.time = hourStr;
    } else {
        // Recurring task - save to exceptions
        if (!task.exceptions) task.exceptions = {};
        if (!task.exceptions[todayStr] || typeof task.exceptions[todayStr] !== 'object') {
            task.exceptions[todayStr] = { time: hourStr };
        } else {
            task.exceptions[todayStr].time = hourStr;
        }
    }

    saveState();
    renderTodayFlowchart();
    renderTodayPendingTasks();
}

function openTimeRangeModal(task) {
    flowchartCurrentTask = findTaskOrGanttById(task.id);
    if (!flowchartCurrentTask) return;
    
    const modal = document.getElementById('setTimeModal');
    const nameEl = document.getElementById('setTimeTaskName');
    const startEl = document.getElementById('setTimeStart');
    const endEl = document.getElementById('setTimeEnd');

    nameEl.textContent = flowchartCurrentTask.name;
    
    let timeStr = flowchartCurrentTask.time || '';
    let endTimeStr = flowchartCurrentTask.endTime || '';

    const todayStr = getLocalDateStr();
    if ((flowchartCurrentTask.type === 'recurring' || flowchartCurrentTask.isGantt) && flowchartCurrentTask.exceptions && flowchartCurrentTask.exceptions[todayStr]) {
        if(flowchartCurrentTask.exceptions[todayStr].time !== undefined) timeStr = flowchartCurrentTask.exceptions[todayStr].time;
        if(flowchartCurrentTask.exceptions[todayStr].endTime !== undefined) endTimeStr = flowchartCurrentTask.exceptions[todayStr].endTime;
    }

    if (timeStr) {
        startEl.value = timeStr;
    } else {
        startEl.value = '';
    }

    if (endTimeStr) {
        endEl.value = endTimeStr;
    } else {
        endEl.value = '';
    }

    modal.classList.remove('hidden');
}

function handleSetTimeConfirm() {
    if (!flowchartCurrentTask) return;
    const task = flowchartCurrentTask;
    const todayStr = getLocalDateStr();

    const startVal = document.getElementById('setTimeStart').value;
    const endVal = document.getElementById('setTimeEnd').value;

    if (!startVal) {
        alert("請輸入開始時間");
        return;
    }

    const timeStr = startVal;
    const endTimeStr = endVal;

    if (task.type === 'normal') {
        task.time = timeStr;
        if (endTimeStr) task.endTime = endTimeStr;
        else delete task.endTime;
    } else {
        if (!task.exceptions) task.exceptions = {};
        if (!task.exceptions[todayStr] || typeof task.exceptions[todayStr] !== 'object') {
            task.exceptions[todayStr] = { time: timeStr };
            if(endTimeStr) task.exceptions[todayStr].endTime = endTimeStr;
        } else {
            task.exceptions[todayStr].time = timeStr;
            if(endTimeStr) task.exceptions[todayStr].endTime = endTimeStr;
            else delete task.exceptions[todayStr].endTime;
        }
    }

    saveState();
    closeTimeModal();
    renderTodayFlowchart();
    renderTodayPendingTasks();
}

function handleRemoveFromFlowchart() {
    if (!flowchartCurrentTask) return;
    const task = flowchartCurrentTask;
    const todayStr = getLocalDateStr();

    if (task.type === 'normal') {
        delete task.time;
        delete task.endTime;
    } else {
        if (!task.exceptions) task.exceptions = {};
        if (!task.exceptions[todayStr] || typeof task.exceptions[todayStr] !== 'object') {
            task.exceptions[todayStr] = { time: '' };
        } else {
            task.exceptions[todayStr].time = '';
            delete task.exceptions[todayStr].endTime;
        }
    }

    saveState();
    closeTimeModal();
    renderTodayFlowchart();
    renderTodayPendingTasks();
}

// 供外部呼叫更新新增頁面的右側欄位
window.updateAddViewRightSidebar = function() {
    renderTodayFlowchart();
    renderTodayPendingTasks();
};

document.addEventListener('DOMContentLoaded', () => {
    setupFlowchartListeners();
});
