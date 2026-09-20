// 模組 06: 月曆與週行程系統 (Calendar & Weekly Schedule System)

function renderWeeklySchedule() {
    const grid = els.dashboard.weeklyGrid;
    if (!grid) return;
    grid.innerHTML = '';

    const days = [];
    const mon = new Date(weeklyStartDay);
    for (let i = 0; i < 7; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        days.push(d);
    }

    // Title
    const end = new Date(days[6]);
    els.dashboard.weeklyTitle.textContent = `${days[MonDay(days[0])].getMonth() + 1}/${days[0].getDate()} - ${end.getMonth() + 1}/${end.getDate()} 行程`;

    function MonDay(d) { return 0; } // Helper for index

    // 1. Header Row
    const timeRef = document.createElement('div');
    timeRef.className = 'weekly-header-cell';
    timeRef.textContent = '時間';
    grid.appendChild(timeRef);

    const todayStr = getLocalDateStr();
    days.forEach(d => {
        const dStr = getLocalDateStr(d);
        const cell = document.createElement('div');
        cell.className = 'weekly-header-cell' + (dStr === todayStr ? ' today' : '');
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        cell.innerHTML = `<div>${dayNames[d.getDay()]}</div><div style="font-size:0.6rem;">${d.getMonth() + 1}/${d.getDate()}</div>`;
        grid.appendChild(cell);
    });

    // 2. Time Rows (0-23)
    for (let h = 0; h < 24; h++) {
        // Time Label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'weekly-time-label';
        timeLabel.textContent = `${String(h).padStart(2, '0')}:00`;
        grid.appendChild(timeLabel);

        // Day Cells
        days.forEach(d => {
            const dStr = getLocalDateStr(d);
            const cell = document.createElement('div');
            cell.className = 'weekly-hour-cell';
            if (movingTask) {
                cell.classList.add('move-target');
                cell.onclick = () => completeMove(dStr, h);
            }
            grid.appendChild(cell);
        });
    }

    // 3. Render Tasks
    days.forEach((d, dayIdx) => {
        const dStr = getLocalDateStr(d);
        const tasks = getTasksForDate(dStr);

        tasks.forEach(task => {
            if (!task.time) return; // Only show timed tasks in grid

            // Normalize time string (replace full-width colon, trim)
            const timeStr = task.time.replace('：', ':').trim();
            const [h, m] = timeStr.split(':').map(Number);

            if (isNaN(h) || isNaN(m)) {
                console.error("Invalid time format for task:", task.name, task.time);
                return;
            }

            let startH = h + m / 60;
            let duration = 0.5; // Default 30 mins

            if (task.endTime) {
                const endTimeStr = task.endTime.replace('：', ':').trim();
                const [eh, em] = endTimeStr.split(':').map(Number);
                if (!isNaN(eh) && !isNaN(em)) {
                    duration = (eh + em / 60) - startH;
                }
                if (duration < 0.5) duration = 0.5;
            }

            const isDone = task.completedHistory && task.completedHistory[dStr];

            const block = document.createElement('div');
            block.className = 'weekly-task-block' + (isDone ? ' completed' : '');
            if (movingTask && movingTask.task.id === task.id && movingTask.sourceDate === dStr) {
                block.classList.add('moving');
            }

            // Position: 1 row = 50px. Header = 40px. 
            // Col offset: starts from col 2 (index 1). Each day is 1fr.
            // Row offset: each hour is 50px.
            block.style.top = `${40 + startH * 50}px`;
            block.style.height = `${duration * 50}px`;
            block.style.left = `calc(50px + ${dayIdx} * (100% - 50px) / 7 + 4px)`;
            block.style.width = `calc((100% - 50px) / 7 - 8px)`;

            // Content Layout: Flex row for Name + Controls
            block.style.display = 'flex';
            block.style.flexDirection = 'column';

            // Name & Time (Clickable for move)
            const content = document.createElement('div');
            content.style.flex = '1';
            content.style.overflow = 'hidden';
            content.innerHTML = `
                <div style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.name}</div>
                <div style="font-size:0.6rem; opacity:0.8;">${task.time}${task.endTime ? '-' + task.endTime : ''}</div>
            `;

            // Controls (Top-right absolute or flex bottom? Absolute is safer for small blocks)
            const controls = document.createElement('div');
            controls.className = 'grid-task-controls'; // Style this in CSS

            const editBtn = document.createElement('button');
            editBtn.className = 'btn-icon-grid';
            editBtn.innerHTML = '✏️';
            editBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent move mode
                openEditModal(task, dStr);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon-grid';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent move mode
                initiateDelete(task, dStr);
            };

            controls.appendChild(editBtn);
            controls.appendChild(deleteBtn);

            block.appendChild(content);
            block.appendChild(controls);

            block.onclick = (e) => {
                // e.stopPropagation(); // Handled by buttons
                if (movingTask) return;
                enterMoveMode(task, dStr);
            };

            grid.appendChild(block);
        });
    });

    renderUntimedSidebar(days);
}

function renderUntimedSidebar(weekDays) {
    const todayStr = getLocalDateStr();
    const todayList = els.dashboard.untimedTodayList;
    const weeklyList = els.dashboard.untimedWeeklyList;
    if (!todayList || !weeklyList) {
        console.error("Untimed Data Lists not found!");
        return;
    }

    console.log("Rendering Untimed Sidebar for week:", weekDays[0].toLocaleDateString());

    todayList.innerHTML = '';
    weeklyList.innerHTML = '';

    const weekStrs = weekDays.map(d => getLocalDateStr(d));

    // 1. Regular Untimed Tasks
    state.tasks.forEach(task => {
        // Check if task has a valid time set (non-empty string)
        // Check if task has a valid time set (non-empty string)
        const hasTime = task.time && task.time.trim().length > 0;

        if (hasTime) {
            // console.log("Skipping timed task:", task.name, task.time);
            return;
        }

        // console.log("Processing untimed task:", task.name);

        // Check each day of the week if this task applies
        weekStrs.forEach(dStr => {
            const applies = getTasksForDate(dStr).some(t => t.id == task.id);
            if (applies) {
                console.log("Render untimed:", task.name, "for", dStr);
                const isToday = dStr === todayStr;
                const isDone = task.completedHistory && task.completedHistory[dStr];
                const item = createUntimedItemEl(task, dStr, isDone);
                if (isToday) todayList.appendChild(item);
                else weeklyList.appendChild(item);
            }
        });
    });

    // 2. Gantt Child Tasks (Untimed)
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            proj.parents.forEach(parent => {
                parent.children.forEach(child => {
                    // Gantt child tasks usually have startDate/endDate but no specific time
                    // Check if child overlaps with this week
                    weekStrs.forEach(dStr => {
                        const inRange = dStr >= child.startDate && dStr <= child.endDate;
                        if (inRange) {
                            const isToday = dStr === todayStr;
                            // Check if already in regular tasks (to avoid duplicates if we link them)
                            // For Me Inc, Gantt items are distinct from regular tasks unless explicitly linked.
                            // The user asked to show Gantt child items too.
                            const isDone = child.completed; // Simplification: Gantt child tasks have a 'completed' flag

                            // Create a pseudo-task object for the sidebar
                            const pseudoTask = {
                                id: child.id,
                                name: `[${proj.name}] ${child.name}`,
                                score: child.score,
                                isGantt: true,
                                projectId: proj.id,
                                parentId: parent.id,
                                importance: child.importance || 'medium'
                            };

                            const item = createUntimedItemEl(pseudoTask, dStr, isDone);
                            if (isToday) todayList.appendChild(item);
                            else weeklyList.appendChild(item);
                        }
                    });
                });
            });
        });
    }
}

function createUntimedItemEl(task, dateStr, isDone) {
    const el = document.createElement('div');
    el.className = 'untimed-item' + (isDone ? ' completed' : '');
    if (movingTask && movingTask.task.id === task.id && movingTask.sourceDate === dateStr) {
        el.classList.add('moving');
    }

    // Content Container (clickable for move)
    const content = document.createElement('div');
    content.style.flex = '1';
    content.innerHTML = `
        <div style="font-weight:600;">${task.name}</div>
        <div style="font-size:0.6rem; opacity:0.7;">
            ${dateStr === getLocalDateStr() ? '今日' : dateStr.split('-').slice(1).join('/')} • ${task.score}分
        </div>
    `;

    // Edit/Delete Controls
    const controls = document.createElement('div');
    controls.className = 'untimed-controls';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon-small';
    editBtn.innerHTML = '✏️';
    editBtn.title = '編輯';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        // If it's a Gantt task, we might need special handling, but openEditModal checks standard properties.
        // We will adapt standard Edit Modal to handle Gantt tasks logic in submit.
        openEditModal(task, dateStr);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-small';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = '刪除';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        initiateDelete(task, dateStr);
    };

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);

    el.appendChild(content);
    el.appendChild(controls);

    // Main Item Click -> Move Mode
    el.onclick = (e) => {
        // e.stopPropagation(); // Handled by buttons
        if (movingTask) return;
        enterMoveMode(task, dateStr);
    };

    return el;
}

function enterMoveMode(task, sourceDate) {
    movingTask = { task, sourceDate };
    els.dashboard.moveHint.classList.remove('hidden');
    renderWeeklySchedule();
}

function cancelMove() {
    movingTask = null;
    els.dashboard.moveHint.classList.add('hidden');
    renderWeeklySchedule();
}

function completeMove(targetDate, targetHour) {
    if (!movingTask) return;
    const task = movingTask.task;
    const sourceDate = movingTask.sourceDate;

    // Determine new time
    const newTime = `${String(targetHour).padStart(2, '0')}:00`;

    // Duration preservation
    let newEndTime = null;
    if (task.endTime && task.time) {
        const [sh, sm] = task.time.split(':').map(Number);
        const [eh, em] = task.endTime.split(':').map(Number);
        const durationH = (eh + em / 60) - (sh + sm / 60);

        let endTotal = targetHour + durationH;
        if (endTotal > 23.99) endTotal = 23.99;
        const endH = Math.floor(endTotal);
        const endM = Math.round((endTotal - endH) * 60);
        newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    if (task.isGantt) {
        // Convert Gantt child task to a regular scheduled task when moved to schedule
        const newTask = {
            id: Date.now(),
            name: task.name.split('] ')[1] || task.name,
            type: 'scheduled',
            date: targetDate,
            time: newTime,
            importance: task.importance,
            score: task.score,
            createdAt: new Date().toISOString()
        };
        if (newEndTime) newTask.endTime = newEndTime;
        state.tasks.push(newTask);

        // Mark Gantt child as handled or completed? 
        // For now, just adding it to the schedule as a copy.
    } else if (task.type === 'scheduled') {
        task.date = targetDate;
        task.time = newTime;
        if (newEndTime) task.endTime = newEndTime;
    } else if (task.type === 'recurring') {
        if (confirm('這是一個重複項目。要修改此項目的整體時間與開始日期，還是僅此一次？(取消則不移動)')) {
            task.recurrence.startDate = targetDate;
            task.time = newTime;
            if (newEndTime) task.endTime = newEndTime;
        } else {
            cancelMove();
            return;
        }
    }

    movingTask = null;
    els.dashboard.moveHint.classList.add('hidden');
    saveState();
    renderWeeklySchedule();
    renderStartPage();
}

function renderCalendar(date) {
    if (!els.calendar.grid) return;

    const year = date.getFullYear();
    const month = date.getMonth();

    if (els.calendar.label) els.calendar.label.textContent = date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
    els.calendar.grid.innerHTML = '';

    // Headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const d = document.createElement('div');
        d.className = 'calendar-day-header';
        d.textContent = day;
        els.calendar.grid.appendChild(d);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day empty';
        els.calendar.grid.appendChild(cell);
    }

    const todayStr = getLocalDateStr();

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Set data-date attribute
        cell.dataset.date = dateStr;

        // Check for today
        if (dateStr === todayStr) {
            cell.classList.add('today');
        }

        cell.innerHTML = `<span class="day-number">${i}</span>`;

        // Tasks Preview
        const tasks = getTasksForDate(dateStr);
        if (tasks.length > 0) {
            const hasImportant = tasks.some(t => ['critical', 'high'].includes(t.importance));
            // Indicator Dot (Keep it, or replace? Keeping it for quick status)
            if (hasImportant) {
                const dot = document.createElement('div');
                dot.className = 'day-indicator has-important';
                cell.appendChild(dot);
            } else {
                const dot = document.createElement('div');
                dot.className = 'day-indicator';
                cell.appendChild(dot);
            }

            // Preview List
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

            if (tasks.length > previewLimit) {
                const more = document.createElement('div');
                more.className = 'calendar-task-preview';
                more.style.fontStyle = 'italic';
                more.textContent = `+${tasks.length - previewLimit} more`;
                cell.appendChild(more);
            }
        }

        cell.onclick = () => showDetailModal(dateStr, tasks);

        els.calendar.grid.appendChild(cell);
    }
}

