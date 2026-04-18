// ============================================================
// 模組 06: 月曆與週行程系統 (Calendar & Weekly Schedule)
// ============================================================
// 這個檔案負責所有「時間視覺化」的功能，讓你可以用
// 月曆或週行程表的方式來查看任務分布。
//
// 包含：
//   - 月曆渲染 (renderCalendar)：顯示一整個月，每天的任務預覽
//   - 行程細節 Modal (showDetailModal)：點擊某天後顯示當天所有任務
//   - 週行程表 (renderWeeklySchedule)：時間軸格式的一週視圖
//   - 無時間任務側邊欄 (renderUntimedSidebar)：顯示本週沒有指定時間的任務
//   - 編輯 Modal 設置 (setupEditListeners, openEditModal)
//   - 日期移動功能 (enterMoveMode, cancelMove, completeMove)
// ============================================================

// ─────────────────────────────────────────────
// § 1. 月曆渲染 (renderCalendar)
// ─────────────────────────────────────────────
/**
 * 【renderCalendar】渲染月曆視圖
 * 生成該月每一天的格子，並在有任務的天數上顯示預覽指示點和任務名稱。
 * 點擊某天的格子會呼叫 showDetailModal() 顯示詳細任務列表。
 *
 * @param {Date} date - 要顯示的月份（使用該 Date 物件的年和月）
 */
function renderCalendar(date) {
    if (!els.calendar.grid) return;

    const year = date.getFullYear();
    const month = date.getMonth();

    // 更新月份標籤
    if (els.calendar.label) els.calendar.label.textContent = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
    els.calendar.grid.innerHTML = '';

    // 星期標題列
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const d = document.createElement('div');
        d.className = 'calendar-day-header';
        d.textContent = day;
        els.calendar.grid.appendChild(d);
    });

    // 計算當月第一天是星期幾（以決定需要多少個空格）
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // 當月總天數

    // 填入空格（月初之前的日期）
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day empty';
        els.calendar.grid.appendChild(cell);
    }

    const todayStr = getLocalDateStr();

    // 填入當月每一天
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        cell.dataset.date = dateStr;

        // 標記今天
        if (dateStr === todayStr) cell.classList.add('today');

        cell.innerHTML = `<span class="day-number">${i}</span>`;

        // 取得該天的任務，並顯示預覽
        const tasks = getTasksForDate(dateStr);
        if (tasks.length > 0) {
            // 顯示重要程度最高的指示點
            const hasImportant = tasks.some(t => ['critical', 'high'].includes(t.importance));
            const dot = document.createElement('div');
            dot.className = `day-indicator ${hasImportant ? 'has-important' : ''}`;
            cell.appendChild(dot);

            // 顯示前幾個任務的名稱預覽
            const previewLimit = 3;
            tasks.slice(0, previewLimit).forEach(t => {
                const p = document.createElement('div');
                p.className = 'calendar-task-preview';
                p.textContent = t.name;
                if (t.completedHistory && t.completedHistory[dateStr]) {
                    p.style.textDecoration = 'line-through';
                    p.style.opacity = '0.5';
                }
                cell.appendChild(p);
            });

            // 如果任務超過顯示限制，顯示 "+X more"
            if (tasks.length > previewLimit) {
                const more = document.createElement('div');
                more.className = 'calendar-task-preview';
                more.style.fontStyle = 'italic';
                more.textContent = `+${tasks.length - previewLimit} more`;
                cell.appendChild(more);
            }
        }

        // 點擊事件：顯示當天的詳細行程
        cell.onclick = () => showDetailModal(dateStr, tasks);
        els.calendar.grid.appendChild(cell);
    }
}

// ─────────────────────────────────────────────
// § 2. 行程細節 Modal (showDetailModal)
// ─────────────────────────────────────────────
/**
 * 【showDetailModal】顯示某天的所有任務詳情 Modal
 * 也用於「新增/刪除完成後」重新顯示更新後的任務列表。
 *
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {Array} tasks - 該天的任務陣列
 */
function showDetailModal(dateStr, tasks) {
    if (!els.modal.el) return;

    if (els.modal.label) els.modal.label.textContent = `${dateStr} 行程細節`;
    if (els.modal.list) els.modal.list.innerHTML = '';

    if (tasks.length === 0) {
        if (els.modal.list) els.modal.list.innerHTML = '<p style="text-align:center; color:gray;">無行程</p>';
    } else {
        tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'task-item';
            div.style.justifyContent = 'space-between';
            const timeStr = task.time ? (task.endTime ? `${task.time} - ${task.endTime}` : task.time) : '';
            const timeDisplay = timeStr
                ? `<span style="margin-right:8px; color:#aaa; font-size:0.9rem; font-family:monospace;">${timeStr}</span>`
                : '';

            div.innerHTML = `
                <div class="task-info">
                    <span class="task-name">${timeDisplay}${task.name}</span>
                    <div class="task-meta">${mapImportance(task.importance)} | ${task.score}</div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="btn-edit" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.8rem; cursor:pointer;">編輯</button>
                    <button class="btn-cancel" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.8rem; cursor:pointer;">取消</button>
                </div>
            `;

            div.querySelector('.btn-edit').onclick = () => openEditModal(task, dateStr);
            div.querySelector('.btn-cancel').onclick = () => initiateDelete(task, dateStr);

            if (els.modal.list) els.modal.list.appendChild(div);
        });
    }

    els.modal.el.classList.remove('hidden');
}

// ─────────────────────────────────────────────
// § 3. 開啟編輯 Modal (openEditModal)
// ─────────────────────────────────────────────
// 相關狀態變數
let taskToEdit = null;
let editOriginalDateVal = null;
let editPendingData = null;

/**
 * 【openEditModal】開啟任務編輯 Modal，並填入當前任務的資料
 * 重複任務和單次任務都使用同一個 Modal，
 * 但儲存時若任務是重複型，會顯示選擇範圍的第二個 Modal
 * （僅修改這次 / 修改之後所有）。
 *
 * @param {Object} task - 要編輯的任務物件
 * @param {string} dateStr - 點擊的是哪一天的任務
 */
function openEditModal(task, dateStr) {
    if (!els.editModal.el) return;

    // 填入資料
    els.editModal.taskId.value = task.id;
    els.editModal.originalDate.value = dateStr;
    els.editModal.taskDate.value = dateStr;
    els.editModal.name.value = task.name;
    els.editModal.time.value = task.time || '';
    if (els.editModal.endTime) els.editModal.endTime.value = task.endTime || '';
    if (els.editModal.score) els.editModal.score.value = task.score;
    if (document.getElementById('editImportance')) document.getElementById('editImportance').value = task.importance || 'medium';
    if (els.editModal.isMission) els.editModal.isMission.checked = task.isMission || false;
    if (els.editModal.isPersistent) els.editModal.isPersistent.checked = task.isPersistent || false;
    if (els.editModal.isBadHabit) els.editModal.isBadHabit.checked = task.isBadHabit || false;

    // 重複選項：若是重複任務，顯示重複設定欄位
    const isRecCheck = document.getElementById('editIsRecurring');
    const recOptions = document.getElementById('editRecurringOptions');
    if (isRecCheck) {
        const isRecurring = task.type === 'recurring';
        isRecCheck.checked = isRecurring;
        if (recOptions) {
            recOptions.classList.toggle('hidden', !isRecurring);
            if (isRecurring && task.recurrence) {
                if (document.getElementById('editRecurrenceInterval')) document.getElementById('editRecurrenceInterval').value = task.recurrence.interval || 1;
                if (document.getElementById('editRecurrenceType')) document.getElementById('editRecurrenceType').value = task.recurrence.type || 'daily';
                const weekDaysGroup = document.getElementById('editRecurrenceWeekDays');
                if (task.recurrence.type === 'weekly' && weekDaysGroup) {
                    weekDaysGroup.classList.remove('hidden');
                    const days = task.recurrence.daysOfWeek || [];
                    document.getElementsByName('editRecurrenceDay').forEach(cb => {
                        cb.checked = days.includes(parseInt(cb.value));
                    });
                } else if (weekDaysGroup) {
                    weekDaysGroup.classList.add('hidden');
                }
            }
        }
    }

    els.editModal.el.classList.remove('hidden');
    if (els.modal.el) els.modal.el.classList.add('hidden'); // 關閉細節 Modal
}

// ─────────────────────────────────────────────
// § 4. 編輯事件監聽器設置 (setupEditListeners)
// ─────────────────────────────────────────────
/**
 * 【setupEditListeners】設定編輯 Modal 的所有事件處理
 * 包含：關閉按鈕、表單送出、重複類型切換、範圍選擇 Modal 的按鈕
 */
function setupEditListeners() {
    if (els.editModal.closeBtn) els.editModal.closeBtn.onclick = () => els.editModal.el.classList.add('hidden');
    if (els.editModal.cancelBtn) els.editModal.cancelBtn.onclick = () => els.editModal.el.classList.add('hidden');

    // 「是否為重複任務」toggle
    const editRecCheckbox = document.getElementById('editIsRecurring');
    if (editRecCheckbox) {
        editRecCheckbox.onchange = (e) => {
            const opt = document.getElementById('editRecurringOptions');
            if (opt) opt.classList.toggle('hidden', !e.target.checked);
        };
    }

    // 「重複類型」切換：每週模式才顯示星期幾選擇
    const editRecType = document.getElementById('editRecurrenceType');
    if (editRecType) {
        editRecType.onchange = (e) => {
            const daysGroup = document.getElementById('editRecurrenceWeekDays');
            if (daysGroup) daysGroup.classList.toggle('hidden', e.target.value !== 'weekly');
        };
    }

    // 表單送出
    if (els.editModal.form) {
        els.editModal.form.onsubmit = (e) => {
            e.preventDefault();
            const taskId = els.editModal.taskId.value;
            const originalDate = els.editModal.originalDate.value;
            const newDate = els.editModal.taskDate.value;
            const newName = els.editModal.name.value;
            const newTime = els.editModal.time.value;
            const newEndTime = els.editModal.endTime ? els.editModal.endTime.value : null;
            const newScore = parseFloat(els.editModal.score.value);
            const newImportance = document.getElementById('editImportance') ? document.getElementById('editImportance').value : 'medium';
            const newIsMission = els.editModal.isMission ? els.editModal.isMission.checked : false;
            const newIsPersistent = els.editModal.isPersistent ? els.editModal.isPersistent.checked : false;
            const newIsBadHabit = els.editModal.isBadHabit ? els.editModal.isBadHabit.checked : false;

            if (newEndTime && newTime && newEndTime <= newTime) return alert('結束時間必須晚於開始時間');
            if (!newName) return alert('請輸入名稱');
            if (!newDate) return alert('請輸入日期');
            if (isNaN(newScore)) return alert('請輸入分數');

            let task = state.tasks.find(t => t.id == taskId);
            const isRecSet = document.getElementById('editIsRecurring').checked;

            if (task) {
                // DO NOT mutate task directly here!
                let pendingRecurrence = null;
                if (isRecSet) {
                    const interval = parseInt(document.getElementById('editRecurrenceInterval').value) || 1;
                    const type = document.getElementById('editRecurrenceType').value;
                    pendingRecurrence = { type, interval, startDate: newDate };
                    if (type === 'weekly') {
                        pendingRecurrence.daysOfWeek = Array.from(document.getElementsByName('editRecurrenceDay'))
                            .filter(c => c.checked).map(c => parseInt(c.value));
                    }
                }

                editPendingData = {
                    name: newName, time: newTime, endTime: newEndTime, newDate: newDate,
                    score: newScore, importance: newImportance,
                    isMission: newIsMission, isPersistent: newIsPersistent, isBadHabit: newIsBadHabit,
                    isRecSet: isRecSet,
                    recurrence: pendingRecurrence
                };

                taskToEdit = task;
                editOriginalDateVal = originalDate;

                if (task.type === 'recurring') {
                    // 顯示「修改範圍」Modal（僅此次 / 此後全部）
                    els.editScopeModal.el.classList.remove('hidden');
                } else {
                    applyPendingEditsToTask(task);
                    finishEdit();
                }
            } else {
                // 如果不是一般任務，嘗試在甘特圖中尋找
                if (state.ganttSystem && state.ganttSystem.projects) {
                    for (const proj of state.ganttSystem.projects) {
                        for (const parent of proj.parents) {
                            const child = findGanttItem(parent.children, taskId);
                            if (child) {
                                child.name = newName;
                                child.score = newScore;
                                finishEdit();
                                renderWeeklySchedule();
                                return;
                            }
                        }
                    }
                }
            }
        };
    }

    // 範圍選擇 Modal 的按鈕
    if (els.editScopeModal.btnSingle) {
        els.editScopeModal.btnSingle.onclick = () => updateRecurringSingle();
    }
    if (els.editScopeModal.btnFuture) {
        els.editScopeModal.btnFuture.onclick = () => updateRecurringFuture();
    }
    if (els.editScopeModal.btnCancel) {
        els.editScopeModal.btnCancel.onclick = () => els.editScopeModal.el.classList.add('hidden');
    }
}

/**
 * 將編輯內容直接套用到目標任務上 (用於不需選擇範圍的普通任務)
 */
function applyPendingEditsToTask(targetTask) {
    targetTask.name = editPendingData.name;
    targetTask.score = editPendingData.score;
    targetTask.importance = editPendingData.importance;
    targetTask.isMission = editPendingData.isMission;
    targetTask.isPersistent = editPendingData.isPersistent;
    targetTask.isBadHabit = editPendingData.isBadHabit;
    targetTask.time = editPendingData.time;
    targetTask.endTime = editPendingData.endTime;

    if (editPendingData.isRecSet) {
        targetTask.type = 'recurring';
        targetTask.recurrence = editPendingData.recurrence;
    } else {
        if (targetTask.type === 'recurring') { targetTask.type = 'scheduled'; delete targetTask.recurrence; }
        targetTask.date = editPendingData.newDate;
    }
}

/**
 * 【updateRecurringSingle】修改「僅此次」重複任務
 * 做法：在原任務加上 exception，然後建立一個新的單次任務
 */
function updateRecurringSingle() {
    const freshTask = state.tasks.find(t => t.id === taskToEdit.id);
    if (!freshTask) return alert('Task not found');

    if (!freshTask.exceptions) freshTask.exceptions = {};
    freshTask.exceptions[editOriginalDateVal] = true; // 標記原始日期為例外（已刪除）

    // 建立一個新的單次任務，使用新的日期和屬性
    const newTask = {
        ...taskToEdit,
        id: Date.now(),
        type: 'scheduled',
        recurrence: null,
        date: editPendingData.newDate,
        name: editPendingData.name,
        time: editPendingData.time,
        endTime: editPendingData.endTime,
        score: editPendingData.score,
        importance: editPendingData.importance,
        isMission: editPendingData.isMission,
        isPersistent: editPendingData.isPersistent,
        isBadHabit: editPendingData.isBadHabit,
        exceptions: {},
        completedHistory: {},
        badHabitHistory: {},
        createdAt: editPendingData.newDate
    };

    state.tasks.push(newTask);
    els.editScopeModal.el.classList.add('hidden');
    finishEdit();
}

/**
 * 【updateRecurringFuture】修改「此後所有」重複任務
 * 做法：把舊的序列截止到修改日的前一天，然後建立一個新的重複序列
 */
function updateRecurringFuture() {
    const freshTask = state.tasks.find(t => t.id === taskToEdit.id);
    if (!freshTask) return alert('Task not found');

    // 設定舊序列的結束日期為原始日期的前一天
    const yesterday = new Date(editOriginalDateVal);
    yesterday.setDate(yesterday.getDate() - 1);
    if (freshTask.recurrence) {
        freshTask.recurrence.endDate = getLocalDateStr(yesterday);
    }

    // 建立新的重複序列，從新日期開始
    const newTask = {
        ...taskToEdit,
        id: Date.now(),
        name: editPendingData.name,
        time: editPendingData.time,
        endTime: editPendingData.endTime,
        score: editPendingData.score,
        importance: editPendingData.importance,
        isMission: editPendingData.isMission,
        isPersistent: editPendingData.isPersistent,
        isBadHabit: editPendingData.isBadHabit,
        type: editPendingData.isRecSet ? 'recurring' : 'scheduled',
        createdAt: editPendingData.newDate,
        completedHistory: {},
        badHabitHistory: {}
    };

    if (editPendingData.isRecSet) {
        newTask.recurrence = { ...editPendingData.recurrence, startDate: editPendingData.newDate, endDate: null };
        newTask.date = null;
    } else {
        newTask.recurrence = null;
        newTask.date = editPendingData.newDate;
    }

    state.tasks.push(newTask);
    els.editScopeModal.el.classList.add('hidden');
    finishEdit();
}

/**
 * 【finishEdit】編輯完成後的善後工作
 */
function finishEdit() {
    saveState();
    if (els.editModal.el) els.editModal.el.classList.add('hidden');

    const newTasks = getTasksForDate(editOriginalDateVal);
    showDetailModal(editOriginalDateVal, newTasks);
    renderCalendar(currentMonth);
    renderStartPage();

    taskToEdit = null;
    editOriginalDateVal = null;
    editPendingData = null;
}

// ─────────────────────────────────────────────
// § 5. 週行程表 (renderWeeklySchedule)
// ─────────────────────────────────────────────
/**
 * 【renderWeeklySchedule】渲染本週的時間軸行程表
 * 左邊是時間標尺（0-23時），右邊是每天的格子水平排列，
 * 有時間的任務會以「色塊」顯示在對應的格子中。
 * 同時也渲染右側的「無時間任務」側邊欄。
 */
function renderWeeklySchedule() {
    const grid = document.getElementById('weeklyScheduleGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // 計算當週的起始日期（週一）
    if (!weeklyStartDay) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // 週日算 -6
        weeklyStartDay = monday;
    }

    // 建立 7 天的日期陣列
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weeklyStartDay);
        d.setDate(weeklyStartDay.getDate() + i);
        return d;
    });

    const todayStr = getLocalDateStr();
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0~23 時

    // 每個小時高度（px）
    const HOUR_HEIGHT = 60;
    const HEADER_HEIGHT = 45;

    // ─ 表頭：星期幾 ─
    const headerRow = document.createElement('div');
    headerRow.style.cssText = `display:grid; grid-template-columns: 50px repeat(7, 1fr); position:sticky; top:0; z-index:3; background:var(--bg-secondary);`;
    headerRow.innerHTML = '<div style="border-right: 1px solid var(--border-color);"></div>';
    days.forEach(d => {
        const dStr = getLocalDateStr(d);
        const isToday = dStr === todayStr;
        const dayName = getDayName(dStr);
        const col = document.createElement('div');
        col.style.cssText = `text-align:center; padding:8px 4px; border-right:1px solid var(--border-color); font-weight:${isToday ? 'bold' : 'normal'}; color:${isToday ? 'var(--accent-blue)' : 'var(--text-primary)'}; font-size:0.8rem;`;
        col.innerHTML = `<div>${dayName}</div><div style="font-size:0.7rem; opacity:0.7;">${dStr.slice(5)}</div>`;
        headerRow.appendChild(col);
    });
    grid.appendChild(headerRow);

    // ─ 主體：時間格子 ─
    const bodyContainer = document.createElement('div');
    bodyContainer.style.cssText = `position:relative; display:grid; grid-template-columns: 50px repeat(7, 1fr);`;
    const totalHeight = 24 * HOUR_HEIGHT;
    bodyContainer.style.height = `${totalHeight}px`;

    // 左側時間標尺
    const timeCol = document.createElement('div');
    timeCol.style.cssText = `position:relative; border-right:1px solid var(--border-color);`;
    hours.forEach(h => {
        const label = document.createElement('div');
        label.style.cssText = `position:absolute; top:${h * HOUR_HEIGHT}px; right:4px; font-size:0.7rem; color:var(--text-secondary); line-height:1;`;
        label.textContent = `${String(h).padStart(2, '0')}:00`;
        timeCol.appendChild(label);
    });
    bodyContainer.appendChild(timeCol);

    // 7 天的分欄
    days.forEach(d => {
        const dStr = getLocalDateStr(d);
        const dayTasks = getTasksForDate(dStr).filter(t => t.time);
        const col = document.createElement('div');
        col.style.cssText = `position:relative; border-right:1px solid var(--border-color);`;
        col.style.height = `${totalHeight}px`;

        // 水平格線（每小時一條）
        hours.forEach(h => {
            const line = document.createElement('div');
            line.style.cssText = `position:absolute; top:${h * HOUR_HEIGHT}px; left:0; right:0; border-top:1px solid rgba(255,255,255,0.05);`;
            col.appendChild(line);
        });

        // 任務色塊（有時間的任務）
        dayTasks.forEach(task => {
            const [sh, sm] = task.time.split(':').map(Number);
            const startTop = (sh + sm / 60) * HOUR_HEIGHT;
            let height = HOUR_HEIGHT; // 預設 1 小時高度

            if (task.endTime) {
                const [eh, em] = task.endTime.split(':').map(Number);
                height = Math.max(20, ((eh + em / 60) - (sh + sm / 60)) * HOUR_HEIGHT);
            }

            const isMoving = movingTask && movingTask.task.id === task.id && movingTask.sourceDate === dStr;
            const block = document.createElement('div');
            block.style.cssText = `position:absolute; top:${startTop}px; left:2px; right:2px; height:${height}px; background:${isMoving ? 'rgba(59,130,246,0.3)' : 'var(--accent-blue)'}; border-radius:4px; overflow:hidden; cursor:pointer; z-index:1;`;

            const content = document.createElement('div');
            content.style.cssText = `padding:2px 4px; font-size:0.65rem; color:white; overflow:hidden;`;
            content.innerHTML = `<div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.name}</div><div style="font-size:0.6rem; opacity:0.8;">${task.time}${task.endTime ? '-' + task.endTime : ''}</div>`;

            // 編輯/刪除按鈕
            const controls = document.createElement('div');
            controls.className = 'grid-task-controls';
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon-grid'; editBtn.innerHTML = '✏️';
            editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(task, dStr); };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon-grid'; deleteBtn.innerHTML = '🗑️';
            deleteBtn.onclick = (e) => { e.stopPropagation(); initiateDelete(task, dStr); };
            controls.appendChild(editBtn); controls.appendChild(deleteBtn);

            block.appendChild(content);
            block.appendChild(controls);
            block.onclick = (e) => { if (movingTask) { completeMove(dStr, sh); return; } enterMoveMode(task, dStr); };
            col.appendChild(block);
        });

        // 如果在移動模式，點擊空白格子也可以放置
        if (movingTask) {
            col.onclick = (e) => {
                if (e.target !== col) return;
                const rect = col.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const targetHour = Math.floor(clickY / HOUR_HEIGHT);
                completeMove(dStr, targetHour);
            };
        }

        bodyContainer.appendChild(col);
    });

    grid.appendChild(bodyContainer);
    renderUntimedSidebar(days);
}

// ─────────────────────────────────────────────
// § 6. 無時間任務側邊欄 (renderUntimedSidebar)
// ─────────────────────────────────────────────
/**
 * 【renderUntimedSidebar】渲染「本週無時間」任務的側邊欄
 * 顯示今天的無時間任務，以及整週的無時間任務（分開顯示）
 */
function renderUntimedSidebar(weekDays) {
    const todayStr = getLocalDateStr();
    const todayList = els.dashboard.untimedTodayList;
    const weeklyList = els.dashboard.untimedWeeklyList;
    if (!todayList || !weeklyList) return;

    todayList.innerHTML = '';
    weeklyList.innerHTML = '';

    const weekStrs = weekDays.map(d => getLocalDateStr(d));

    // 一般任務（無時間設定的）
    state.tasks.forEach(task => {
        const hasTime = task.time && task.time.trim().length > 0;
        if (hasTime) return; // 有時間的跳過

        weekStrs.forEach(dStr => {
            const applies = getTasksForDate(dStr).some(t => t.id == task.id);
            if (applies) {
                const isToday = dStr === todayStr;
                const isDone = task.completedHistory && task.completedHistory[dStr];
                const item = createUntimedItemEl(task, dStr, isDone);
                if (isToday) todayList.appendChild(item);
                else weeklyList.appendChild(item);
            }
        });
    });

    // 甘特圖子任務（也是無時間）
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            proj.parents.forEach(parent => {
                parent.children.forEach(child => {
                    weekStrs.forEach(dStr => {
                        const inRange = dStr >= child.startDate && dStr <= child.endDate;
                        if (inRange) {
                            const isToday = dStr === todayStr;
                            // 建立一個「虛擬任務」物件代表甘特圖子任務
                            const pseudoTask = {
                                id: child.id,
                                name: `[${proj.name}] ${child.name}`,
                                score: child.score,
                                isGantt: true,
                                projectId: proj.id,
                                parentId: parent.id,
                                importance: child.importance || 'medium'
                            };
                            const item = createUntimedItemEl(pseudoTask, dStr, child.completed);
                            if (isToday) todayList.appendChild(item);
                            else weeklyList.appendChild(item);
                        }
                    });
                });
            });
        });
    }
}

/**
 * 【createUntimedItemEl】建立「無時間任務」的列表項目元素
 */
function createUntimedItemEl(task, dateStr, isDone) {
    const el = document.createElement('div');
    el.className = 'untimed-item' + (isDone ? ' completed' : '');
    if (movingTask && movingTask.task.id === task.id && movingTask.sourceDate === dateStr) {
        el.classList.add('moving');
    }

    const content = document.createElement('div');
    content.style.flex = '1';
    content.innerHTML = `
        <div style="font-weight:600;">${task.name}</div>
        <div style="font-size:0.6rem; opacity:0.7;">
            ${dateStr === getLocalDateStr() ? '今日' : dateStr.split('-').slice(1).join('/')} • ${task.score}分
        </div>
    `;

    const controls = document.createElement('div');
    controls.className = 'untimed-controls';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon-small'; editBtn.innerHTML = '✏️'; editBtn.title = '編輯';
    editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(task, dateStr); };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-small'; deleteBtn.innerHTML = '🗑️'; deleteBtn.title = '刪除';
    deleteBtn.onclick = (e) => { e.stopPropagation(); initiateDelete(task, dateStr); };

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    el.appendChild(content);
    el.appendChild(controls);

    el.onclick = (e) => { if (movingTask) return; enterMoveMode(task, dateStr); };
    return el;
}

// ─────────────────────────────────────────────
// § 7. 任務移動功能 (Move Mode)
// ─────────────────────────────────────────────
/**
 * 【enterMoveMode】進入「任務移動」模式
 * 進入後，使用者點擊週行程表的任意位置就可以移動任務到那個時間點。
 */
function enterMoveMode(task, sourceDate) {
    movingTask = { task, sourceDate };
    els.dashboard.moveHint.classList.remove('hidden');
    renderWeeklySchedule();
}

/** 【cancelMove】取消移動模式 */
function cancelMove() {
    movingTask = null;
    els.dashboard.moveHint.classList.add('hidden');
    renderWeeklySchedule();
}

/**
 * 【completeMove】完成任務移動到目標日期和時間
 * 根據任務類型做不同的處理（單次/重複/甘特圖）
 */
function completeMove(targetDate, targetHour) {
    if (!movingTask) return;
    const task = movingTask.task;
    const sourceDate = movingTask.sourceDate;
    const newTime = `${String(targetHour).padStart(2, '0')}:00`;

    // 保留原本的時間長度
    let newEndTime = null;
    if (task.endTime && task.time) {
        const [sh, sm] = task.time.split(':').map(Number);
        const [eh, em] = task.endTime.split(':').map(Number);
        const durationH = (eh + em / 60) - (sh + sm / 60);
        let endTotal = Math.min(23.99, targetHour + durationH);
        const endH = Math.floor(endTotal);
        const endM = Math.round((endTotal - endH) * 60);
        newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    if (task.isGantt) {
        // 甘特圖任務：轉換成一般單次任務
        const newTask = {
            id: Date.now(), name: task.name.split('] ')[1] || task.name, type: 'scheduled',
            date: targetDate, time: newTime, importance: task.importance, score: task.score,
            createdAt: new Date().toISOString()
        };
        if (newEndTime) newTask.endTime = newEndTime;
        state.tasks.push(newTask);
    } else if (task.type === 'scheduled') {
        task.date = targetDate;
        task.time = newTime;
        if (newEndTime) task.endTime = newEndTime;
    } else if (task.type === 'recurring') {
        if (confirm('這是一個重複項目。要修改整體的時間和開始日期嗎？(取消則不移動)')) {
            task.recurrence.startDate = targetDate;
            task.time = newTime;
            if (newEndTime) task.endTime = newEndTime;
        } else { cancelMove(); return; }
    }

    movingTask = null;
    els.dashboard.moveHint.classList.add('hidden');
    saveState();
    renderWeeklySchedule();
    renderStartPage();
}
