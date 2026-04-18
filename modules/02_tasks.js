// ============================================================
// 模組 02: 任務管理系統 (Task Management System)
// ============================================================
// 這個檔案處理所有與「任務」相關的操作，包含：
//   - 查詢某日的任務 (getTasksForDate)
//   - 新增任務 (handleAddSubmit)
//   - 勾選/取消勾選任務 (toggleTask)
//   - 建立任務 DOM 元素 (createTaskEl)
//   - 開啟編輯 Modal (openEditModal, setupEditListeners)
//   - 開啟刪除 Modal (initiateDelete)
//   - 主頁任務列表渲染 (renderStartPage)
//   - 資料清理 (runAutomaticCleanup)
//   - 股價圖表渲染 (renderCharts)
// ============================================================

// ─────────────────────────────────────────────
// § 1. 取得某日的任務清單 (getTasksForDate)
// ─────────────────────────────────────────────
/**
 * 【getTasksForDate】這是整個 APP 最核心的函式之一。
 *
 * 根據給定的日期字串，回傳「那天應該顯示的所有任務」列表。
 * 每個回傳的任務物件都已套用好「例外覆蓋（exceptions）」，
 * 因此其他函式拿到的資料都是「這一天的有效狀態」。
 *
 * 判斷邏輯（優先順序）：
 * 1. 如果有 exceptions[dateStr] 且值為 true → 此任務那天被刪除，跳過
 * 2. 如果有 exceptions[dateStr] 且值為物件 → 套用覆蓋的屬性（名稱/時間/分數）
 * 3. 如果沒有例外，根據任務類型判斷那天是否應顯示：
 *    - isMission: 使命型，只要尚未完成就顯示
 *    - isPersistent: 每次勾選型，永遠顯示
 *    - isBadHabit: 壞習慣型，除非那天已勾選，否則顯示
 *    - scheduled: 單次任務，只在 task.date 那天顯示
 *    - recurring: 重複任務，根據 recurrence 規則判斷
 *
 * @param {string} dateStr - "YYYY-MM-DD" 格式的日期
 * @returns {Array} 有效任務物件的陣列（clone，已套用 exceptions）
 */
function getTasksForDate(dateStr) {
    if (!state.tasks) return [];

    return state.tasks.reduce((acc, task) => {
        // 準備一個「當日有效任務」的 clone 物件
        let effectiveTask = { ...task };
        let isInstanceIncluded = false;

        // ─ 步驟1: 檢查是否有針對這天的例外設定 ─
        if (task.exceptions && task.exceptions[dateStr]) {
            const ex = task.exceptions[dateStr];
            if (ex === true) {
                // 設為 true 代表「這天被刪除」，直接跳過
                return acc;
            } else if (typeof ex === 'object') {
                // 用例外物件的屬性覆蓋 effectiveTask（例如不同的時間、名稱、分數）
                Object.assign(effectiveTask, ex);
                isInstanceIncluded = true; // 有覆蓋就一定要顯示
            }
        }

        // ─ 步驟2: 如果沒有被例外覆蓋，根據任務類型判斷 ─
        // ─ 步驟2: 如果沒有被例外覆蓋，根據任務類型判斷 ─
        if (!isInstanceIncluded) {
            const taskStartDate = task.date || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
            if (dateStr < taskStartDate) return acc; // 任務尚未開始

            const checkRecurrence = (taskObj, dStr) => {
                const interval = taskObj.recurrence.interval || 1;
                const startStr = taskObj.recurrence.startDate || (taskObj.createdAt ? taskObj.createdAt.split('T')[0] : '1970-01-01');
                const endStr = taskObj.recurrence.endDate;
                if (dStr < startStr || (endStr && dStr > endStr)) return false;
                
                const startDate = new Date(startStr);
                const targetDate = new Date(dStr);
                const diffTime = targetDate - startDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
                                 if (!hasCompletionBefore(task, dateStr, pastD)) {
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

// ─────────────────────────────────────────────
// § 2. 取得甘特圖當日任務 (getGanttTasksForDate)
// ─────────────────────────────────────────────
/**
 * 【getGanttTasksForDate】取得甘特圖中，與某天「日期範圍有重疊」的子任務
 * 用於主頁「全部行程」區塊，讓甘特圖的任務也能出現在當天的列表中。
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {Array} 格式化成「虛擬任務」物件的甘特圖子任務陣列
 */
function getGanttTasksForDate(dateStr) {
    const result = [];
    if (!state.ganttSystem || !state.ganttSystem.projects) return result;

    state.ganttSystem.projects.forEach(proj => {
        proj.parents.forEach(parent => {
            // 遞迴輔助函式：深入找所有子任務
            const findLeafItems = (items) => {
                items.forEach(item => {
                    if (!item.children || item.children.length === 0) {
                        // 葉節點（最底層子任務）：如果日期在範圍內就加入
                        if (dateStr >= item.startDate && dateStr <= item.endDate) {
                            result.push({
                                ...item,
                                isGantt: true,        // 標記為甘特圖任務
                                projId: proj.id,
                                parentId: parent.id,
                                time: null,           // 甘特圖任務通常沒有指定時間
                            });
                        }
                    } else {
                        findLeafItems(item.children); // 繼續往深處找
                    }
                });
            };
            findLeafItems([parent]);
        });
    });
    return result;
}

// ─────────────────────────────────────────────
// § 3. 新增任務 (handleAddSubmit)
// ─────────────────────────────────────────────
/**
 * 【handleAddSubmit】處理「新增任務」表單的送出事件
 * 從表單收集所有輸入值，建立新的任務物件並存入 state。
 */
function handleAddSubmit(e) {
    e.preventDefault();

    const name = els.addForm.inputs.name.value;
    const isRecurring = document.querySelector('input[name="isRecurring"]:checked').value === 'yes';
    const recurrenceType = els.addForm.inputs.recurrenceType.value;
    const recurrenceInterval = parseInt(els.addForm.inputs.recurrenceInterval.value) || 1;
    const recurrenceStartDate = els.addForm.inputs.recurrenceStartDate.value;

    // 收集指定星期幾的設定（僅週重複模式）
    const recurrenceWeekDays = [];
    if (recurrenceType === 'weekly') {
        document.querySelectorAll('input[name="recurrenceDay"]:checked').forEach(cb => {
            recurrenceWeekDays.push(parseInt(cb.value));
        });
    }

    const date = els.addForm.inputs.dateInput.value;
    const time = els.addForm.inputs.time.value;

    // 時間範圍（有開始+結束時間）
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
    const isBadHabitEl = document.getElementById('isBadHabit');
    const isBadHabit = isBadHabitEl && isBadHabitEl.checked;

    // 基本驗證
    if (!name) return alert('請輸入名稱');
    if (!isRecurring && !date && !isBadHabit) return alert('請選擇日期');

    const todayStr = getLocalDateStr();
    const effectiveDate = (isRecurring || isBadHabit) ? (recurrenceStartDate || todayStr) : date;

    // 建立新任務物件
    const newTask = {
        id: Date.now(),                         // 用當前時間戳作為唯一 ID
        createdAt: effectiveDate,
        name,
        type: isRecurring ? 'recurring' : (isBadHabit ? 'badHabit' : 'scheduled'),
        isMission: isMission || false,
        isPersistent: isPersistent || false,
        isBadHabit: isBadHabit || false,
        // 重複規則（只在 isRecurring = true 時有值）
        recurrence: isRecurring ? {
            type: recurrenceType,
            interval: recurrenceInterval,
            startDate: recurrenceStartDate || todayStr,
            daysOfWeek: recurrenceWeekDays.length > 0 ? recurrenceWeekDays : null
        } : null,
        date: isRecurring ? null : date,        // 單次任務的日期
        time: time || null,
        endTime: endTime || null,
        exceptions: [],                          // 例外陣列（之後會轉成物件格式）
        importance,
        score,
        completedHistory: {},
        badHabitHistory: {}
    };

    state.tasks.push(newTask);
    saveState();

    alert('已新增！');
    if (els.addForm.form) els.addForm.form.reset();

    // 重設表單 UI 狀態
    if (els.addForm.inputs.recurrenceGroup) els.addForm.inputs.recurrenceGroup.classList.add('hidden');
    const weekDaysDiv = document.getElementById('recurrenceWeekDays');
    if (weekDaysDiv) weekDaysDiv.classList.add('hidden');
    if (els.addForm.inputs.dateGroup) els.addForm.inputs.dateGroup.classList.remove('hidden');
    const noRadio = document.querySelector('input[name="isRecurring"][value="no"]');
    if (noRadio) noRadio.checked = true;
    if (els.addForm.inputs.isTimeRange) {
        els.addForm.inputs.isTimeRange.checked = false;
        els.addForm.inputs.endTimeGroup.classList.add('hidden');
    }
}

// ─────────────────────────────────────────────
// § 4. 勾選/取消勾選任務 (toggleTask)
// ─────────────────────────────────────────────
/**
 * 【toggleTask】當使用者點擊任務旁的勾選框時觸發
 * 根據任務類型，執行不同的得分/扣分邏輯：
 * - 一般任務：勾選 +score，取消 -score
 * - 每次勾選型 (persistent)：每次勾選都 +score，取消則 -score
 * - 壞習慣型 (isBadHabit)：勾選代表「犯了壞習慣」，扣分（且連續犯罰更重）
 *
 * @param {number} taskId - 任務 ID
 * @param {string} dateStr - 勾選的日期 "YYYY-MM-DD"
 * @param {boolean} isChecked - 目前是否為勾選狀態
 * @param {Event?} event - 點擊事件物件（用於防止事件冒泡）
 */
function toggleTask(taskId, dateStr, isChecked, event) {
    if (event) event.stopPropagation();
    const task = state.tasks.find(t => t.id == taskId);
    
    // 支援勾選甘特圖任務（從主頁或全部行程中）
    if (!task) {
        if (state.ganttSystem && state.ganttSystem.projects) {
            let foundGantt = false;
            state.ganttSystem.projects.forEach(proj => {
                proj.parents.forEach(parent => {
                    const child = parent.children.find(c => c.id == taskId);
                    if (child) {
                        child.completed = isChecked;
                        foundGantt = true;
                    }
                });
            });
            if (foundGantt) {
                saveState();
                renderStartPage();
                return;
            }
        }
        return;
    }

    if (!task.completedHistory) task.completedHistory = {};
    const wasChecked = !!task.completedHistory[dateStr]; // 之前的狀態

    if (task.isPersistent) {
        // ─── 每次勾選型：每次都加分，取消則返還 ───
        if (isChecked) {
            state.stockPrice += task.score;
        } else {
            state.stockPrice -= task.score;
        }
        task.completedHistory[dateStr] = isChecked;

    } else if (task.isBadHabit) {
        // ─── 壞習慣型：累進懲罰邏輯 ───
        if (!task.badHabitHistory) task.badHabitHistory = {};

        if (isChecked) {
            // 計算懲罰金額
            let penalty = Math.abs(task.score);
            const historyDates = Object.keys(task.badHabitHistory).sort();

            if (historyDates.length > 0) {
                const lastDate = historyDates[historyDates.length - 1];
                const lastPenalty = task.badHabitHistory[lastDate];

                // 如果昨天也犯了壞習慣，扣分加重（×1.5）
                const yesterday = new Date(dateStr);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = getLocalDateStr(yesterday);

                if (lastDate === yesterdayStr) {
                    penalty = Math.round(lastPenalty * 1.5); // 連續犯，加重懲罰
                }
            }

            state.stockPrice -= penalty;
            task.badHabitHistory[dateStr] = penalty;
            task.completedHistory[dateStr] = true; // 記錄為「已犯」
            alert(`壞習慣檢討：已扣除 ${penalty} 分\n(下次再犯將扣更多！)`);
        } else {
            // 取消：退還懲罰
            if (task.badHabitHistory[dateStr]) {
                state.stockPrice += task.badHabitHistory[dateStr];
                delete task.badHabitHistory[dateStr];
            }
            task.completedHistory[dateStr] = false;
        }

    } else {
        // ─── 一般任務 ───
        task.completedHistory[dateStr] = isChecked;

        // 使用當日的有效分數（可能因為 exception 覆蓋而不同）
        let effectiveScore = task.score;
        if (task.exceptions && typeof task.exceptions[dateStr] === 'object') {
            const override = task.exceptions[dateStr];
            if (override.score !== undefined) {
                effectiveScore = override.score;
            }
        }

        if (isChecked && !wasChecked) {
            state.stockPrice += effectiveScore;     // 勾選：加分
        } else if (!isChecked && wasChecked) {
            state.stockPrice -= effectiveScore;     // 取消：退還
        }
    }

    // 更新今日的歷史股價記錄
    const todayStr = getLocalDateStr();
    const historyIndex = state.history.findIndex(h => h.date === todayStr);
    if (historyIndex >= 0) {
        state.history[historyIndex].price = state.stockPrice;
    } else {
        state.history.push({ date: todayStr, price: state.stockPrice });
    }

    saveState();
    renderStartPage(); // 重新渲染主頁以反映新的勾選狀態
}

// ─────────────────────────────────────────────
// § 5. 建立任務 DOM 元素 (createTaskEl)
// ─────────────────────────────────────────────
/**
 * 【createTaskEl】建立一個任務項目的 HTML 元素
 *
 * 這個函式負責把一個「任務資料物件」渲染成一個可以顯示在 DOM 裡的 <div>。
 * 它產生的元素包含：自訂勾選框、任務名稱、分數標籤、重要程度、編輯和刪除按鈕。
 *
 * @param {Object} task - 任務物件（已由 getTasksForDate 套用 exception 的有效狀態）
 * @param {string} dateStr - 要渲染的日期 "YYYY-MM-DD"
 * @param {boolean} showDate - 是否在任務名稱前顯示日期（用於「重要事項」區塊）
 * @returns {HTMLElement} 組裝好的任務 div 元素
 */
function createTaskEl(task, dateStr, showDate = false) {
    const el = document.createElement('div');
    el.className = 'task-item';
    el.dataset.taskId = task.id;

    // 判斷這個任務在這一天是否已被勾選
    const isCompleted = task.isGantt
        ? task.completed
        : (task.completedHistory && task.completedHistory[dateStr]);

    // 顯示日期（僅用於「重要事項」清單，因為那裡顯示的不一定是今日任務）
    const dateDisplay = showDate
        ? `<span style="color:var(--accent-blue); margin-right:4px; font-size:0.85rem;">${dateStr.slice(5)}</span>`
        : '';

    // 顯示時間（若有指定）
    const timeDisplay = task.time
        ? `<span style="color:var(--text-secondary); margin-right:6px; font-family:monospace; font-size:0.9rem;">${task.time}${task.endTime ? '-' + task.endTime : ''}</span>`
        : '';

    // 組裝 HTML：自訂勾選框 + 任務資訊 + 操作按鈕
    el.innerHTML = `
        <div class="task-check-area" onclick="event.stopPropagation(); toggleTask(${task.id}, '${dateStr}', !this.parentElement.querySelector('.task-checkbox').classList.contains('checked'), event)">
            <div class="task-checkbox ${isCompleted ? 'checked' : ''}">
                ${isCompleted ? '✓' : ''}
            </div>
        </div>
        <div class="task-info">
            <span class="task-name" style="${isCompleted && !task.isPersistent ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                ${dateDisplay}${timeDisplay} ${task.name}
            </span>
            <div class="task-meta">
                <span class="task-score ${task.score >= 0 ? 'positive' : 'negative'}">
                    ${task.score >= 0 ? '+' : ''}${task.score} 分
                </span>
                <span>• ${mapImportance(task.importance)}</span>
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
    if (deleteBtn) deleteBtn.onclick = (e) => { e.stopPropagation(); openDeleteModal(task, dateStr); };

    // 甘特圖任務加上特殊標記（企劃）
    if (task.isGantt) {
        const nameEl = el.querySelector('.task-name');
        if (nameEl) {
            nameEl.innerHTML += ` <span style="font-size:0.7rem; color:var(--accent-blue);">(企劃)</span>`;
        }
    }

    return el;
}

// ─────────────────────────────────────────────
// § 6. 刪除任務 (initiateDelete / finishDelete)
// ─────────────────────────────────────────────
// 全局暫存刪除狀態的變數
let taskToDelete = null;
let dateToDelete = null;

/**
 * 【initiateDelete】開始刪除任務流程
 * 根據任務類型（重複/單次/甘特圖），顯示適當的確認對話框或選擇 Modal。
 */
function initiateDelete(task, dateStr) {
    taskToDelete = task;
    dateToDelete = dateStr;

    // 判斷是否為甘特圖任務（不在 state.tasks 陣列裡）
    let isGantt = false;
    if (state.ganttSystem && state.ganttSystem.projects) {
        const inRegular = state.tasks.some(t => t.id === task.id);
        if (!inRegular) isGantt = true;
    }

    if (isGantt) {
        // 甘特圖任務：直接確認後刪除
        if (confirm('確定要刪除此甘特圖項目嗎？')) {
            state.ganttSystem.projects.forEach(proj => {
                proj.parents.forEach(parent => {
                    const idx = parent.children.findIndex(c => c.id === task.id);
                    if (idx !== -1) parent.children.splice(idx, 1);
                });
            });
            finishDelete();
        }
    } else if (task.type === 'recurring') {
        // 重複任務：顯示選擇 Modal（只刪除這次 / 刪除全部）
        els.deleteModal.el.classList.remove('hidden');

        els.deleteModal.btnSingle.onclick = () => {
            // 只刪除這一次：在 exceptions 物件中記錄這天為已刪除
            const freshTask = state.tasks.find(t => t.id === taskToDelete.id);
            if (freshTask) {
                if (!freshTask.exceptions) freshTask.exceptions = {};
                freshTask.exceptions[dateToDelete] = true;
                saveState();
            }
            finishDelete();
        };

        els.deleteModal.btnAll.onclick = () => {
            // 刪除全部：從 state.tasks 中完全移除
            if (confirm('確定要徹底刪除此重複任務嗎？(此動作無法復原)')) {
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
        // 單次任務：直接確認後刪除
        if (confirm('確定要取消此行程嗎？')) {
            state.tasks = state.tasks.filter(t => t.id != taskToDelete.id);
            finishDelete();
        }
    }
}

// openDeleteModal 是 initiateDelete 的別名，確保從 HTML onclick 也能呼叫
function openDeleteModal(task, dateStr) {
    initiateDelete(task, dateStr);
}

/**
 * 【finishDelete】完成刪除後的善後工作：儲存、重新渲染相關頁面
 */
function finishDelete() {
    saveState();
    if (els.deleteModal.el) els.deleteModal.el.classList.add('hidden');

    const newTasks = getTasksForDate(dateToDelete);
    showDetailModal(dateToDelete, newTasks); // 重新整理細節 Modal
    renderCalendar(currentMonth);           // 重新整理月曆
    renderStartPage();                       // 重新整理主頁
    renderWeeklySchedule();                  // 重新整理週行程

    taskToDelete = null;
    dateToDelete = null;
}

// ─────────────────────────────────────────────
// § 7. 自動清理舊資料
// ─────────────────────────────────────────────
/**
 * 【runAutomaticCleanup】清理超過保留期限的舊資料，減少 storage 佔用
 *
 * 清理規則：
 * - 日常任務 (scheduled)：已完成且超過 30 天前的任務，自動刪除
 * - 甘特圖企劃：已完成且超過 30 天的企劃，自動刪除
 * - 記帳紀錄：超過 60 天的舊支出記錄，彙總到 historicalExpenses 後刪除
 */
function runAutomaticCleanup() {
    let hasChanges = false;
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    // 計算 30 天前的日期
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = getLocalDateStr(thirtyDaysAgo);

    // ─ 清理已完成超過 30 天的排程任務 ─
    const initialTaskCount = state.tasks.length;
    state.tasks = state.tasks.filter(t => {
        if (t.isMission) return true; // 使命型任務永久保留
        if (t.type === 'scheduled' && t.completedHistory) {
            const doneDates = Object.keys(t.completedHistory);
            if (doneDates.length > 0) {
                const lastDone = doneDates.sort().pop();
                if (lastDone < thirtyDaysAgoStr) return false; // 太舊了，刪除
            }
        }
        return true;
    });
    if (state.tasks.length !== initialTaskCount) hasChanges = true;

    // ─ 清理已完成超過 30 天的甘特圖企劃 ─
    if (state.ganttSystem && state.ganttSystem.projects) {
        const initialProjCount = state.ganttSystem.projects.length;
        state.ganttSystem.projects = state.ganttSystem.projects.filter(p => {
            if (p.completed && p.endDate < thirtyDaysAgoStr) return false;
            return true;
        });
        if (state.ganttSystem.projects.length !== initialProjCount) hasChanges = true;
    }

    // ─ 清理超過 60 天的記帳紀錄（彙總到歷史資料後刪除） ─
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const sixtyDaysAgoStr = getLocalDateStr(sixtyDaysAgo);

    if (!state.accounting.historicalExpenses) state.accounting.historicalExpenses = {};

    const keepTransactions = [];
    state.accounting.transactions.forEach(t => {
        if (t.date < sixtyDaysAgoStr) {
            // 舊支出：彙總到 historicalExpenses（用月份 YYYY-MM 為 key）
            if (t.amount < 0) {
                const monthKey = t.date.slice(0, 7);
                state.accounting.historicalExpenses[monthKey] =
                    (state.accounting.historicalExpenses[monthKey] || 0) + Math.abs(t.amount);
            }
            hasChanges = true;
        } else {
            keepTransactions.push(t); // 保留近期記錄
        }
    });

    if (keepTransactions.length !== state.accounting.transactions.length) {
        state.accounting.transactions = keepTransactions;
        hasChanges = true;
    }

    if (hasChanges) {
        console.log("自動清理完成，儲存狀態...");
        saveState();
    }
}

// ─────────────────────────────────────────────
// § 8. 渲染主頁 (renderStartPage)
// ─────────────────────────────────────────────
/**
 * 【renderStartPage】渲染首頁（Start View）的所有元件
 * 包含：股價顯示、圖表、日常任務清單、全部行程清單、重要事項清單、進度條
 */
function renderStartPage() {
    const todayStr = getLocalDateStr();
    const todaysTasks = getTasksForDate(todayStr);

    // ─ 股價顯示 ─
    if (els.dashboard.price) {
        els.dashboard.price.textContent = state.stockPrice.toFixed(2);
        // 雙擊可手動修正股價（開發者功能）
        els.dashboard.price.ondblclick = () => {
            const newPrice = prompt("【手動修正分數】請輸入您要強制修改的今日股價：", state.stockPrice);
            if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
                state.stockPrice = parseFloat(newPrice);
                const historyIndex = state.history.findIndex(h => h.date === todayStr);
                if (historyIndex >= 0) {
                    state.history[historyIndex].price = state.stockPrice;
                } else {
                    state.history.push({ date: todayStr, price: state.stockPrice });
                }
                saveState("ManualPriceEdit");
                renderStartPage();
                alert(`股價已強制修改為 ${state.stockPrice}`);
            }
        };
    }

    // ─ 漲跌幅顯示 ─
    if (state.history.length > 0 && els.dashboard.change) {
        const last = state.history[state.history.length - 1];
        const diff = state.stockPrice - last.price;
        const percent = last.price !== 0 ? (diff / last.price) * 100 : 0;
        els.dashboard.change.textContent = `${diff >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
        els.dashboard.change.className = `price-change ${diff >= 0 ? 'price-up' : 'price-down'}`;
    }

    // ─ 渲染圖表 ─
    renderCharts(todaysTasks);

    // 排序輔助函式：有時間的排在前面，再按時間排序
    const timeSort = (a, b) => {
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
    };

    // ─ 日常任務清單（只顯示重複型任務） ─
    let dailyRoutineTasks = todaysTasks.filter(t => t.type === 'recurring');
    dailyRoutineTasks.sort(timeSort);

    if (els.dashboard.dailyList) {
        els.dashboard.dailyList.innerHTML = '';
        if (dailyRoutineTasks.length === 0) {
            els.dashboard.dailyList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:10px;">今日無例行項目</div>';
        } else {
            dailyRoutineTasks.forEach(task => els.dashboard.dailyList.appendChild(createTaskEl(task, todayStr, false)));
        }
    }

    // ─ 全部行程清單（包含甘特圖任務） ─
    const ganttTasks = getGanttTasksForDate(todayStr);
    const combinedTasks = [...todaysTasks, ...ganttTasks];
    combinedTasks.sort(timeSort);

    if (els.dashboard.allList) {
        els.dashboard.allList.innerHTML = '';
        if (combinedTasks.length === 0) {
            els.dashboard.allList.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:10px;">今日無排程項目</div>';
        } else {
            combinedTasks.forEach(task => els.dashboard.allList.appendChild(createTaskEl(task, todayStr, false)));
        }
    }

    // ─ 重要事項清單 ─
    let criticalTasks = state.tasks.filter(t => {
        if (t.importance !== 'critical') return false;
        if (t.time && t.endTime) return false; // 有時間範圍的不在這裡顯示
        if (t.type === 'scheduled' && !t.isMission && !t.isPersistent && !t.isBadHabit && t.date < todayStr) return false;
        if (t.isMission) {
            const completedDates = t.completedHistory ? Object.keys(t.completedHistory).filter(d => t.completedHistory[d]) : [];
            const firstCompletionDate = completedDates.length > 0 ? completedDates.sort()[0] : null;
            if (firstCompletionDate && firstCompletionDate < todayStr) return false;
        }
        if (t.isBadHabit && t.completedHistory && t.completedHistory[todayStr]) return false;
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
            const targetDate = (task.type === 'recurring' || task.isPersistent || task.isMission || task.isBadHabit)
                ? todayStr : task.date;
            els.dashboard.importantList.appendChild(createTaskEl(task, targetDate, true));
        });
    }

    // ─ 今日進度條 ─
    const progressContainer = document.getElementById('dailyProgressContainer');
    if (progressContainer) {
        const validTodayTasks = combinedTasks.filter(t => !t.isBadHabit && !t.isPersistent && t.score >= 0);
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

// ─────────────────────────────────────────────
// § 9. 色彩輔助函式
// ─────────────────────────────────────────────
/**
 * 【getProgressColor】根據進度百分比回傳顏色（0%→綠色, 100%→紅色）
 * 用於進度條和甘特圖的顏色顯示。
 * @param {number} percentage - 0 到 100 之間的數字
 * @returns {string} CSS rgb() 顏色字串
 */
function getProgressColor(percentage) {
    if (percentage <= 50) {
        const ratio = percentage / 50;
        const r = Math.round(16 + (245 - 16) * ratio);
        const g = Math.round(185 + (158 - 185) * ratio);
        const b = Math.round(129 + (11 - 129) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        const ratio = (percentage - 50) / 50;
        const r = Math.round(245 + (239 - 245) * ratio);
        const g = Math.round(158 + (68 - 158) * ratio);
        const b = Math.round(11 + (68 - 11) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// ─────────────────────────────────────────────
// § 10. 資料圖表渲染 (renderCharts)
// ─────────────────────────────────────────────
/**
 * 【renderCharts】渲染主頁上的三個圖表：
 * 1. 折線圖 (mainChart)：顯示歷史股價趨勢
 * 2. K 線圖 (kLineChart)：模擬股市 K 線圖（開高低收）
 * 3. 時間表 (ganttChart)：顯示今日有時間範圍的任務排布
 */
function renderCharts(todaysTasks = []) {
    if (typeof Chart === 'undefined') return;

    // 重建 canvas（防止 Chart.js 在 resize 時出現錯誤）
    const resetCanvas = (id) => {
        const oldEl = document.getElementById(id);
        if (!oldEl) return null;
        const parent = oldEl.parentElement;
        const newEl = document.createElement('canvas');
        newEl.id = id;
        oldEl.remove();
        parent.appendChild(newEl);
        return newEl;
    };

    // 先銷毀舊的 Chart 實例，避免記憶體洩漏
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (kLineChartInstance) { kLineChartInstance.destroy(); kLineChartInstance = null; }
    if (window.ganttChartInstance) { window.ganttChartInstance.destroy(); window.ganttChartInstance = null; }

    // 準備歷史資料
    let data = state.history.slice();
    const todayStr = getLocalDateStr();
    if (!data.find(h => h.date === todayStr)) data.push({ date: todayStr, price: state.stockPrice });
    const todayEntry = data.find(h => h.date === todayStr);
    if (todayEntry) todayEntry.price = state.stockPrice; // 確保今日數據是最新的

    const ctxLine = resetCanvas('mainChart');
    const ctxK = resetCanvas('kLineChart');
    const ctxGantt = resetCanvas('ganttChart');
    if (!ctxLine || !ctxK || !ctxGantt) return;

    // 重新綁定甘特圖點擊事件（canvas 被重建後要重新綁定）
    ctxGantt.onclick = () => renderView('focusedGantt');

    // ─ 折線圖 ─
    chartInstance = new Chart(ctxLine.getContext('2d'), {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: '股價',
                data: data.map(d => d.price),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: true, grid: { color: '#30363d' }, ticks: { color: '#8b949e' } },
                y: { display: true, grid: { color: '#30363d' }, ticks: { color: '#8b949e' } }
            }
        }
    });

    // ─ K 線圖（模擬）：用 bar chart 模擬蠟燭圖 ─
    const kLabels = data.map(d => d.date);
    const bodies = [], wicks = [], colors = [];
    data.forEach((d, i) => {
        const prev = i > 0 ? data[i - 1].price : d.price;
        const close = d.price;
        const open = prev;
        bodies.push([open, close]);                      // 實體（開收盤）
        wicks.push([Math.min(open, close) - 2, Math.max(open, close) + 2]); // 影線
        colors.push(close >= open ? '#10b981' : '#ef4444'); // 漲綠跌紅
    });

    kLineChartInstance = new Chart(ctxK.getContext('2d'), {
        type: 'bar',
        data: {
            labels: kLabels,
            datasets: [
                { label: 'Wick', data: wicks, backgroundColor: colors, barThickness: 2, grouped: false, order: 1 },
                { label: 'Body', data: bodies, backgroundColor: colors, barThickness: 8, grouped: false, order: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: true, grid: { color: '#30363d' }, ticks: { color: '#8b949e' } },
                y: { display: true, grid: { color: '#30363d' }, ticks: { color: '#8b949e' } }
            }
        }
    });

    // ─ 時間表（Gantt Chart）：顯示今日有時間範圍的任務 ─
    const rangedTasks = todaysTasks.filter(t => t.time && t.endTime);
    rangedTasks.sort((a, b) => a.time.localeCompare(b.time));
    const timeToFloat = (str) => { const [h, m] = str.split(':').map(Number); return h + m / 60; };
    const now = new Date();
    const currentFloat = now.getHours() + now.getMinutes() / 60;
    const ganttData = rangedTasks.map(t => ({ x: [timeToFloat(t.time), timeToFloat(t.endTime)], y: t.name, task: t }));

    // 自訂外掛：在圖表上畫一條紅色「現在時間線」
    const currentTimePlugin = {
        id: 'currentTimeLine',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            if (currentFloat < x.min || currentFloat > x.max) return;
            const xPos = x.getPixelForValue(currentFloat);
            ctx.save();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(xPos, top); ctx.lineTo(xPos, bottom); ctx.stroke();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.moveTo(xPos, top); ctx.lineTo(xPos - 6, top - 10); ctx.lineTo(xPos + 6, top - 10); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
    };

    const ganttChartInstance = new Chart(ctxGantt.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ganttData.map(d => d.y),
            datasets: [{
                label: '今日任務', data: ganttData.map(d => d.x),
                backgroundColor: (ctx) => {
                    const item = ganttData[ctx.dataIndex];
                    if (!item) return '#3b82f6';
                    const val = item.x;
                    if (currentFloat >= val[0] && currentFloat < val[1]) return '#f59e0b'; // 進行中：橘
                    const isDone = item.task.completedHistory && item.task.completedHistory[todayStr];
                    if (isDone) return '#10b981'; // 完成：綠
                    if (item.task.importance === 'critical' || item.task.importance === 'high') return '#ef4444'; // 重要：紅
                    return '#3b82f6'; // 預設：藍
                },
                barPercentage: 0.5
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { min: 0, max: 24, grid: { color: '#30363d' }, ticks: { color: '#8b949e', stepSize: 4 } },
                y: { grid: { display: false }, ticks: { color: '#e6edf3' } }
            }
        },
        plugins: [currentTimePlugin]
    });
    window.ganttChartInstance = ganttChartInstance;

    // 重新綁定點擊事件（canvas 已重建）
    const newGanttCanvas = document.getElementById('ganttChart');
    if (newGanttCanvas) {
        newGanttCanvas.onclick = () => renderView('focusedGantt');
    }
}

// ─────────────────────────────────────────────
// § 11. 資料異常修正 (fixDataAnomalies)
// ─────────────────────────────────────────────
/**
 * 【fixDataAnomalies】修正已知的特定資料異常
 * 當發現某些特定任務的設定不正確時，手動修正。
 * 這個函式是「快速補丁」，用於修正過去版本可能造成的資料問題。
 */
function fixDataAnomalies() {
    let changed = false;
    const targetNames = ["墨守辜城", "多鄰國"];

    state.tasks.forEach(t => {
        if (targetNames.includes(t.name) && t.importance === 'critical') {
            t.importance = 'normal';
            console.log(`已修正任務重要性: ${t.name}`);
            changed = true;
        }
    });

    if (changed) {
        saveState();
    }
}

// 暴露到全局，讓 HTML 的 onclick 可以使用
window.toggleTask = toggleTask;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.initiateDelete = initiateDelete;
