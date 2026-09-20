// 模組 02: 任務管理系統 (Task Management System)

function renderStartPage() {
    const todayStr = getLocalDateStr();
    const todaysTasks = getTasksForDate(todayStr); // Fix: Define this!

    // Price
    if (els.dashboard.price) {
        els.dashboard.price.textContent = state.stockPrice.toFixed(2);

        // --- NEW: Developer/Admin Manual Price Override ---
        els.dashboard.price.ondblclick = () => {
            const newPrice = prompt("【手動修正分數】請輸入您要強制修改的今日股價：", state.stockPrice);
            if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
                state.stockPrice = parseFloat(newPrice);
                const todayStr = getLocalDateStr();
                const historyIndex = state.history.findIndex(h => h.date === todayStr);
                if (historyIndex >= 0) {
                    state.history[historyIndex].price = state.stockPrice;
                } else {
                    state.history.push({ date: todayStr, price: state.stockPrice });
                }
                saveState("ManualPriceEdit");
                renderStartPage();
                alert(`股價已強制修改為 ${state.stockPrice}，並將同步至雲端。`);
            }
        };
    }
    if (state.history.length > 0 && els.dashboard.change) {
        const last = state.history[state.history.length - 1];
        const diff = state.stockPrice - last.price;
        const percent = last.price !== 0 ? (diff / last.price) * 100 : 0;
        els.dashboard.change.textContent = `${diff >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
        els.dashboard.change.className = `price-change ${diff >= 0 ? 'price-up' : 'price-down'}`;
    }

    renderCharts(todaysTasks); // Pass todays tasks for Gantt

    const timeSort = (a, b) => {
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
    };

    // Filter Logic:
    // Ranged Tasks -> Gantt Chart (Not in List)
    // Point Tasks (No end time) -> List

    // 1. Daily Routine (Recurring Today)
    let dailyRoutineTasks = todaysTasks.filter(t => t.type === 'recurring' && !t.isBadHabit);
    // Recurring tasks ALWAYS show in the daily list for now to ensure visibility
    dailyRoutineTasks.sort(timeSort);

    if (els.dashboard.dailyList) {
        els.dashboard.dailyList.innerHTML = '';
        if (dailyRoutineTasks.length === 0) {
            els.dashboard.dailyList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:10px;">今日無例行項目</div>';
        } else {
            dailyRoutineTasks.forEach(task => els.dashboard.dailyList.appendChild(createTaskEl(task, todayStr, false)));
        }
    }

    // 2. All Schedule (All Today)
    let allPointTasks = todaysTasks.filter(t => !t.isBadHabit);
    // We show all tasks in the list for now to ensure nothing is "hidden" unexpectedly
    // Users can use the Time Table for visual layout, but list should be comprehensive.

    // --- NEW: Combine with Gantt Tasks for Today ---
    const ganttTasks = getGanttTasksForDate(todayStr, true);
    const combinedTasks = [...allPointTasks, ...ganttTasks];

    combinedTasks.sort(timeSort);

    if (els.dashboard.allList) {
        els.dashboard.allList.innerHTML = '';
        if (combinedTasks.length === 0) {
            els.dashboard.allList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:10px;">今日無排程項目</div>';
        } else {
            combinedTasks.forEach(task => els.dashboard.allList.appendChild(createTaskEl(task, todayStr, false)));
        }
    }

    // 3. Important (Critical Global)
    let criticalTasks = state.tasks.filter(t => {
        if (t.isBadHabit) return false;
        if (t.importance !== 'critical') return false;

        // Exclude Ranged tasks from Important List
        if (t.time && t.endTime) return false;

        // Hide scheduled tasks from past dates (but KEEP missions, persistent, and bad habits)
        if (t.type === 'scheduled' && !t.isMission && !t.isPersistent && !t.isBadHabit && t.date < todayStr) return false;

        // Hide missions completed before today
        if (t.isMission) {
            const completedDates = t.completedHistory ? Object.keys(t.completedHistory).filter(d => t.completedHistory[d]) : [];
            const firstCompletionDate = completedDates.length > 0 ? completedDates.sort()[0] : null;
            if (firstCompletionDate && firstCompletionDate < todayStr) return false;
        }

        return true;
    });

    criticalTasks.sort((a, b) => {
        const dateA = (a.type === 'recurring' || a.isPersistent || a.isMission || a.isBadHabit) ? todayStr : (a.date || '9999-99-99');
        const dateB = (b.type === 'recurring' || b.isPersistent || b.isMission || b.isBadHabit) ? todayStr : (b.date || '9999-99-99');
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return timeSort(a, b);
    });

    if (els.dashboard.importantList) {
        els.dashboard.importantList.innerHTML = '';
        criticalTasks.forEach(task => {
            const targetDate = (task.type === 'recurring' || task.isPersistent || task.isMission || task.isBadHabit) ? todayStr : task.date;
            els.dashboard.importantList.appendChild(createTaskEl(task, targetDate, true));
        });
    }

    // 4. Bad Habits
    let badHabitTasks = state.tasks.filter(t => t.isBadHabit);
    badHabitTasks.sort((a, b) => {
        return timeSort(a, b);
    });

    if (els.dashboard.badHabitList) {
        els.dashboard.badHabitList.innerHTML = '';
        if (badHabitTasks.length === 0) {
            els.dashboard.badHabitList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:10px;">無壞習慣選項</div>';
        } else {
            badHabitTasks.forEach(task => els.dashboard.badHabitList.appendChild(createTaskEl(task, todayStr, true)));
        }
    }

    // --- NEW: Daily Progress Bar Logic ---
    const progressContainer = document.getElementById('dailyProgressContainer');
    if (progressContainer) {
        // Filter: Include Mission, No Bad Habit, No Irregular (Persistent), No negative scores
        const validTodayTasks = combinedTasks.filter(t =>
            !t.isBadHabit &&
            !t.isPersistent && // Exclude "Irregular" tasks
            t.score >= 0 // Assuming deduction items have negative score
        );

        const totalCount = validTodayTasks.length;
        const completedCount = validTodayTasks.filter(t => {
            if (t.isGantt) return t.completed;
            return t.completedHistory && t.completedHistory[todayStr];
        }).length;

        const dailyProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        const pColor = getProgressColor(dailyProgress);

        progressContainer.innerHTML = `
            <div class="daily-progress-card">
                <div class="daily-progress-header">
                    <span>今日任務進度</span>
                    <span>${Math.round(dailyProgress)}% (${completedCount}/${totalCount})</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${dailyProgress}%; background: ${pColor};"></div>
                </div>
            </div>
        `;
    }
}

function getTasksForDate(dateStr) {
    if (!state.tasks) return [];
    
    return state.tasks.reduce((acc, task) => {
        // Prepare a copy with overrides for THIS specific date
        let effectiveTask = { ...task };
        let isInstanceIncluded = false;

        // FORCE INCLUSION IF HISTORY EXISTS FOR THIS DATE
        if (task.completedHistory && task.completedHistory[dateStr]) isInstanceIncluded = true;
        if (task.penaltyHistory && task.penaltyHistory[dateStr]) isInstanceIncluded = true;
        if (task.badHabitHistory && task.badHabitHistory[dateStr] !== undefined) isInstanceIncluded = true;
        if (task.persistentHistory && task.persistentHistory[dateStr] !== undefined) isInstanceIncluded = true;

        // Check for specific date override/exception
        if (task.exceptions && task.exceptions[dateStr]) {
            const ex = task.exceptions[dateStr];
            if (ex === true) {
                // Task is explicitly deleted/hidden for today
                return acc;
            } else if (typeof ex === 'object') {
                // Apply overrides (name, time, score, etc.)
                Object.assign(effectiveTask, ex);
                isInstanceIncluded = true; // Overridden instance is always included
            }
        }

        // If not explicitly included via override, check standard recurrence
        if (!isInstanceIncluded) {
            const taskStartDate = task.date || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
            if (dateStr < taskStartDate) return acc;

            const checkRecurrence = (taskObj, dStr) => {
                const interval = taskObj.recurrence.interval || 1;
                const startStr = taskObj.recurrence.startDate || (taskObj.createdAt ? taskObj.createdAt.split('T')[0] : '1970-01-01');
                const endStr = taskObj.recurrence.endDate;
                if (dStr < startStr || (endStr && dStr > endStr)) return false;
                
                const startDate = new Date(startStr);
                const targetDate = new Date(dStr);
                const diffTime = targetDate - startDate;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                const rType = taskObj.recurrence.type;

                if (rType === 'daily') {
                    return diffDays % interval === 0;
                } else if (rType === 'weekly') {
                    if (taskObj.recurrence.daysOfWeek && taskObj.recurrence.daysOfWeek.length > 0) {
                        if (taskObj.recurrence.daysOfWeek.includes(targetDate.getDay())) {
                            const weeksPassed = Math.floor(diffDays / 7);
                            return weeksPassed % interval === 0;
                        }
                        return false;
                    } else {
                        return diffDays % (7 * interval) === 0;
                    }
                } else if (rType === 'monthly') {
                    if (targetDate.getDate() === startDate.getDate()) {
                        const monthDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
                        return monthDiff % interval === 0;
                    }
                    return false;
                }
                return false;
            };

            const hasCompletionBefore = (taskObj, targetDateStr, sinceDateStr) => {
                if (!taskObj.completedHistory) return false;
                const completedDates = Object.keys(taskObj.completedHistory).filter(d => taskObj.completedHistory[d]);
                for (const d of completedDates) {
                    if (d >= sinceDateStr && d < targetDateStr) return true;
                }
                return false;
            };

            let isNormalInstance = false;
            if (task.type === 'scheduled') {
                if (task.date === dateStr) isNormalInstance = true;
            } else if (task.type === 'recurring') {
                isNormalInstance = checkRecurrence(task, dateStr);
            }

            if (isNormalInstance) {
                isInstanceIncluded = true;
            } else {
                if (task.isPersistent) {
                    isInstanceIncluded = true;
                } else if (task.isBadHabit) {
                    if (!(task.completedHistory && task.completedHistory[dateStr])) {
                        isInstanceIncluded = true;
                    }
                } else if (task.isMission) {
                    if (task.type === 'scheduled') {
                        if (dateStr > task.date) {
                            if (!hasCompletionBefore(task, dateStr, task.date)) {
                                isInstanceIncluded = true;
                            }
                        }
                    } else if (task.type === 'recurring') {
                        const startStr = task.recurrence.startDate || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
                        if (dateStr > startStr) {
                             let pastD = null;
                             const d = new Date(dateStr);
                             for (let i = 1; i <= 365; i++) {
                                 d.setDate(d.getDate() - 1);
                                 const testStr = getLocalDateStr(d);
                                 if (testStr < startStr) break;
                                 if (checkRecurrence(task, testStr)) {
                                     pastD = testStr;
                                     break;
                                 }
                             }
                             if (pastD) {
                                 const taskCreatedDateStr = task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01';
                                 if (pastD >= taskCreatedDateStr && !hasCompletionBefore(task, dateStr, pastD)) {
                                     isInstanceIncluded = true;
                                 }
                             }
                        }
                    }
                }
            }
        }

        if (isInstanceIncluded) {
            acc.push(effectiveTask);
        }
        return acc;
    }, []);
}

function getGanttTasksForDate(dateStr, includeCompleted = false) {
    if (!state.ganttSystem || !state.ganttSystem.projects) return [];
    const tasks = [];

    const collectRecursive = (item, projId, parentId) => {
        // If has children, recurse (don't add this item)
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => collectRecursive(child, projId, item.id));
        } else {
            // Leaf node (Lowest level). Check criteria.
            const matchesDate = dateStr >= item.startDate && dateStr <= item.endDate;
            const matchesCompletion = includeCompleted || !item.completed;
            if (matchesDate && matchesCompletion) {
                let itemTime = item.time || null;
                let itemEndTime = item.endTime || null;
                if (item.exceptions && item.exceptions[dateStr]) {
                    if (item.exceptions[dateStr].time !== undefined) itemTime = item.exceptions[dateStr].time;
                    if (item.exceptions[dateStr].endTime !== undefined) itemEndTime = item.exceptions[dateStr].endTime;
                }
                tasks.push({
                    id: item.id,
                    name: item.name, // Lowest level name
                    score: item.score,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    isGantt: true,
                    type: 'gantt-leaf',
                    projId: projId,
                    parentId: parentId, // Direct parent ID (null if top-level)
                    importance: item.importance || 'medium',
                    completed: item.completed,
                    time: itemTime,
                    endTime: itemEndTime,
                    exceptions: item.exceptions || null
                });
            }
        }
    };

    state.ganttSystem.projects.forEach(proj => {
        proj.parents.forEach(parent => {
            // Start recursion from top-level parents
            collectRecursive(parent, proj.id, null);
        });
    });
    return tasks;
}

function getNextOccurrenceDate(task, fromDateStr) {
    if (!task.recurrence) return null;
    
    const isMatchingDate = (dStr) => {
        const interval = task.recurrence.interval || 1;
        const startStr = task.recurrence.startDate || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
        const endStr = task.recurrence.endDate;
        if (dStr < startStr || (endStr && dStr > endStr)) return false;
        
        const startDate = new Date(startStr);
        const targetDate = new Date(dStr);
        const diffTime = targetDate - startDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const rType = task.recurrence.type;

        if (rType === 'daily') {
            return diffDays % interval === 0;
        } else if (rType === 'weekly') {
            if (task.recurrence.daysOfWeek && task.recurrence.daysOfWeek.length > 0) {
                if (task.recurrence.daysOfWeek.includes(targetDate.getDay())) {
                    const weeksPassed = Math.floor(diffDays / 7);
                    return weeksPassed % interval === 0;
                }
                return false;
            } else {
                return diffDays % (7 * interval) === 0;
            }
        } else if (rType === 'monthly') {
            if (targetDate.getDate() === startDate.getDate()) {
                const monthDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
                return monthDiff % interval === 0;
            }
            return false;
        }
        return false;
    };
    
    let current = new Date(fromDateStr);
    for (let i = 1; i <= 366; i++) {
        current.setDate(current.getDate() + 1);
        const year = current.getFullYear();
        const month = (current.getMonth() + 1).toString().padStart(2, '0');
        const day = current.getDate().toString().padStart(2, '0');
        const checkStr = `${year}-${month}-${day}`;
        if (isMatchingDate(checkStr)) {
            return checkStr;
        }
    }
    return null;
}

function getRecurrenceDescription(task, dateStr) {
    if (task.type !== 'recurring' || !task.recurrence) return '';
    
    const startStr = task.recurrence.startDate || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
    const startParts = startStr.split('-');
    const formattedStart = startParts.length === 3 ? `${parseInt(startParts[1], 10)}/${parseInt(startParts[2], 10)}` : '';
    
    const interval = task.recurrence.interval || 1;
    let typeLabel = '';
    if (task.recurrence.type === 'daily') typeLabel = '天';
    else if (task.recurrence.type === 'weekly') typeLabel = '週';
    else if (task.recurrence.type === 'monthly') typeLabel = '月';
    const frequency = `每 ${interval} ${typeLabel}`;
    
    const nextDateStr = getNextOccurrenceDate(task, dateStr);
    let nextLabel = '';
    if (nextDateStr) {
        const nextParts = nextDateStr.split('-');
        nextLabel = ` | 下次: ${parseInt(nextParts[1], 10)}/${parseInt(nextParts[2], 10)}`;
    }
    
    return `${formattedStart} | ${frequency}${nextLabel}`;
}

function createTaskEl(task, dateStr, showDateLabel) {
    const el = document.createElement('div');
    el.className = 'task-item';

    // Note: task is already pre-overridden by getTasksForDate in this app version
    const isCompleted = task.isGantt ? task.completed : (task.completedHistory && task.completedHistory[dateStr]);
    if (isCompleted) el.classList.add('completed');


    let timeLabel = '';
    if (task.time) {
        timeLabel = task.time;
        if (task.endTime) {
            timeLabel += ` - ${task.endTime}`;
        }
    }
    const timeDisplay = timeLabel ? `<span style="margin-right:4px; color:var(--text-secondary); font-size:0.8rem;">⏰ ${timeLabel}</span>` : '';

    let dateDisplay = '';
    if (showDateLabel) {
        if (task.type === 'recurring') {
            dateDisplay = `<span style="margin-right:4px; color:var(--accent-blue); font-size:0.7rem; border:1px solid var(--accent-blue); padding:1px 3px; border-radius:3px;">重複</span>`;
        } else if (task.date) {
            const d = new Date(task.date);
            const mmdd = `${d.getMonth() + 1}/${d.getDate()}`;
            dateDisplay = `<span style="margin-right:4px; color:var(--text-secondary); font-size:0.8rem;">${mmdd}</span>`;
        }
    }

    const recDesc = getRecurrenceDescription(task, dateStr);
    const recDisplay = recDesc ? `<span>• ${recDesc}</span>` : '';

    let badHabitCountDisplay = '';
    if (task.isBadHabit) {
        const count = task.badHabitCount && task.badHabitCount[dateStr] ? task.badHabitCount[dateStr] : 0;
        if (count > 0) {
            badHabitCountDisplay = `<span style="margin-left:8px; color:var(--accent-red); font-size:0.8rem; font-weight:bold;">(今日: ${count}次)</span>`;
        }
    }

    el.innerHTML = `
        <div class="task-check-wrapper" onclick="toggleTask(${task.id}, '${dateStr}', !${!!isCompleted}, event)">
            <div class="task-checkbox">
                ${isCompleted ? '✓' : ''}
            </div>
        </div>
        <div class="task-info">
            <span class="task-name" style="${isCompleted && !task.isPersistent ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                ${dateDisplay}${timeDisplay} ${task.name} ${badHabitCountDisplay}
            </span>
            <div class="task-meta">
                <span class="task-score ${task.score >= 0 ? 'positive' : 'negative'}">
                    ${task.score >= 0 ? '+' : ''}${task.score} 分
                </span>
                <span>• ${mapImportance(task.importance)}</span>
                ${recDisplay}
            </div>
        </div>
        <div class="task-actions">
            <button class="btn-icon btn-edit-task">✏️</button>
            <button class="btn-icon btn-delete-task">🗑️</button>
        </div>
    `;

    const editBtn = el.querySelector('.btn-edit-task');
    if (editBtn) editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(task, dateStr); };
    
    const deleteBtn = el.querySelector('.btn-delete-task');
    if (deleteBtn) deleteBtn.onclick = (e) => { e.stopPropagation(); initiateDelete(task, dateStr); };

    if (task.isGantt) {
        const nameEl = el.querySelector('.task-name');
        if (nameEl) {
            nameEl.innerHTML += ` <span style="font-size:0.7rem; color:var(--accent-blue);">(企劃)</span>`;
        }
    }
    return el;
}

// ============================================================
// 【核心】切換任務完成狀態
// ============================================================
// 處理三種任務類型：持續性任務、壞習慣、一般任務
// 所有分數變動都會透過 logAction() 統一記錄
function toggleTask(taskId, dateStr, isChecked, event) {
    if (event) event.stopPropagation();
    const task = state.tasks.find(t => t.id == taskId);

    // 【修復】如果在主任務列表找不到，嘗試從甘特圖尋找並委派給 toggleGanttItem
    if (!task) {
        if (state.ganttSystem && state.ganttSystem.projects) {
            for (const proj of state.ganttSystem.projects) {
                const foundItem = findGanttItem(proj.parents, taskId);
                if (foundItem) {
                    // 找到父項目 ID
                    let parentId = null;
                    for (const p of proj.parents) {
                        if (p.id == taskId || (p.children && p.children.some(c => c.id == taskId))) {
                            parentId = p.id;
                            break;
                        }
                    }
                    toggleGanttItem(proj.id, parentId, taskId, isChecked);
                    return;
                }
            }
        }
        return;
    }

    if (!task.completedHistory) task.completedHistory = {};
    const todayStr = getLocalDateStr();

    // ============================
    // 分支 A：持續性任務（可重複加分）
    // ============================
    if (task.isPersistent) {
        if (!task.persistentHistory) task.persistentHistory = {};
        if (!task.persistentCount) task.persistentCount = {};

        if (isChecked) {
            state.stockPrice += task.score;
            // 累加紀錄
            task.persistentHistory[dateStr] = (task.persistentHistory[dateStr] || 0) + task.score;
            task.persistentCount[dateStr] = (task.persistentCount[dateStr] || 0) + 1;
            task.completedHistory[dateStr] = true;

            logAction({
                actionDate: todayStr,
                taskId: task.id,
                taskName: task.name,
                type: 'persistent',
                source: 'daily',
                score: task.score,
                scheduledDate: dateStr,
                details: `持續性任務加分 (第 ${task.persistentCount[dateStr]} 次)`
            });
        } else {
            // 取消：扣回一次的分數
            if (task.persistentHistory && task.persistentHistory[dateStr] > 0) {
                state.stockPrice -= task.score;
                task.persistentHistory[dateStr] -= task.score;
                task.persistentCount[dateStr] = Math.max(0, (task.persistentCount[dateStr] || 1) - 1);
                if (task.persistentCount[dateStr] <= 0) {
                    delete task.persistentHistory[dateStr];
                    delete task.persistentCount[dateStr];
                    task.completedHistory[dateStr] = false;
                }

                logAction({
                    actionDate: todayStr,
                    taskId: task.id,
                    taskName: task.name,
                    type: 'undo',
                    source: 'daily',
                    score: -task.score,
                    scheduledDate: dateStr,
                    details: `取消持續性任務加分`
                });
            }
        }

    // ============================
    // 分支 B：壞習慣（漸進式扣分）
    // ============================
    } else if (task.isBadHabit) {
        if (!task.badHabitHistory) task.badHabitHistory = {};
        if (!task.badHabitCount) task.badHabitCount = {};

        if (isChecked) {
            // 執行壞習慣 -> 扣分
            let penalty = Math.abs(task.score); // 基本扣分

            // 連續天加重處罰邏輯
            const historyDates = Object.keys(task.badHabitHistory).filter(d => d !== dateStr).sort();
            if (historyDates.length > 0) {
                const lastDate = historyDates[historyDates.length - 1];
                const lastPenalty = task.badHabitHistory[lastDate];
                const yesterday = new Date(dateStr);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = getLocalDateStr(yesterday);

                if (lastDate === yesterdayStr) {
                    // 連續天：扣分加重 1.5 倍
                    penalty = Math.round(lastPenalty * 1.5);
                }
            }

            state.stockPrice -= penalty;

            // 【修復】累加而非覆寫，避免多次點擊後只能退款最後一次
            const previousPenalty = task.badHabitHistory[dateStr] || 0;
            task.badHabitHistory[dateStr] = previousPenalty + penalty;
            task.badHabitCount[dateStr] = (task.badHabitCount[dateStr] || 0) + 1;
            task.completedHistory[dateStr] = false; // 保持未勾選狀態（按鈕模式）

            logAction({
                actionDate: todayStr,
                taskId: task.id,
                taskName: task.name,
                type: 'badHabit',
                source: 'daily',
                score: -penalty,
                scheduledDate: dateStr,
                details: `壞習慣扣分 (第 ${task.badHabitCount[dateStr]} 次, 本次 -${penalty})`
            });

            const countMsg = `(今日累積：${task.badHabitCount[dateStr]} 次)`;
            alert(`壞習慣檢討：已扣除 ${penalty} 分\n${countMsg}\n(連續每日再犯將扣更多！)`);

        } else {
            // 取消壞習慣：退款全部累積扣分
            if (task.badHabitHistory[dateStr]) {
                const totalRefund = task.badHabitHistory[dateStr];
                state.stockPrice += totalRefund;
                delete task.badHabitHistory[dateStr];
                delete task.badHabitCount[dateStr];

                logAction({
                    actionDate: todayStr,
                    taskId: task.id,
                    taskName: task.name,
                    type: 'undo',
                    source: 'daily',
                    score: totalRefund,
                    scheduledDate: dateStr,
                    details: `撤銷壞習慣扣分 (退款 +${totalRefund})`
                });
            }
            task.completedHistory[dateStr] = false;
        }

    // ============================
    // 分支 C：一般任務（排程 / 週期）
    // ============================
    } else {
        const wasChecked = !!task.completedHistory[dateStr];
        task.completedHistory[dateStr] = isChecked;

        // 檢查是否有日期專屬的分數覆寫
        let effectiveScore = task.score;
        if (task.exceptions && typeof task.exceptions[dateStr] === 'object') {
            const override = task.exceptions[dateStr];
            if (override.score !== undefined) {
                effectiveScore = override.score;
            }
        }

        if (isChecked && !wasChecked) {
            state.stockPrice += effectiveScore;
            logAction({
                actionDate: todayStr,
                taskId: task.id,
                taskName: task.name,
                type: 'completion',
                source: 'daily',
                score: effectiveScore,
                scheduledDate: dateStr,
                details: `完成任務${effectiveScore !== task.score ? ` (特殊分數: ${effectiveScore})` : ''}`
            });
        } else if (!isChecked && wasChecked) {
            state.stockPrice -= effectiveScore;
            logAction({
                actionDate: todayStr,
                taskId: task.id,
                taskName: task.name,
                type: 'undo',
                source: 'daily',
                score: -effectiveScore,
                scheduledDate: dateStr,
                details: `取消完成任務`
            });
        }
    }

    // 【統一】同步 K 線圖資料並儲存
    syncPriceHistory();
    saveState();
    renderStartPage();
}

// --- Add Logic ---
function handleAddSubmit(e) {
    e.preventDefault();

    const name = els.addForm.inputs.name.value;
    const isRecurring = document.querySelector('input[name="isRecurring"]:checked').value === 'yes';
    const recurrenceType = els.addForm.inputs.recurrenceType.value;
    const recurrenceInterval = parseInt(els.addForm.inputs.recurrenceInterval.value) || 1;
    const recurrenceStartDate = els.addForm.inputs.recurrenceStartDate.value;

    // Get Weekdays
    const recurrenceWeekDays = [];
    if (recurrenceType === 'weekly') {
        document.querySelectorAll('input[name="recurrenceDay"]:checked').forEach(cb => {
            recurrenceWeekDays.push(parseInt(cb.value));
        });
    }

    const date = els.addForm.inputs.dateInput.value;
    const time = els.addForm.inputs.time.value; // HH:MM

    // Time Range Logic
    let endTime = null;
    const isTimeRange = els.addForm.inputs.isTimeRange && els.addForm.inputs.isTimeRange.checked;
    if (isTimeRange) {
        endTime = els.addForm.inputs.endTime.value;
        if (!endTime) return alert('請輸入結束時間');
        if (endTime <= time) return alert('結束時間必須晚於開始時間');
    }

    const importance = els.addForm.inputs.importance.value;
    const score = parseFloat(els.addForm.inputs.score.value);
    const isMission = els.addForm.inputs.isMission && els.addForm.inputs.isMission.checked;
    const isPersistent = els.addForm.inputs.isPersistent && els.addForm.inputs.isPersistent.checked;

    // NEW: Bad Habit
    const isBadHabitEl = document.getElementById('isBadHabit');
    const isBadHabit = isBadHabitEl && isBadHabitEl.checked;

    // Validation
    if (!name) return alert('請輸入名稱');
    if (!isRecurring && !date && !isBadHabit) return alert('請選擇日期'); // Bad habit behaves like recurring daily

    const now = new Date();
    const todayStr = getLocalDateStr(now);

    // Bad Habit defaults to created today
    const effectiveDate = (isRecurring || isBadHabit) ? (recurrenceStartDate || todayStr) : date;

    const newTask = {
        id: Date.now(),
        createdAt: effectiveDate,
        name,
        type: isRecurring ? 'recurring' : (isBadHabit ? 'badHabit' : 'scheduled'), // can call it 'scheduled' with flag or new type
        isMission: isMission || false,
        isPersistent: isPersistent || false,
        isBadHabit: isBadHabit || false,
        recurrence: isRecurring ? {
            type: recurrenceType,
            interval: recurrenceInterval,
            startDate: recurrenceStartDate || todayStr,
            daysOfWeek: recurrenceWeekDays.length > 0 ? recurrenceWeekDays : null
        } : null,
        date: isRecurring ? null : date,
        time: time || null,
        endTime: endTime || null, // Save endTime
        exceptions: [],
        importance,
        score,
        completedHistory: {},
        badHabitHistory: {} // Record of when it was done and how much penalty
    };

    state.tasks.push(newTask);
    saveState();

    alert('已新增！');
    if (els.addForm.form) els.addForm.form.reset();

    // Reset state
    if (els.addForm.inputs.recurrenceGroup) els.addForm.inputs.recurrenceGroup.classList.add('hidden');
    document.getElementById('recurrenceWeekDays').classList.add('hidden'); // Hide Weekdays
    if (els.addForm.inputs.dateGroup) {
        els.addForm.inputs.dateGroup.classList.remove('hidden');
    }
    const noRadio = document.querySelector('input[name="isRecurring"][value="no"]');
    if (noRadio) noRadio.checked = true;

    // Reset range
    if (els.addForm.inputs.isTimeRange) {
        els.addForm.inputs.isTimeRange.checked = false;
        els.addForm.inputs.endTimeGroup.classList.add('hidden');
    }

    if(window.updateAddViewRightSidebar) window.updateAddViewRightSidebar();
}

let taskToDelete = null;
let dateToDelete = null;

let taskToEdit = null;
let editOriginalDateVal = null; // The date of the item we clicked
let editPendingData = null; // { name, time, newDate }

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
            const timeDisplay = timeStr ? `<span style="margin-right:8px; color:#aaa; font-size:0.9rem; font-family:monospace;">${timeStr}</span>` : '';

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

            // Bind Buttons
            div.querySelector('.btn-edit').onclick = () => openEditModal(task, dateStr);
            div.querySelector('.btn-cancel').onclick = () => initiateDelete(task, dateStr);

            if (els.modal.list) els.modal.list.appendChild(div);
        });
    }

    els.modal.el.classList.remove('hidden');
}

function initiateDelete(task, dateStr) {
    taskToDelete = task;
    dateToDelete = dateStr;

    // Check if Gantt Task
    let isGantt = false;
    if (state.ganttSystem && state.ganttSystem.projects) {
        // Quick check if it's in Gantt structure (or use a flag if we had one reliable)
        // Pseudo-tasks passed from sidebar usually don't have .type='recurring' etc.
        // We can check if it exists in tasks array
        const inRegular = state.tasks.some(t => t.id === task.id);
        if (!inRegular) isGantt = true;
    }

    if (isGantt) {
        if (confirm('確定要刪除此甘特圖項目嗎？')) {
            // Remove from Gantt System
            state.ganttSystem.projects.forEach(proj => {
                proj.parents.forEach(parent => {
                    const idx = parent.children.findIndex(c => c.id === task.id);
                    if (idx !== -1) {
                        parent.children.splice(idx, 1);
                    }
                });
            });
            finishDelete();
        }
    } else if (task.type === 'recurring') {
        // Show Selection Modal
        els.deleteModal.el.classList.remove('hidden');

        // Setup buttons
        els.deleteModal.btnSingle.onclick = () => {
            // Single Cancel - RE-FETCH to prevent stale state
            const freshTask = state.tasks.find(t => t.id === taskToDelete.id);
            if (freshTask) {
                if (!freshTask.exceptions) freshTask.exceptions = {};
                // UNIFY: Use object format instead of array
                freshTask.exceptions[dateToDelete] = true; 
                saveState(); // Explicit save here
            }
            finishDelete();
        };

        els.deleteModal.btnAll.onclick = () => {
            // All Cancel - Ask Confirmation
            if (confirm('確定要徹底刪除此重複任務嗎？(此動作無法復原)')) {
                state.tasks = state.tasks.filter(t => t.taskToDelete ? t.id !== taskToDelete.id : t.id !== taskToDelete.id); // Guard
                state.tasks = state.tasks.filter(t => t.id !== taskToDelete.id);
                finishDelete();
            }
        };

        els.deleteModal.btnCancel.onclick = () => {
            els.deleteModal.el.classList.add('hidden');
            taskToDelete = null;
            dateToDelete = null;
        };

    } else {
        // Single Task
        if (confirm('確定要取消此行程嗎？')) {
            state.tasks = state.tasks.filter(t => t.id != taskToDelete.id);
            finishDelete();
        }
    }
}

function finishDelete() {
    saveState();
    if (els.deleteModal.el) els.deleteModal.el.classList.add('hidden');

    // Refresh List
    const newTasks = getTasksForDate(dateToDelete);
    showDetailModal(dateToDelete, newTasks);

    // Refresh Calendar Indicators
    renderCalendar(currentMonth);
    // Refresh Start Page (if we deleted today's task)
    renderStartPage();
    // Refresh Weekly/Gantt View
    renderWeeklySchedule();

    taskToDelete = null;
    dateToDelete = null;
}

// Helper
// --- Edit Logic ---

function openEditModal(task, dateStr) {
    if (!els.editModal.el) return;

    // Fill Data
    els.editModal.taskId.value = task.id;
    els.editModal.originalDate.value = dateStr; // Hidden: Original
    els.editModal.taskDate.value = task.type === 'recurring' ? ((task.recurrence && task.recurrence.startDate) || dateStr) : dateStr;     // Visible: Editable
    els.editModal.name.value = task.name;
    els.editModal.time.value = task.time || '';
    if (els.editModal.endTime) els.editModal.endTime.value = task.endTime || '';
    if (els.editModal.score) els.editModal.score.value = task.score;
    if (document.getElementById('editImportance')) document.getElementById('editImportance').value = task.importance || 'medium';
    if (els.editModal.isMission) els.editModal.isMission.checked = task.isMission || false;
    if (els.editModal.isPersistent) els.editModal.isPersistent.checked = task.isPersistent || false;
    if (els.editModal.isBadHabit) els.editModal.isBadHabit.checked = task.isBadHabit || false;

    // Recurrence Field Population
    const isRecCheck = document.getElementById('editIsRecurring');
    const recOptions = document.getElementById('editRecurringOptions');
    if (isRecCheck) {
        const isRecurring = task.type === 'recurring';
        isRecCheck.checked = isRecurring;
        if (recOptions) {
            if (isRecurring) {
                recOptions.classList.remove('hidden');
                if (task.recurrence) {
                    if (document.getElementById('editRecurrenceInterval')) document.getElementById('editRecurrenceInterval').value = task.recurrence.interval || 1;
                    if (document.getElementById('editRecurrenceType')) document.getElementById('editRecurrenceType').value = task.recurrence.type || 'daily';

                    // Show/Hide Weekdays based on type
                    const weekDaysGroup = document.getElementById('editRecurrenceWeekDays');
                    if (task.recurrence.type === 'weekly') {
                        weekDaysGroup.classList.remove('hidden');
                        const days = task.recurrence.daysOfWeek || [];
                        const dayChecks = document.getElementsByName('editRecurrenceDay');
                        dayChecks.forEach(cb => {
                            cb.checked = days.includes(parseInt(cb.value));
                        });
                    } else {
                        if (weekDaysGroup) weekDaysGroup.classList.add('hidden');
                    }
                }
            } else {
                recOptions.classList.add('hidden');
            }
        }
    }

    els.editModal.el.classList.remove('hidden');
    if (els.modal.el) els.modal.el.classList.add('hidden');
}

function setupEditListeners() {
    if (els.editModal.closeBtn) els.editModal.closeBtn.onclick = () => els.editModal.el.classList.add('hidden');
    if (els.editModal.cancelBtn) els.editModal.cancelBtn.onclick = () => els.editModal.el.classList.add('hidden');

    // Toggle for Recurrence Options in Edit
    const editRecCheckbox = document.getElementById('editIsRecurring');
    if (editRecCheckbox) {
        editRecCheckbox.onchange = (e) => {
            const opt = document.getElementById('editRecurringOptions');
            if (opt) opt.classList.toggle('hidden', !e.target.checked);
        };
    }
    const editRecType = document.getElementById('editRecurrenceType');
    if (editRecType) {
        editRecType.onchange = (e) => {
            const daysGroup = document.getElementById('editRecurrenceWeekDays');
            if (daysGroup) daysGroup.classList.toggle('hidden', e.target.value !== 'weekly');
        };
    }

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

            // Find Task
            let task = state.tasks.find(t => t.id == taskId);

            // Check for Recurrence logic
            const isRecSet = document.getElementById('editIsRecurring').checked;

            if (task) {
                // 將所有編輯內容暫存到 editPendingData
                editPendingData = {
                    name: newName,
                    time: newTime,
                    endTime: newEndTime,
                    newDate: newDate,
                    score: newScore,
                    importance: newImportance,
                    isMission: newIsMission,
                    isPersistent: newIsPersistent,
                    isBadHabit: newIsBadHabit,
                    isRecSet: isRecSet
                };
                
                if (isRecSet) {
                    const interval = parseInt(document.getElementById('editRecurrenceInterval').value) || 1;
                    const type = document.getElementById('editRecurrenceType').value;
                    editPendingData.recurrence = { type, interval, startDate: newDate };
                    if (type === 'weekly') {
                        editPendingData.recurrence.daysOfWeek = Array.from(document.getElementsByName('editRecurrenceDay'))
                            .filter(c => c.checked).map(c => parseInt(c.value));
                    }
                }

                taskToEdit = task;
                editOriginalDateVal = originalDate;

                // 直接套用，不再詢問範圍
                applyPendingEditsToTask(task);
                finishEdit();
            } else {
                // Try Gantt... (Existing logic preserved below or merged)
                if (state.ganttSystem && state.ganttSystem.projects) {
                    for (const proj of state.ganttSystem.projects) {
                        for (const parent of proj.parents) {
                            const child = findGanttItem(parent.children, taskId);
                            if (child) {
                                child.name = newName;
                                child.score = newScore;
                                // Gantt items don't strictly support recurrence in this app yet
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

    // Scope Modal Handlers
    if (els.editScopeModal.btnSingle) {
        els.editScopeModal.btnSingle.onclick = () => {
            // Edit Single (Add Exception + Create New Task)
            updateRecurringSingle();
        };
    }
    if (els.editScopeModal.btnFuture) {
        els.editScopeModal.btnFuture.onclick = () => {
            // Edit Future (End old + Create New Series)
            updateRecurringFuture();
        };
    }
    if (els.editScopeModal.btnCancel) {
        els.editScopeModal.btnCancel.onclick = () => {
            els.editScopeModal.el.classList.add('hidden');
            // Do not close main edit modal, just scope modal
        };
    }
}

function applyPendingEditsToTask(task) {
    task.name = editPendingData.name;
    task.score = editPendingData.score;
    task.importance = editPendingData.importance;
    task.isMission = editPendingData.isMission;
    task.isPersistent = editPendingData.isPersistent;
    task.isBadHabit = editPendingData.isBadHabit;
    task.time = editPendingData.time;
    task.endTime = editPendingData.endTime;
    // 變更項目後完全取代舊項目，並且將建立時間重設為今天，這樣系統就會忽略（刪除）在今天以前未完成的任務性順延項目
    task.createdAt = getLocalDateStr();
    
    // 完全取代舊項目：清空過去的完成紀錄與例外，讓它變成一個全新的開始
    task.completedHistory = {};
    task.exceptions = {};

    if (editPendingData.isRecSet) {
        task.type = 'recurring';
        task.recurrence = editPendingData.recurrence;
    } else {
        if (task.type === 'recurring') {
            task.type = 'scheduled';
            delete task.recurrence;
        }
        task.date = editPendingData.newDate;
    }
}

function updateRecurringSingle() {
    const freshTask = state.tasks.find(t => t.id === taskToEdit.id);
    if (!freshTask) return alert('Task not found (concurrency error)');

    // 1. Add exception to old (Using ORIGINAL Date)
    if (!freshTask.exceptions) freshTask.exceptions = {};
    if (Array.isArray(freshTask.exceptions)) {
        const oldArr = freshTask.exceptions;
        freshTask.exceptions = {};
        oldArr.forEach(d => freshTask.exceptions[d] = true);
    }
    freshTask.exceptions[editOriginalDateVal] = true;

    // 2. Create new Single Scheduled Task (Using NEW Date)
    const newTask = {
        ...taskToEdit, // taskToEdit has original values
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
        penaltyHistory: {},
        createdAt: editPendingData.newDate
    };

    if (editPendingData.newDate === editOriginalDateVal) {
        if (taskToEdit.completedHistory && taskToEdit.completedHistory[editOriginalDateVal]) {
            newTask.completedHistory[editPendingData.newDate] = true;
        }
    }

    state.tasks.push(newTask);
    els.editScopeModal.el.classList.add('hidden');
    finishEdit();
}


function updateRecurringFuture() {
    const freshTask = state.tasks.find(t => t.id === taskToEdit.id);
    if (!freshTask) return alert('Task not found');

    // 1. End old task yesterday relative to ORIGINAL Date
    const targetDate = new Date(editOriginalDateVal);
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    freshTask.recurrence.endDate = yesterdayStr;

    // 2. Create new Recurring Task starting from NEW Date
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
        createdAt: editPendingData.newDate,
        exceptions: {},
        type: 'recurring',
        recurrence: {
            ...freshTask.recurrence,
            startDate: editPendingData.newDate,
            endDate: null 
        },
        completedHistory: {}, 
        penaltyHistory: {}
    };

    if (editPendingData.isRecSet) {
        newTask.recurrence = editPendingData.recurrence;
    } else {
        newTask.type = 'scheduled';
        delete newTask.recurrence;
        newTask.date = editPendingData.newDate;
    }

    if (editPendingData.newDate === editOriginalDateVal) {
        if (taskToEdit.completedHistory && taskToEdit.completedHistory[editOriginalDateVal]) {
            newTask.completedHistory[editPendingData.newDate] = true;
        }
    }

    state.tasks.push(newTask);
    els.editScopeModal.el.classList.add('hidden');
    // BUG-07 修復: 移除對 freshTask 的錯誤 applyPendingEditsToTask 呼叫
    // 舊的任務 (freshTask) 只需結束日期設定，新任務 (newTask) 已在建立時帶入所有新設定
    finishEdit();
}

function finishEdit() {
    saveState();
    if (els.editModal.el) els.editModal.el.classList.add('hidden');

    // Refresh (Check original date to update list where we clicked)
    const newTasks = getTasksForDate(editOriginalDateVal);
    showDetailModal(editOriginalDateVal, newTasks);

    // Refresh Calendar Indicators
    renderCalendar(currentMonth);
    renderStartPage();

    taskToEdit = null;
    editOriginalDateVal = null;
    editPendingData = null;
}

