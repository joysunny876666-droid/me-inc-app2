// ============================================================
// 璅∠? 08: v4.0 閬死??蝔?蝟餌絞 (Flowchart Visualization System)
// ============================================================
// 甇斗芋蝯祕雿?v4.0 ???嚗?
//   1. 隞瘚???閬箏?嚗憛?蝘餃??嚗?
//   2. ?梯?蝔??
//   3. ?宏??唳?蝔?
//   4. 暺?閮剖???蝭?
//   5. 靽格????摩嚗?隞予???誨敺??嚗?
//   6. 隞餃??折??桐耨?寞??芷??摨?
// ============================================================

// ?典?霈
let flowchartCurrentTask = null;  // 甇?閮剖????遙??

// ?????????????????????????????????????????????
// 禮 1. 閮剔蔭瘚???隞嗥?賢
// ?????????????????????????????????????????????
function setupFlowchartListeners() {
    const openBtn = document.getElementById('openFlowchartBtn');
    const closeBtn = document.getElementById('closeFlowchartBtn');
    const modal = document.getElementById('flowchartModal');
    
    if (openBtn) {
        openBtn.onclick = () => {
            openFlowchartModal();
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
        };
    }
    
    // 閮剖??? Modal ??賢
    const closeSetTimeBtn = document.getElementById('closeSetTimeBtn');
    const cancelSetTimeBtn = document.getElementById('cancelSetTimeBtn');
    const confirmSetTimeBtn = document.getElementById('confirmSetTimeBtn');
    const setTimeModal = document.getElementById('setTimeModal');
    
    if (closeSetTimeBtn) {
        closeSetTimeBtn.onclick = () => {
            setTimeModal.classList.add('hidden');
            flowchartCurrentTask = null;
        };
    }
    
    if (cancelSetTimeBtn) {
        cancelSetTimeBtn.onclick = () => {
            setTimeModal.classList.add('hidden');
            flowchartCurrentTask = null;
        };
    }
    
    if (confirmSetTimeBtn) {
        confirmSetTimeBtn.onclick = () => {
            handleSetTimeConfirm();
        };
    }
}

// ?????????????????????????????????????????????
// 禮 2. ??瘚???Modal
// ?????????????????????????????????????????????
function openFlowchartModal() {
    const modal = document.getElementById('flowchartModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    renderFlowchart();
}

// ?????????????????????????????????????????????
// 禮 3. 皜脫?瘚???
// ?????????????????????????????????????????????
function renderFlowchart() {
    const todayStr = getLocalDateStr();
    const todayTasks = getTasksForDate(todayStr);
    
    // ?????殷??寞??瘙?
    const regularTasks = todayTasks.filter(t => !t.isGantt);
    
    // 皜脫?撌血??”
    renderFlowchartTaskList(regularTasks, todayStr);
    
    // 皜脫??喳??頠?
    renderFlowchartTimeline(regularTasks, todayStr);
}

// ?????????????????????????????????????????????
// 禮 4. 皜脫?撌血隞餃??”
// ?????????????????????????????????????????????
function renderFlowchartTaskList(tasks, dateStr) {
    const container = document.getElementById('flowchartTodayTasks');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (tasks.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">隞?⊿???/div>';
        return;
    }
    
    tasks.forEach(task => {
        const isCompleted = task.completedHistory && task.completedHistory[dateStr];
        
        const taskCard = document.createElement('div');
        taskCard.className = 'flowchart-task-card';
        taskCard.draggable = true;
        taskCard.style.cssText = `
            background: ${isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'var(--card-bg)'};
            border: 1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'};
            border-radius: 8px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        taskCard.innerHTML = `
            <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; ${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                ${task.time ? `??${task.time}${task.endTime ? '-' + task.endTime : ''}` : '?? ?⊥???}
            </div>
            <div style="font-size: 0.75rem; color: var(--accent-blue); margin-top: 4px;">
                ${task.score >= 0 ? '+' : ''}${task.score} ??
            </div>
        `;
        
        // 暺?鈭辣嚗??身摰???閰望?
        taskCard.onclick = () => {
            openSetTimeModal(task, dateStr);
        };
        
        // ?鈭辣
        taskCard.ondragstart = (e) => {
            e.dataTransfer.setData('taskId', task.id);
            e.dataTransfer.setData('dateStr', dateStr);
            taskCard.style.opacity = '0.5';
        };
        
        taskCard.ondragend = () => {
            taskCard.style.opacity = '1';
        };
        
        // Hover ??
        taskCard.onmouseenter = () => {
            taskCard.style.borderColor = 'var(--accent-blue)';
            taskCard.style.transform = 'translateY(-2px)';
        };
        
        taskCard.onmouseleave = () => {
            taskCard.style.borderColor = isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)';
            taskCard.style.transform = 'translateY(0)';
        };
        
        container.appendChild(taskCard);
    });
}

// ?????????????????????????????????????????????
// 禮 5. 皜脫???頠?
// ?????????????????????????????????????????????
function renderFlowchartTimeline(tasks, dateStr) {
    const timeline = document.getElementById('flowchartTimeline');
    if (!timeline) return;
    
    timeline.innerHTML = '';
    
    // 撱箇? 24 撠????局
    for (let hour = 0; hour < 24; hour++) {
        const hourSlot = document.createElement('div');
        hourSlot.className = 'flowchart-hour-slot';
        hourSlot.dataset.hour = hour;
        hourSlot.style.cssText = `
            min-height: 60px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            padding: 8px;
            position: relative;
            background: var(--bg-primary);
            transition: background 0.2s;
        `;
        
        // ??璅惜
        const timeLabel = document.createElement('div');
        timeLabel.style.cssText = `
            position: absolute;
            left: 8px;
            top: 8px;
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 600;
        `;
        timeLabel.textContent = `${String(hour).padStart(2, '0')}:00`;
        hourSlot.appendChild(timeLabel);
        
        // ????
        hourSlot.ondragover = (e) => {
            e.preventDefault();
            hourSlot.style.background = 'rgba(59, 130, 246, 0.1)';
        };
        
        hourSlot.ondragleave = () => {
            hourSlot.style.background = 'var(--bg-primary)';
        };
        
        hourSlot.ondrop = (e) => {
            e.preventDefault();
            hourSlot.style.background = 'var(--bg-primary)';
            
            const taskId = e.dataTransfer.getData('taskId');
            const sourceDateStr = e.dataTransfer.getData('dateStr');
            
            const task = state.tasks.find(t => t.id == taskId);
            if (task) {
                // ??閮剖???撠店獢??身???箸??曄?撠?
                openSetTimeModal(task, sourceDateStr, hour);
            }
        };
        
        // 撠???挾?遙?蒂憿舐內
        const hourTasks = tasks.filter(t => {
            if (!t.time) return false;
            const [taskHour] = t.time.split(':').map(Number);
            return taskHour === hour;
        });
        
        if (hourTasks.length > 0) {
            const tasksContainer = document.createElement('div');
            tasksContainer.style.cssText = 'margin-top: 30px; display: flex; flex-wrap: wrap; gap: 6px;';
            
            hourTasks.forEach(task => {
                const isCompleted = task.completedHistory && task.completedHistory[dateStr];
                const taskBadge = document.createElement('div');
                taskBadge.style.cssText = `
                    background: ${isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.8)'};
                    border: 1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 1)'};
                    border-radius: 6px;
                    padding: 6px 10px;
                    font-size: 0.8rem;
                    color: white;
                    cursor: pointer;
                    ${isCompleted ? 'text-decoration: line-through; opacity: 0.6;' : ''}
                `;
                taskBadge.textContent = `${task.name} (${task.time}${task.endTime ? '-' + task.endTime : ''})`;
                
                taskBadge.onclick = () => {
                    openSetTimeModal(task, dateStr);
                };
                
                tasksContainer.appendChild(taskBadge);
            });
            
            hourSlot.appendChild(tasksContainer);
        }
        
        timeline.appendChild(hourSlot);
    }
}

// ?????????????????????????????????????????????
// 禮 6. ??閮剖??? Modal
// ?????????????????????????????????????????????
function openSetTimeModal(task, dateStr, defaultHour = null) {
    const modal = document.getElementById('setTimeModal');
    const nameEl = document.getElementById('setTimeTaskName');
    const startInput = document.getElementById('setTimeStart');
    const endInput = document.getElementById('setTimeEnd');
    
    if (!modal) return;
    
    flowchartCurrentTask = { task, dateStr };
    
    // 閮剖?隞餃??迂
    if (nameEl) {
        nameEl.textContent = task.name;
    }
    
    // ?身??
    if (defaultHour !== null) {
        startInput.value = `${String(defaultHour).padStart(2, '0')}:00`;
        if (task.endTime && task.time) {
            // 靽?????摨?
            const [sh, sm] = task.time.split(':').map(Number);
            const [eh, em] = task.endTime.split(':').map(Number);
            const duration = (eh + em / 60) - (sh + sm / 60);
            const newEndHour = Math.min(23, Math.floor(defaultHour + duration));
            const newEndMin = Math.round(((defaultHour + duration) % 1) * 60);
            endInput.value = `${String(newEndHour).padStart(2, '0')}:${String(newEndMin).padStart(2, '0')}`;
        }
    } else {
        startInput.value = task.time || '';
        endInput.value = task.endTime || '';
    }
    
    modal.classList.remove('hidden');
}

// ?????????????????????????????????????????????
// 禮 7. 蝣箄?閮剖???
// ?????????????????????????????????????????????
function handleSetTimeConfirm() {
    if (!flowchartCurrentTask) return;
    
    const startTime = document.getElementById('setTimeStart').value;
    const endTime = document.getElementById('setTimeEnd').value;
    const { task, dateStr } = flowchartCurrentTask;
    
    if (!startTime) {
        alert('隢撓?仿?憪???);
        return;
    }
    
    if (endTime && endTime <= startTime) {
        alert('蝯???敹??????');
        return;
    }
    
    // v4.0 ?圈?頛荔??寞?隞餃?憿?瘙箏?靽格?孵?
    const actualTask = state.tasks.find(t => t.id == task.id);
    if (!actualTask) {
        alert('?曆??啗府隞餃?');
        return;
    }
    
    if (actualTask.type === 'recurring') {
        // ??隞餃?嚗?隞予???誨敺??
        handleRecurringTaskUpdate(actualTask, dateStr, { time: startTime, endTime: endTime });
    } else {
        // ?格活隞餃?嚗?乩耨??
        actualTask.time = startTime;
        actualTask.endTime = endTime || null;
    }
    
    // ?? Modal 銝阡??唳葡??
    document.getElementById('setTimeModal').classList.add('hidden');
    flowchartCurrentTask = null;
    
    saveState();
    renderFlowchart();
    renderWeeklySchedule(); // ?郊?湔?梯?蝔?
    renderStartPage();       // ?郊?湔銝駁?
    
    alert('??撌脫?堆?');
}

// ?????????????????????????????????????????????
// 禮 8. v4.0 ??隞餃??湔?摩
// ?????????????????????????????????????????????
/**
 * 敺?憭拚?憪?隞??蝥??桃??摩
 * 
 * ??嚗?
 * 1. 撠???銴??甇Ｗ?典予
 * 2. 撱箇??啁???摨?敺?憭拚?憪?憟?啁?撅祆?
 * 3. 憒??臭遙??isMission)嚗?斗??銴????芯??甈∩遙??
 */
function handleRecurringTaskUpdate(task, dateStr, updates) {
    const todayStr = getLocalDateStr();
    
    // 憒??臭遙?折??殷??芷?游?銴???
    if (task.isMission) {
        // ?芷????隞餃?
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        
        // 撱箇??啁??格活隞餃?
        const newTask = {
            ...task,
            id: Date.now(),
            type: 'scheduled',
            date: dateStr,
            recurrence: null,
            ...updates,
            exceptions: {},
            completedHistory: {},
            badHabitHistory: {}
        };
        
        state.tasks.push(newTask);
        alert('隞餃??折??桀歇頧?格活隞餃?嚗?銴??歇?芷');
        return;
    }
    
    // 銝?祇?銴遙???芣迫????撱箇??啣???
    const yesterday = new Date(dateStr);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);
    
    // 閮剖?????蝯??交?
    if (task.recurrence) {
        task.recurrence.endDate = yesterdayStr;
    }
    
    // 蝜潭敺?憭抵絲??exceptions
    const inheritedExceptions = {};
    if (task.exceptions) {
        Object.keys(task.exceptions).forEach(key => {
            if (key >= dateStr) {
                inheritedExceptions[key] = task.exceptions[key];
                delete task.exceptions[key];
            }
        });
    }
    
    // 撱箇??啁???摨?
    const newTask = {
        ...task,
        id: Date.now(),
        ...updates,
        recurrence: {
            ...task.recurrence,
            startDate: dateStr,
            endDate: null
        },
        exceptions: inheritedExceptions,
        completedHistory: {},
        badHabitHistory: {}
    };
    
    state.tasks.push(newTask);
}

// ?????????????????????????????????????????????
// 禮 9. ????
// ?????????????????????????????????????????????
// 撠迨?賢??湧蝯血撅嚗? init() ?臭誑?澆
window.setupFlowchartListeners = setupFlowchartListeners;
window.openFlowchartModal = openFlowchartModal;
window.handleRecurringTaskUpdate = handleRecurringTaskUpdate;
