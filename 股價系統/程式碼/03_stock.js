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
        // Gantt Chart Pause/Resume Panel
        if (state.ganttSystem && state.ganttSystem.projects.length > 0) {
            const pauseContainer = document.createElement('div');
            pauseContainer.style.marginTop = '20px';
            pauseContainer.style.padding = '15px';
            pauseContainer.style.backgroundColor = 'var(--bg-secondary)';
            pauseContainer.style.borderRadius = 'var(--radius-md)';

            let projectsHtml = `
                <h3 style="margin-bottom:10px; color:var(--text-primary); text-align:center;">Gantt Projects Status</h3>
                <div style="display:flex; flex-direction:column; gap:10px;">
            `;

            state.ganttSystem.projects.forEach(proj => {
                const isPaused = proj.isPaused;
                projectsHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:10px; border-radius:8px;">
                        <div>
                            <div style="font-weight:bold;">${proj.name}</div>
                            <div style="font-size:0.8rem; color:${isPaused ? 'var(--accent-red)' : 'var(--accent-green)'};">
                                ${isPaused ? `Paused (since ${proj.pauseStartDate})` : 'Active'}
                            </div>
                        </div>
                        <button onclick="toggleGanttPause('${proj.id}')" class="${isPaused ? 'btn-primary' : 'btn-bad'}" style="font-size:0.8rem; padding:4px 8px;">
                            ${isPaused ? 'Resume' : 'Pause'}
                        </button>
                    </div>
                `;
            });

            projectsHtml += `</div>`;
            pauseContainer.innerHTML = projectsHtml;
            els.data.tableContainer.appendChild(pauseContainer);
        }
    }
}


// [BUG-06 FIX] Undo an action log entry (reverse its score and log the undo)
function undoActionLogEntry(entryId) {
    if (!state.actionLog) return;
    const entryIndex = state.actionLog.findIndex(function(e) {
        return String(e.id).replace(/[.']/g, '_') === String(entryId);
    });
    if (entryIndex === -1) return alert('Record not found');
    const entry = state.actionLog[entryIndex];
    if (!confirm('Undo score change for [' + entry.taskName + '] (' + (entry.score > 0 ? '+' : '') + entry.score + ')?')) return;

    // Reverse the score
    state.stockPrice -= entry.score;

    // Log the undo action
    const todayStr = getLocalDateStr();
    logAction({
        actionDate: todayStr,
        taskId: entry.taskId,
        taskName: entry.taskName,
        type: 'undo',
        source: entry.source,
        score: -entry.score,
        scheduledDate: entry.scheduledDate,
        details: 'Undo of [' + entry.type + ']'
    });

    // Remove the original entry
    state.actionLog.splice(entryIndex, 1);

    syncPriceHistory();
    saveState('UndoActionLog');
    renderDataView();
    renderStartPage();
}
window.undoActionLogEntry = undoActionLogEntry;
function toggleGanttPause(projId) {
    if (!state.ganttSystem) return;
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    if (proj.isPaused) {
        // RESUME
        const pauseStart = new Date(proj.pauseStartDate);
        const today = new Date();
        const todayStr = getLocalDateStr(today);

        // Calculate Days Paused
        const diffTime = today - pauseStart;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (confirm(`Are you sure you want to resume project [${proj.name}]?\nPaused for ${diffDays} days.\nDates for uncompleted items will be shifted by ${diffDays} days.`)) {

            if (diffDays > 0) {
                // Shift Dates Logic
                const shiftDate = (dateStr, days) => {
                    const d = new Date(dateStr);
                    d.setDate(d.getDate() + days);
                    return getLocalDateStr(d);
                };

                if (!proj.completed) {
                    // Shift Project End Date
                    proj.endDate = shiftDate(proj.endDate, diffDays);

                    // Shift Uncompleted Children
                    const checkItem = (item) => {
                        if (!item.completed) {
                            item.endDate = shiftDate(item.endDate, diffDays);
                            item.startDate = shiftDate(item.startDate, diffDays);
                        }
                        if (item.children) item.children.forEach(checkItem);
                    };
                    proj.parents.forEach(p => checkItem(p));
                }
                alert(`Project [${proj.name}] resumed! Dates shifted by ${diffDays} days.`);
            } else {
                alert(`Project [${proj.name}] resumed (paused for < 1 day, no shift).`);
            }

            proj.isPaused = false;
            proj.pauseStartDate = null;
            saveState();
            renderDataView(); // Refresh UI
        }

    } else {
        // PAUSE
        if (confirm(`Are you sure you want to pause project [${proj.name}]?\nDeadlines won't be calculated during pause.`)) {
            proj.isPaused = true;
            proj.pauseStartDate = getLocalDateStr();
            saveState();
            renderDataView(); // Refresh UI
        }
    }
}

// Global expose
window.toggleGanttPause = toggleGanttPause;


// ============================================================
// 【數據頁】撤銷任務動作
// ============================================================
// 【修復】支援壞習慣、持續性任務的撤銷
// 【修復】使用 effectiveScore 而非基本分數
function undoTaskAction(taskId, dateStr) {
    const task = state.tasks.find(t => t.id == taskId);
    if (!task) return;

    if (!confirm(`確定要撤銷 [${task.name}] 在 ${dateStr} 的加(扣)分嗎？`)) return;

    const todayStr = getLocalDateStr();
    const isCompleted = task.completedHistory && task.completedHistory[dateStr];
    const isPenalized = task.penaltyHistory && task.penaltyHistory[dateStr];
    const isBadHabitPenalized = task.badHabitHistory && task.badHabitHistory[dateStr] !== undefined;
    const isPersistentRewarded = task.persistentHistory && task.persistentHistory[dateStr] !== undefined;

    // 計算有效分數（考慮日期專屬覆寫）
    let effectiveScore = task.score;
    if (task.exceptions && typeof task.exceptions[dateStr] === 'object') {
        const override = task.exceptions[dateStr];
        if (override.score !== undefined) effectiveScore = override.score;
    }

    let scoreChange = 0;
    let undoDetails = '';

    if (isCompleted) {
        // 撤銷完成：扣回分數
        scoreChange = -effectiveScore;
        delete task.completedHistory[dateStr];
        undoDetails = `撤銷完成 (扣回 ${effectiveScore} 分)`;
    } else if (isPenalized) {
        // 撤銷扣分：退回分數
        scoreChange = effectiveScore;
        delete task.penaltyHistory[dateStr];
        undoDetails = `撤銷扣分 (退回 ${effectiveScore} 分)`;
    } else if (isBadHabitPenalized) {
        // 撤銷壞習慣：退回全部累積扣分
        const totalRefund = task.badHabitHistory[dateStr];
        scoreChange = totalRefund;
        delete task.badHabitHistory[dateStr];
        delete task.badHabitCount[dateStr];
        undoDetails = `撤銷壞習慣 (退回 ${totalRefund} 分)`;
    } else if (isPersistentRewarded) {
        // 撤銷持續性任務：扣回全部累積加分
        const totalDeduct = task.persistentHistory[dateStr];
        scoreChange = -totalDeduct;
        delete task.persistentHistory[dateStr];
        delete task.persistentCount[dateStr];
        task.completedHistory[dateStr] = false;
        undoDetails = `撤銷持續性加分 (扣回 ${totalDeduct} 分)`;
    } else {
        alert('找不到可撤銷的紀錄');
        return;
    }

    state.stockPrice += scoreChange;

    logAction({
        actionDate: todayStr,
        taskId: task.id,
        taskName: task.name,
        type: 'undo',
        source: 'daily',
        score: scoreChange,
        scheduledDate: dateStr,
        details: undoDetails
    });

    syncPriceHistory();
    saveState();
    renderDataView();
    renderStartPage();
}

// --- Charts ---
function renderCharts(todaysTasks = []) {
    if (typeof Chart === 'undefined') return;

    // Helper: Reset Canvas Element (Fixes layout shift/growth issues)
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

    // 1. Destroy old instances
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    if (kLineChartInstance) {
        kLineChartInstance.destroy();
        kLineChartInstance = null;
    }
    let ganttChartInstance = window.ganttChartInstance;
    if (ganttChartInstance) {
        ganttChartInstance.destroy();
        window.ganttChartInstance = null;
    }

    // 2. Prepare Data
    let data = state.history.slice();
    const todayStr = getLocalDateStr();

    if (!data.find(h => h.date === todayStr)) {
        data.push({ date: todayStr, price: state.stockPrice });
    }
    const todayEntry = data.find(h => h.date === todayStr);
    if (todayEntry) todayEntry.price = state.stockPrice;

    // 3. Reset and Get Contexts
    const ctxLine = resetCanvas('mainChart');
    const ctxK = resetCanvas('kLineChart');
    const ctxGantt = resetCanvas('ganttChart');

    if (!ctxLine || !ctxK || !ctxGantt) return;

    // --- RE-ATTACH CLICK LISTENER ---
    ctxGantt.onclick = () => renderView('focusedGantt');

    // Line Chart
    chartInstance = new Chart(ctxLine.getContext('2d'), {
        // ... (existing code, implied unchanged)
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
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    display: true,
                    grid: { color: '#30363d' },
                    ticks: { color: '#8b949e' }
                },
                y: {
                    display: true,
                    grid: { color: '#30363d' },
                    ticks: { color: '#8b949e' }
                }
            }
        }
    });

    // K-Line Chart (Mocked OHLC)
    // O: Prev Close, C: Current, H/L: Random around logic
    const kLabels = data.map(d => d.date);
    const bodies = [];
    const wicks = [];
    const colors = [];

    data.forEach((d, i) => {
        const prev = i > 0 ? data[i - 1].price : d.price; // first day open = close
        const curr = d.price;
        const open = prev;
        const close = curr;

        // Mock H/L
        const high = Math.max(open, close) + 2;
        const low = Math.min(open, close) - 2;

        bodies.push([open, close]);
        wicks.push([low, high]);
        colors.push(close >= open ? '#10b981' : '#ef4444');
    });

    // Use Bar Chart to sim Candle
    kLineChartInstance = new Chart(ctxK.getContext('2d'), {
        type: 'bar',
        data: {
            labels: kLabels,
            datasets: [
                {
                    label: 'Range', // Wick
                    data: wicks,
                    backgroundColor: colors,
                    barThickness: 2,
                    grouped: false,
                    order: 1
                },
                {
                    label: 'Body', // Body
                    data: bodies,
                    backgroundColor: colors,
                    barThickness: 8,
                    grouped: false,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    display: true,
                    grid: { color: '#30363d' },
                    ticks: { color: '#8b949e' }
                },
                y: {
                    display: true,
                    grid: { color: '#30363d' },
                    ticks: { color: '#8b949e' }
                }
            }
        }
    });

    // --- Time Table Logic (formerly Gantt) ---
    // Instance destroyed at top

    const rangedTasks = todaysTasks.filter(t => t.time && t.endTime);
    rangedTasks.sort((a, b) => a.time.localeCompare(b.time));

    const timeToFloat = (str) => {
        const [h, m] = str.split(':').map(Number);
        return h + m / 60;
    };

    const now = new Date();
    const currentFloat = now.getHours() + now.getMinutes() / 60;

    const ganttData = rangedTasks.map(t => {
        return {
            x: [timeToFloat(t.time), timeToFloat(t.endTime)],
            y: t.name,
            task: t
        };
    });

    const currentTimePlugin = {
        id: 'currentTimeLine',
        afterDatasetsDraw(chart, args, options) {
            const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;

            if (currentFloat < x.min || currentFloat > x.max) return;

            const xPos = x.getPixelForValue(currentFloat);

            ctx.save();
            // Draw Line
            ctx.beginPath();
            ctx.strokeStyle = '#ef4444'; // Red
            ctx.lineWidth = 2;
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.stroke();

            // Draw Triangle Indicator at top
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos - 6, top - 10);
            ctx.lineTo(xPos + 6, top - 10);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    };

    ganttChartInstance = new Chart(ctxGantt.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ganttData.map(d => d.y),
            datasets: [{
                label: '今日任務',
                data: ganttData.map(d => d.x),
                backgroundColor: (ctx) => {
                    const idx = ctx.dataIndex;
                    const item = ganttData[idx];
                    if (!item) return '#3b82f6';

                    const t = item.task;
                    const val = item.x; // [start, end]

                    // Check Active
                    if (currentFloat >= val[0] && currentFloat < val[1]) {
                        return '#f59e0b'; // Active (Orange)
                    }

                    // Check Completion
                    const todayStr = getLocalDateStr();
                    const isDone = t.completedHistory && t.completedHistory[todayStr];
                    if (isDone) return '#10b981'; // Green
                    if (t.importance === 'critical' || t.importance === 'high') return '#ef4444'; // Red

                    // Past items
                    if (val[1] < currentFloat && !isDone) return '#6b7280'; // Gray for past overdue?

                    return '#3b82f6'; // Blue default
                },
                barPercentage: 0.5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const v = ctx.raw;
                            const fmt = (n) => {
                                const h = Math.floor(n);
                                const m = Math.round((n - h) * 60);
                                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                            };
                            return `${fmt(v[0])} - ${fmt(v[1])}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 24,
                    grid: { color: '#30363d' },
                    ticks: { color: '#8b949e', stepSize: 4 }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#e6edf3' }
                }
            }
        },
        plugins: [currentTimePlugin]
    });
    window.ganttChartInstance = ganttChartInstance; // Save Ref

    // Re-attach click listener safely (Canvas was reset)
    // Note: getElementById returns the NEW canvas element
    const newGanttCanvas = document.getElementById('ganttChart');
    if (newGanttCanvas) {
        newGanttCanvas.onclick = () => {
            console.log("Gantt Chart Clicked -> Weekly View");
            renderView('focusedGantt');
        };
    }
}

// 暴露到全局
window.toggleGanttPause = toggleGanttPause;
window.undoTaskAction = undoTaskAction;

function resetStockPrice() {
    state.stockPrice = 100.00;
    state.history = [];
    saveState();
    renderView('start');
    alert('Stock price reset to 100.00');
}
