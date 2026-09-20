// ============================================================
// 模組 03: 股價系統 (Stock Price / Score System)
// ============================================================
// 這個檔案是整個 APP 的「獎懲核心」。
// 你的積分被設計成一支「虛擬股票」，完成任務加分就像股價上漲，
// 漏做任務的懲罰就像股價下跌。
//
// 包含：
//   - 每日懲罰計算 (checkDailyPenaltiesOnLoad)
//   - 即時懲罰 (checkImmediatePenalties)
//   - 資料回顧頁面 (renderDataView)
//   - 重設股價 (resetStockPrice)
//   - 撤銷操作 (undoTaskAction)
//   - 甘特圖暫停/恢復 (toggleGanttPause)
// ============================================================

// ─────────────────────────────────────────────
// § 1. 每日懲罰補算 (Daily Catch-Up Penalties)
// ─────────────────────────────────────────────
/**
 * 【checkDailyPenaltiesOnLoad】APP 開啟時，補算昨天（或更早）的漏做懲罰
 *
 * 運作方式：
 * 1. 對比「今天」和「上次登入日期」之間的每一天
 * 2. 對每一天，找出那天應該要做但沒做的任務
 * 3. 計算扣分
 *
 * 這確保了即使你跳過了幾天沒打開 APP，懲罰也會被正確記錄。
 */
function checkDailyPenaltiesOnLoad() {
    let hasChanges = false;

    // 首次使用時，記錄今天為第一次登入日期
    if (!state.lastLoginDate) {
        state.lastLoginDate = getLocalDateStr();
        saveState();
        return;
    }

    const todayStr = getLocalDateStr();
    const lastLogin = state.lastLoginDate;

    // 如果今天已經算過了，跳過（避免重複扣分）
    if (lastLogin !== todayStr) {
        let curr = new Date(lastLogin);
        const end = new Date(todayStr);

        // 從上次登入日，一天一天往前「補算」直到今天
        while (curr < end) {
            const dStr = getLocalDateStr(curr);
            const tasks = getTasksForDate(dStr);

            tasks.forEach(task => {
                // 只有有分數且非「每次勾選型（persistent）」的任務才計算懲罰
                if (task.score > 0 && !task.isPersistent) {
                    if (!task.penaltyHistory) task.penaltyHistory = {};
                    const isCompleted = task.completedHistory && task.completedHistory[dStr];

                    // 如果那天沒完成，且還沒被罰過
                    if (!isCompleted && !task.penaltyHistory[dStr]) {
                        state.stockPrice -= task.score;
                        task.penaltyHistory[dStr] = true; // 記錄已被罰過
                        hasChanges = true;
                    }
                }
            });
            // 移動到下一天
            curr.setDate(curr.getDate() + 1);
        }

        // 更新「上次登入日期」為今天
        state.lastLoginDate = todayStr;
        hasChanges = true;
    }

    // ─── 甘特圖項目的逾期懲罰 ───
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            if (proj.isPaused) return; // 暫停中的企劃不計算懲罰

            // 企劃整體逾期懲罰（只套用一次）
            if (!proj.completed && todayStr > proj.endDate && !proj.penaltyApplied) {
                state.stockPrice -= proj.score;
                if (!proj.penaltyHistory) proj.penaltyHistory = {};
                proj.penaltyHistory[todayStr] = true;
                proj.penaltyApplied = true;
                console.log(`企劃逾期扣分: ${proj.name}`);
                hasChanges = true;
            }

            // 遞迴檢查所有子項目的逾期
            const checkChildren = (items) => {
                items.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        checkChildren(item.children); // 遞迴
                    } else {
                        // 葉節點（最底層的子任務）
                        if (!item.completed && todayStr > item.endDate && !item.penaltyApplied) {
                            state.stockPrice -= item.score;
                            if (!item.penaltyHistory) item.penaltyHistory = {};
                            item.penaltyHistory[todayStr] = true;
                            item.penaltyApplied = true;
                            hasChanges = true;
                        }
                    }
                });
            };

            // 也要檢查父任務本身
            proj.parents.forEach(parent => {
                if (!parent.completed && todayStr > parent.endDate && !parent.penaltyApplied) {
                    state.stockPrice -= parent.score;
                    if (!parent.penaltyHistory) parent.penaltyHistory = {};
                    parent.penaltyHistory[todayStr] = true;
                    parent.penaltyApplied = true;
                    hasChanges = true;
                }
                if (parent.children) checkChildren(parent.children);
            });
        });
    }

    if (hasChanges) {
        console.log("懲罰計算完成，儲存狀態...");
        saveState();
    }
}

// ─────────────────────────────────────────────
// § 2. 即時懲罰 (Immediate Penalties - Runs every minute)
// ─────────────────────────────────────────────
/**
 * 【checkImmediatePenalties】每分鐘執行一次，處理「重要」等級任務的即時逾期
 *
 * 普通任務只在隔天才會被懲罰，但「重要（critical）」等級的任務
 * 一旦超過設定的時間，就會立刻被扣分，不用等到隔天。
 */
function checkImmediatePenalties() {
    let hasChanges = false;
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const currentTimeStr = now.toTimeString().slice(0, 5); // 取得 "HH:MM" 格式

    state.tasks.forEach(task => {
        // 只處理「重要(critical)」等級、有時間設定、有分數的任務
        if (task.importance === 'critical' && task.time && task.score > 0 && !task.isPersistent) {
            let targetDate = null;

            if (task.type === 'recurring') {
                // 重複任務：確認今天有這個任務
                if (getTasksForDate(todayStr).find(t => t.id === task.id)) targetDate = todayStr;
            } else if (task.date <= todayStr) {
                targetDate = task.date; // 單次任務
            }

            if (targetDate) {
                const isToday = targetDate === todayStr;
                const isPastDate = targetDate < todayStr;
                // 使用「結束時間」當懲罰時間點（若有），否則用「開始時間」
                const timeThreshold = task.endTime || task.time;
                const isTimeUp = isToday && currentTimeStr > timeThreshold;

                if (isPastDate || isTimeUp) {
                    if (!task.completedHistory) task.completedHistory = {};
                    if (!task.penaltyHistory) task.penaltyHistory = {};

                    const isCompleted = task.completedHistory[targetDate];
                    const isPenalized = task.penaltyHistory[targetDate];

                    // 如果沒完成且還沒被罰過，立刻扣分
                    if (!isCompleted && !isPenalized) {
                        state.stockPrice -= task.score;
                        task.penaltyHistory[targetDate] = true;
                        hasChanges = true;
                        renderStartPage(); // 立刻更新畫面
                    }
                }
            }
        }
    });

    if (hasChanges) {
        saveState("ImmediatePenaltyApplied");
    }
}

// ─────────────────────────────────────────────
// § 3. 資料回顧頁面 (Data View)
// ─────────────────────────────────────────────
let dataViewDate = 'yesterday'; // 'yesterday' 或 'today'

/**
 * 【renderDataView】渲染「資料回顧」頁面
 * 這個頁面讓你查看昨天或今天的所有得分/扣分明細，
 * 並且可以對每一個操作進行「撤銷」。
 */
function renderDataView() {
    // 切換按鈕 active 狀態
    const targetDate = new Date();
    if (dataViewDate === 'yesterday') {
        targetDate.setDate(targetDate.getDate() - 1);
        els.data.yesterdayBtn.classList.add('active');
        els.data.todayBtn.classList.remove('active');
    } else {
        els.data.todayBtn.classList.add('active');
        els.data.yesterdayBtn.classList.remove('active');
    }
    const targetStr = getLocalDateStr(targetDate);

    if (els.data.dateLabel) els.data.dateLabel.textContent = `${targetStr} 數據回顧`;

    const tasks = getTasksForDate(targetStr);
    let totalChange = 0;

    // 計算當日任務的總得分/扣分
    tasks.forEach(task => {
        const isCompleted = task.completedHistory && task.completedHistory[targetStr];
        const isPenalized = task.penaltyHistory && task.penaltyHistory[targetStr];
        if (isCompleted) totalChange += task.score;
        else if (isPenalized) totalChange -= task.score;
    });

    // 計算甘特圖項目的總得分/扣分
    const activeGanttItems = [];
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            if (proj.penaltyHistory && proj.penaltyHistory[targetStr]) {
                activeGanttItems.push({ type: 'project', name: proj.name, score: proj.score, isPenalized: true });
                totalChange -= proj.score;
            }
            const checkItem = (item) => {
                if (item.completedHistory && item.completedHistory[targetStr]) {
                    activeGanttItems.push({ type: 'item', name: item.name, score: item.score, isCompleted: true });
                    let gain = item.score;
                    if (item.importance === 'importance-dark-red') gain += 4;
                    else if (item.importance === 'importance-light-red') gain += 2;
                    totalChange += gain;
                } else if (item.penaltyHistory && item.penaltyHistory[targetStr]) {
                    activeGanttItems.push({ type: 'item', name: item.name, score: item.score, isPenalized: true });
                    totalChange -= item.score;
                }
                if (item.children) item.children.forEach(checkItem);
            };
            proj.parents.forEach(p => checkItem(p));
        });
    }

    // 更新總變動顯示
    if (els.data.totalChange) {
        els.data.totalChange.textContent = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}`;
        els.data.totalChange.className = `price-value ${totalChange >= 0 ? 'price-up' : 'price-down'}`;
    }

    // 建立詳細資料表格
    if (els.data.tableContainer) {
        els.data.tableContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'data-table';

        // 日常任務的列
        const dailyRows = tasks.map(task => {
            const isCompleted = task.completedHistory && task.completedHistory[targetStr];
            const isPenalized = task.penaltyHistory && task.penaltyHistory[targetStr];
            if (!isCompleted && !isPenalized) return '';

            let scoreDisplay = isCompleted
                ? `${task.score >= 0 ? '+' : ''}${task.score}`
                : `-${task.score}`;
            let statusText = isCompleted ? '已完成' : '自動扣分';

            return `
                <tr>
                    <td>
                        <div>${task.name} <span style="font-size:0.7em; opacity:0.7;">(日常)</span></div>
                        <div style="font-size:0.7rem; color:var(--text-secondary);">${statusText}</div>
                    </td>
                    <td style="text-align:center; font-family:monospace; font-weight:600; color:${isPenalized ? 'var(--accent-red)' : 'var(--accent-green)'}">${scoreDisplay}</td>
                    <td style="text-align:right;">
                        <button onclick="undoTaskAction(${task.id}, '${targetStr}')" class="btn-icon-small" title="撤銷">撤銷</button>
                    </td>
                </tr>
            `;
        }).join('');

        // 甘特圖項目的列
        const ganttRows = activeGanttItems.map(item => {
            const scoreDisplay = item.isCompleted ? `+${item.score}` : `-${item.score}`;
            const statusText = item.isCompleted ? '已完成' : '逾期扣分';
            return `
                <tr>
                    <td>
                        <div>${item.name} <span style="font-size:0.7em; opacity:0.7;">(甘特)</span></div>
                        <div style="font-size:0.7rem; color:var(--text-secondary);">${statusText}</div>
                    </td>
                    <td style="text-align:center; font-family:monospace; font-weight:600; color:${item.isPenalized ? 'var(--accent-red)' : 'var(--accent-green)'}">${scoreDisplay}</td>
                    <td style="text-align:right;">-</td>
                </tr>
            `;
        }).join('');

        table.innerHTML = `
            <thead>
                <tr>
                    <th>項目</th>
                    <th style="text-align:center;">得分異動</th>
                    <th style="text-align:right;">操作</th>
                </tr>
            </thead>
            <tbody>${dailyRows}${ganttRows}</tbody>
        `;
        els.data.tableContainer.appendChild(table);

        // 甘特圖企劃暫停/恢復功能
        if (state.ganttSystem && state.ganttSystem.projects.length > 0) {
            const pauseContainer = document.createElement('div');
            pauseContainer.style.cssText = 'margin-top:20px; padding:15px; background:var(--bg-secondary); border-radius:var(--radius-md);';
            let html = `<h3 style="margin-bottom:10px; text-align:center;">甘特圖企劃狀態</h3><div style="display:flex; flex-direction:column; gap:10px;">`;
            state.ganttSystem.projects.forEach(proj => {
                const isPaused = proj.isPaused;
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:10px; border-radius:8px;">
                        <div>
                            <div style="font-weight:bold;">${proj.name}</div>
                            <div style="font-size:0.8rem; color:${isPaused ? 'var(--accent-red)' : 'var(--accent-green)'};">
                                ${isPaused ? `已暫停 (自 ${proj.pauseStartDate})` : '執行中'}
                            </div>
                        </div>
                        <button onclick="toggleGanttPause('${proj.id}')" class="${isPaused ? 'btn-primary' : 'btn-bad'}" style="font-size:0.8rem; padding:4px 8px;">
                            ${isPaused ? '▶️ 恢復' : '⏸️ 暫停'}
                        </button>
                    </div>
                `;
            });
            pauseContainer.innerHTML = html + '</div>';
            els.data.tableContainer.appendChild(pauseContainer);
        }
    }
}

// ─────────────────────────────────────────────
// § 4. 撤銷操作 (Undo)
// ─────────────────────────────────────────────
/**
 * 【undoTaskAction】撤銷某個任務在特定日期的加/扣分記錄
 * 當發現加分或扣分有誤時，可以從「資料回顧」頁面點撤銷。
 * @param {number} taskId - 任務 ID
 * @param {string} dateStr - 日期字串 "YYYY-MM-DD"
 */
function undoTaskAction(taskId, dateStr) {
    const task = state.tasks.find(t => t.id == taskId);
    if (!task) return;

    if (confirm(`確定要撤銷 [${task.name}] 在 ${dateStr} 的加(扣)分嗎？`)) {
        const isCompleted = task.completedHistory && task.completedHistory[dateStr];
        const isPenalized = task.penaltyHistory && task.penaltyHistory[dateStr];

        // 根據是加分還是扣分，做相反的操作
        if (isCompleted) {
            state.stockPrice -= task.score;
            delete task.completedHistory[dateStr];
        } else if (isPenalized) {
            state.stockPrice += task.score;
            delete task.penaltyHistory[dateStr];
        }

        // 同步更新今日的歷史紀錄
        const todayStr = getLocalDateStr();
        const historyIndex = state.history.findIndex(h => h.date === todayStr);
        if (historyIndex >= 0) {
            state.history[historyIndex].price = state.stockPrice;
        }

        saveState();
        renderDataView();
        renderStartPage();
    }
}

// ─────────────────────────────────────────────
// § 5. 重設股價
// ─────────────────────────────────────────────
/**
 * 【resetStockPrice】將股價重設為 100，並清空所有歷史紀錄
 * 適合在測試完畢後「歸零重來」使用。
 */
function resetStockPrice() {
    state.stockPrice = 100.00;
    state.history = [];
    saveState();
    renderView('start');
    alert('股價已重設為 100.00');
}

// ─────────────────────────────────────────────
// § 6. 甘特圖企劃暫停/恢復
// ─────────────────────────────────────────────
/**
 * 【toggleGanttPause】切換某個甘特圖企劃的「暫停/執行中」狀態
 *
 * 暫停功能的設計目的：
 * - 當你因為生病、旅遊等原因無法繼續執行某個企劃時，可以暫停。
 * - 暫停期間不會計算逾期懲罰。
 * - 恢復時，系統會自動計算暫停了幾天，並把所有未完成的截止日期往後延。
 *
 * @param {string} projId - 企劃 ID
 */
function toggleGanttPause(projId) {
    if (!state.ganttSystem) return;
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    if (proj.isPaused) {
        // ─── 恢復（RESUME）───
        const pauseStart = new Date(proj.pauseStartDate);
        const today = new Date();
        const todayStr = getLocalDateStr(today);
        const diffTime = today - pauseStart;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (confirm(`確定要恢復企劃 [${proj.name}] 嗎？\n已暫停 ${diffDays} 天。\n所有未完成項目的日期將往後延 ${diffDays} 天。`)) {
            if (diffDays > 0) {
                // 日期往後移動的輔助函式
                const shiftDate = (dateStr, days) => {
                    const d = new Date(dateStr);
                    d.setDate(d.getDate() + days);
                    return getLocalDateStr(d);
                };

                if (!proj.completed) {
                    proj.endDate = shiftDate(proj.endDate, diffDays);
                    const checkItem = (item) => {
                        if (!item.completed) {
                            item.endDate = shiftDate(item.endDate, diffDays);
                            item.startDate = shiftDate(item.startDate, diffDays);
                        }
                        if (item.children) item.children.forEach(checkItem);
                    };
                    proj.parents.forEach(p => checkItem(p));
                }
                alert(`企劃 [${proj.name}] 已恢復！相關日期已延後 ${diffDays} 天。`);
            } else {
                alert(`企劃 [${proj.name}] 已恢復 (暫停不足1天，日期不變)。`);
            }

            proj.isPaused = false;
            proj.pauseStartDate = null;
            saveState();
            renderDataView();
        }
    } else {
        // ─── 暫停（PAUSE）───
        if (confirm(`確定要暫停企劃 [${proj.name}] 嗎？\n恢復時將依暫停天數自動延後截止日。`)) {
            proj.isPaused = true;
            proj.pauseStartDate = getLocalDateStr();
            saveState();
            renderDataView();
        }
    }
}

// 暴露到全局，讓 HTML 的 onclick 可以使用
window.toggleGanttPause = toggleGanttPause;
window.undoTaskAction = undoTaskAction;
