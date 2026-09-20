// ============================================================
// 模組 07: UI 框架、DOM 元素對應與初始化
// (UI Framework, DOM Elements & Application Init)
// ============================================================
// 這個檔案是整個 APP 的「骨架」和「大腦」。
// 所有其他模組的函式都由這裡的 init() 和 renderView() 統一協調排程。
//
// 包含：
//   - els: 全局 DOM 元素對應物件
//   - validateAndRepairState(): 啟動時修復損毀的資料
//   - renderView(): 畫面路由（決定要顯示哪個頁面）
//   - init(): APP 進入點（整個 APP 從這裡開始執行）
//   - setupEventListeners(): 綁定所有頂層 UI 事件
//   - 搜尋功能
//   - 導覽列按鈕
//   - 主頁導覽控制（週/月切換）
// ============================================================

// ─────────────────────────────────────────────
// § 1. DOM 元素對應 (els)
// ─────────────────────────────────────────────
// 把所有 HTML 元素用 JavaScript 物件整理成有結構的「元素目錄」。
// 這樣做的好處：
// - 每個元素只查詢一次 DOM（querySelector 有效能代價），之後直接存取 els。
// - 程式碼更清晰：els.dashboard.price 比 document.getElementById('price') 可讀。
let els = {};

/**
 * 【initEls】初始化所有 DOM 元素對應
 * 在 DOM 完全載入後才能呼叫（因為需要找到 HTML 元素）。
 */
function initEls() {
    els = {
        // ─ 主控台 (Dashboard) ─
        dashboard: {
            price:          document.getElementById('stockPrice'),
            change:         document.getElementById('priceChange'),
            dailyList:      document.getElementById('dailyList'),
            allList:        document.getElementById('allList'),
            importantList:  document.getElementById('importantList'),
            untimedTodayList:  document.getElementById('untimedTodayList'),
            untimedWeeklyList: document.getElementById('untimedWeeklyList'),
            moveHint:       document.getElementById('moveHint'),
        },

        // ─ 月曆 (Calendar) ─
        calendar: {
            grid:  document.getElementById('calendarGrid'),
            label: document.getElementById('calendarMonthLabel'),
        },

        // ─ 細節 Modal（點擊日期後彈出的任務列表）─
        modal: {
            el:    document.getElementById('detailModal'),
            label: document.getElementById('detailModalLabel'),
            list:  document.getElementById('detailModalList'),
        },

        // ─ 刪除確認 Modal（重複任務的刪除選擇）─
        deleteModal: {
            el:        document.getElementById('deleteModal'),
            btnSingle: document.getElementById('btnDeleteSingle'),
            btnAll:    document.getElementById('btnDeleteAll'),
            btnCancel: document.getElementById('btnCancelDelete'),
        },

        // ─ 編輯 Modal ─
        editModal: {
            el:          document.getElementById('editModal'),
            form:        document.getElementById('editForm'),
            taskId:      document.getElementById('editTaskId'),
            originalDate: document.getElementById('editOriginalDate'),
            taskDate:    document.getElementById('editTaskDate'),
            name:        document.getElementById('editTaskName'),
            time:        document.getElementById('editTaskTime'),
            endTime:     document.getElementById('editTaskEndTime'),
            score:       document.getElementById('editTaskScore'),
            isMission:   document.getElementById('editIsMission'),
            isPersistent: document.getElementById('editIsPersistent'),
            isBadHabit:  document.getElementById('editIsBadHabit'),
            closeBtn:    document.getElementById('closeEditModal'),
            cancelBtn:   document.getElementById('cancelEditBtn'),
        },

        // ─ 編輯範圍 Modal（重複任務：僅此次 / 之後全部）─
        editScopeModal: {
            el:        document.getElementById('editScopeModal'),
            btnSingle: document.getElementById('btnEditSingle'),
            btnFuture: document.getElementById('btnEditFuture'),
            btnCancel: document.getElementById('btnCancelEditScope'),
        },

        // ─ 新增任務表單 ─
        addForm: {
            form:   document.getElementById('addTaskForm'),
            inputs: {
                name:             document.getElementById('taskName'),
                dateInput:        document.getElementById('taskDate'),
                time:             document.getElementById('taskTime'),
                endTime:          document.getElementById('taskEndTime'),
                endTimeGroup:     document.getElementById('endTimeGroup'),
                isTimeRange:      document.getElementById('isTimeRange'),
                importance:       document.getElementById('taskImportance'),
                score:            document.getElementById('taskScore'),
                recurrenceType:   document.getElementById('recurrenceType'),
                recurrenceInterval: document.getElementById('recurrenceInterval'),
                recurrenceStartDate: document.getElementById('recurrenceStartDate'),
                recurrenceGroup:  document.getElementById('recurrenceGroup'),
                dateGroup:        document.getElementById('dateGroup'),
                isMission:        document.getElementById('isMission'),
                isPersistent:     document.getElementById('isPersistent'),
            }
        },

        // ─ 導覽列按鈕 ─
        nav: {
            accountingBtn: document.getElementById('nav-accounting'),
            ganttBtn:      document.getElementById('nav-gantt'),
            searchBtn:     document.getElementById('nav-search'),
        },

        // ─ 返回按鈕（各子頁面的「返回」）─
        backBtns: {
            fromAccounting:    document.getElementById('back-from-accounting'),
            fromGanttMain:     document.getElementById('back-from-gantt-main'),
            fromAddProject:    document.getElementById('back-from-add-project'),
            fromProjDetail:    document.getElementById('back-from-proj-detail'),
            fromBankDetail:    document.getElementById('back-from-bank-detail'),
            fromCategoryDetail: document.getElementById('back-from-category-detail'),
        },

        // ─ 記帳系統 (Accounting) ─
        accounting: {
            accountCards:  document.getElementById('accountCards'),
            transactionList: document.getElementById('transactionList'),
            bankList:      document.getElementById('bankList'),
            categoryList:  document.getElementById('categoryList'),
            openAddFormBtn: document.getElementById('openAddTransactionForm'),
            viewAllBtn:    document.getElementById('viewAllTransactions'),
            viewChartBtn:  document.getElementById('viewSpendingChart'),
            viewSettingsBtn: document.getElementById('viewAccountSettings'),
            addBankBtn:    document.getElementById('addBankBtn'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            newBankName:   document.getElementById('newBankName'),
            newBankBalance: document.getElementById('newBankBalance'),
            newCategoryName: document.getElementById('newCategoryName'),
            addForm:       document.getElementById('addTransactionForm'),
            inputs: {
                description: document.getElementById('transDescription'),
                amount:      document.getElementById('transAmount'),
                type:        document.getElementById('transType'),
                bank:        document.getElementById('transBank'),
                category:    document.getElementById('transCategory'),
                date:        document.getElementById('transDate'),
            },
            editModal: {
                el:          document.getElementById('editTransactionModal'),
                form:        document.getElementById('editTransactionForm'),
                closeBtn:    document.getElementById('closeEditTransactionModal'),
                cancelBtn:   document.getElementById('cancelEditTransaction'),
                inputs: {
                    editId:          document.getElementById('editTransactionId'),
                    editDescription: document.getElementById('editTransDescription'),
                    editAmount:      document.getElementById('editTransAmount'),
                    editType:        document.getElementById('editTransType'),
                    editBank:        document.getElementById('editTransBank'),
                    editCategory:    document.getElementById('editTransCategory'),
                    editDate:        document.getElementById('editTransDate'),
                }
            },
            section: {
                add:      document.getElementById('addTransactionSection'),
                list:     document.getElementById('transactionListSection'),
                chart:    document.getElementById('chartSection'),
                settings: document.getElementById('settingsSection'),
            }
        },

        // ─ 甘特圖系統 (Gantt) ─
        gantt: {
            projectList:       document.getElementById('ganttProjectList'),
            openAddProjectBtn: document.getElementById('openAddProjectForm'),
            addForm:           document.getElementById('addProjectForm'),
            addParentTaskSlotBtn: document.getElementById('addParentTaskSlot'),
            parentTaskContainer: document.getElementById('parentTaskContainer'),
            projDetailTitle:   document.getElementById('projDetailTitle'),
            projDetailContent: document.getElementById('projDetailContent'),
            childModal: {
                el:      document.getElementById('addChildModal'),
                form:    document.getElementById('addChildForm'),
                closeBtn: document.getElementById('closeChildModal'),
            },
            editModal: {
                el:        document.getElementById('editGanttModal'),
                form:      document.getElementById('editGanttForm'),
                closeBtn:  document.getElementById('closeEditGanttModal'),
                deleteBtn: document.getElementById('deleteGanttItemBtn'),
            },
            projEditModal: {
                el:        document.getElementById('editGanttProjectModal'),
                form:      document.getElementById('editGanttProjectForm'),
                closeBtn:  document.getElementById('closeEditGanttProjectModal'),
                deleteBtn: document.getElementById('deleteGanttProjectBtn'),
                addParentBtn: document.getElementById('addParentToExistingProject'),
                parentList: document.getElementById('editProjectParentList'),
            }
        },

        // ─ 資料回顧頁面 (Data View) ─
        data: {
            yesterdayBtn:  document.getElementById('dataYesterday'),
            todayBtn:      document.getElementById('dataToday'),
            dateLabel:     document.getElementById('dataDateLabel'),
            totalChange:   document.getElementById('dataTotalChange'),
            tableContainer: document.getElementById('dataTableContainer'),
        },

        // ─ 所有需要顯示/隱藏的「頁面容器」─
        views: {
            start:                document.getElementById('startView'),
            schedule:             document.getElementById('scheduleView'),
            addTask:              document.getElementById('addTaskView'),
            accounting:           document.getElementById('accountingView'),
            ganttMain:            document.getElementById('ganttMainView'),
            ganttAddProject:      document.getElementById('ganttAddProjectView'),
            ganttProjectDetail:   document.getElementById('ganttProjectDetailView'),
            data:                 document.getElementById('dataView'),
            focusedGantt:         document.getElementById('focusedGanttView'),
            search:               document.getElementById('searchView'),
            bankDetail:           document.getElementById('bankDetailView'),
            categoryDetail:       document.getElementById('categoryDetailView'),
        }
    };
}

// ─────────────────────────────────────────────
// § 2. 畫面路由 (renderView)
// ─────────────────────────────────────────────
/**
 * 【renderView】顯示指定頁面，隱藏其他所有頁面
 * 這是一個 SPA（單頁應用程式）的路由機制。
 * 每個「頁面」都是一個 DOM div，我們用 show/hide 來切換。
 *
 * @param {string} viewName - 要顯示的頁面名稱（對應 els.views 的 key）
 */
function renderView(viewName) {
    currentView = viewName;

    // 先隱藏所有頁面
    Object.values(els.views).forEach(v => v && v.classList.add('hidden'));

    // 顯示目標頁面
    if (els.views[viewName]) {
        els.views[viewName].classList.remove('hidden');
    } else {
        console.warn(`renderView: 找不到名為 '${viewName}' 的頁面`);
        els.views.start.classList.remove('hidden');
    }

    // 切換到不同頁面時，執行對應的渲染函式
    switch (viewName) {
        case 'start':
            renderStartPage();
            break;
        case 'schedule':
            renderCalendar(currentMonth);
            break;
        case 'accounting':
            renderAccountingView();
            break;
        case 'ganttMain':
            renderGanttMainPage();
            break;
        case 'data':
            renderDataView();
            break;
        case 'focusedGantt':
            renderWeeklySchedule();
            break;
        case 'search':
            // 搜尋頁面不需要額外初始化
            break;
    }
}

// ─────────────────────────────────────────────
// § 3. 狀態驗證與修復 (validateAndRepairState)
// ─────────────────────────────────────────────
/**
 * 【validateAndRepairState】驗證並修復 state 資料的完整性
 * 當 state 從 LocalStorage 或雲端載入時，可能因為版本差異或資料損毀
 * 而缺少某些必要的屬性。這個函式確保所有必要屬性都存在。
 */
function validateAndRepairState() {
    // 確保最頂層屬性存在
    if (typeof state.stockPrice !== 'number') state.stockPrice = 100;
    if (!Array.isArray(state.history)) state.history = [];
    if (!Array.isArray(state.tasks)) state.tasks = [];
    if (!state.lastLoginDate) state.lastLoginDate = '';

    // 確保記帳子系統存在
    if (!state.accounting) {
        state.accounting = { transactions: [], banks: [{ id: 1, name: '現金', balance: 0 }], categories: [] };
    }
    if (!Array.isArray(state.accounting.transactions)) state.accounting.transactions = [];
    if (!Array.isArray(state.accounting.banks)) state.accounting.banks = [];
    if (!Array.isArray(state.accounting.categories)) state.accounting.categories = [];

    // 確保甘特圖子系統存在
    if (!state.ganttSystem) state.ganttSystem = { projects: [] };
    if (!Array.isArray(state.ganttSystem.projects)) state.ganttSystem.projects = [];

    // 修復每個任務的必要屬性
    state.tasks.forEach(t => {
        if (!t.completedHistory) t.completedHistory = {};
        if (!t.penaltyHistory) t.penaltyHistory = {};
        if (!t.badHabitHistory) t.badHabitHistory = {};
        // 統一 exceptions 格式：必須是物件（object），不能是陣列
        if (!t.exceptions || Array.isArray(t.exceptions)) t.exceptions = {};
    });

    // 修復每個甘特圖企劃的必要屬性
    state.ganttSystem.projects.forEach(proj => {
        if (!Array.isArray(proj.parents)) proj.parents = [];
        proj.parents.forEach(parent => {
            if (!Array.isArray(parent.children)) parent.children = [];
        });
    });
}

// ─────────────────────────────────────────────
// § 4. 初始化 (init)
// ─────────────────────────────────────────────
/**
 * 【init】APP 的進入點，整個應用從這裡開始執行。
 *
 * 執行順序：
 * 1. 取得所有 DOM 元素（initEls）
 * 2. 從 LocalStorage 讀取儲存的資料
 * 3. 驗證並修復資料完整性
 * 4. 設定所有事件監聽器
 * 5. 連接 Firebase 雲端
 * 6. 設定分頁可見性監聽（使用者切換回這個分頁時更新狀態）
 * 7. 設定每分鐘定期任務（即時懲罰檢查）
 *
 * 注意：渲染畫面和懲罰計算不在這裡做，而是在 setupCloudSync 完成首次連線後才執行，
 * 這樣可以確保使用的是最新的資料。
 */
function init() {
    console.log("APP 開始初始化...");

    // ─ 步驟1: 初始化 DOM 元素對應 ─
    initEls();

    // ─ 步驟2: 從 LocalStorage 載入資料 ─
    try {
        const savedState = localStorage.getItem('me-inc-state');
        if (savedState) {
            state = { ...defaultState, ...JSON.parse(savedState) };
            console.log("從本機載入資料成功");
        } else {
            state = { ...defaultState };
            console.log("沒有本機資料，使用預設值");
        }
    } catch (e) {
        console.error("載入本機資料失敗，使用預設值：", e);
        state = { ...defaultState };
    }

    // ─ 步驟3: 驗證並修復資料 ─
    validateAndRepairState();

    // ─ 步驟4: 設定所有事件監聽器 ─
    setupEventListeners();

    // ─ 步驟5: 設定分頁可見性監聽（使用者切回這個分頁時同步狀態） ─
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log("分頁重新可見，更新同步狀態...");
            checkImmediatePenalties();
            renderStartPage();
        }
    });

    // ─ 步驟6: 啟動雲端同步（非同步，完成後才渲染畫面） ─
    setupCloudSync();

    // ─ 步驟7: 每分鐘定期執行即時懲罰檢查 ─
    setInterval(() => {
        if (isCloudSyncStarted) { // 確保雲端已連線（否則 saveState 不完整）
            checkImmediatePenalties();
        }
    }, 60 * 1000); // 每 60 秒執行一次

    console.log("APP 初始化完成，等待雲端連線...");
}

// ─────────────────────────────────────────────
// § 5. 事件監聽器設置 (setupEventListeners)
// ─────────────────────────────────────────────
/**
 * 【setupEventListeners】設定整個 APP 的所有 UI 事件處理
 * 包含：導覽列、返回按鈕、月曆翻頁、週行程翻頁、
 * 新增表單、刪除 Modal、搜尋、手動同步按鈕等
 */
function setupEventListeners() {
    // ─ 主選單按鈕 ─
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.onclick = () => renderView('start');

    const scheduleBtn = document.getElementById('scheduleBtn');
    if (scheduleBtn) scheduleBtn.onclick = () => renderView('schedule');

    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) addTaskBtn.onclick = () => renderView('addTask');

    const dataBtn = document.getElementById('dataBtn');
    if (dataBtn) dataBtn.onclick = () => renderView('data');

    // ─ 月曆翻頁按鈕 ─
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) prevMonthBtn.onclick = () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar(currentMonth);
    };
    const nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) nextMonthBtn.onclick = () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar(currentMonth);
    };

    // ─ 週行程翻頁按鈕 ─
    const prevWeekBtn = document.getElementById('prevWeek');
    if (prevWeekBtn) prevWeekBtn.onclick = () => {
        if (!weeklyStartDay) weeklyStartDay = new Date();
        weeklyStartDay.setDate(weeklyStartDay.getDate() - 7);
        renderWeeklySchedule();
    };
    const nextWeekBtn = document.getElementById('nextWeek');
    if (nextWeekBtn) nextWeekBtn.onclick = () => {
        if (!weeklyStartDay) weeklyStartDay = new Date();
        weeklyStartDay.setDate(weeklyStartDay.getDate() + 7);
        renderWeeklySchedule();
    };
    const thisWeekBtn = document.getElementById('thisWeek');
    if (thisWeekBtn) thisWeekBtn.onclick = () => {
        weeklyStartDay = null; // 設為 null 會讓 renderWeeklySchedule 重新計算本週
        renderWeeklySchedule();
    };

    // ─ 取消移動模式按鈕 ─
    const cancelMoveBtn = document.getElementById('cancelMove');
    if (cancelMoveBtn) cancelMoveBtn.onclick = cancelMove;

    // ─ 行程細節 Modal 的關閉按鈕 ─
    const closeDetailModal = document.getElementById('closeDetailModal');
    if (closeDetailModal) closeDetailModal.onclick = () => {
        if (els.modal.el) els.modal.el.classList.add('hidden');
    };

    // ─ 資料回顧頁 (Data) 的時間切換按鈕 ─
    if (els.data.yesterdayBtn) {
        els.data.yesterdayBtn.onclick = () => { dataViewDate = 'yesterday'; renderDataView(); };
    }
    if (els.data.todayBtn) {
        els.data.todayBtn.onclick = () => { dataViewDate = 'today'; renderDataView(); };
    }

    // ─ 新增任務表單 ─
    if (els.addForm.form) els.addForm.form.onsubmit = handleAddSubmit;

    // 「是否為重複任務」選項切換
    const recurringRadios = document.querySelectorAll('input[name="isRecurring"]');
    recurringRadios.forEach(radio => {
        radio.onchange = (e) => {
            const isRecurring = e.target.value === 'yes';
            if (els.addForm.inputs.recurrenceGroup) els.addForm.inputs.recurrenceGroup.classList.toggle('hidden', !isRecurring);
            if (els.addForm.inputs.dateGroup) els.addForm.inputs.dateGroup.classList.toggle('hidden', isRecurring);
        };
    });

    // 重複類型：每週才顯示星期幾
    if (els.addForm.inputs.recurrenceType) {
        els.addForm.inputs.recurrenceType.onchange = (e) => {
            const weekdaysDiv = document.getElementById('recurrenceWeekDays');
            if (weekdaysDiv) weekdaysDiv.classList.toggle('hidden', e.target.value !== 'weekly');
        };
    }

    // 時間範圍 toggle
    if (els.addForm.inputs.isTimeRange) {
        els.addForm.inputs.isTimeRange.onchange = (e) => {
            if (els.addForm.inputs.endTimeGroup) {
                els.addForm.inputs.endTimeGroup.classList.toggle('hidden', !e.target.checked);
            }
        };
    }

    // ─ 搜尋功能 ─
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase();
            const resultsContainer = document.getElementById('searchResults');
            if (!resultsContainer) return;

            if (query.length < 1) {
                resultsContainer.innerHTML = '<p style="text-align:center; color:gray;">輸入關鍵字搜尋任務</p>';
                return;
            }

            // 搜尋任務（名稱包含關鍵字）
            const results = state.tasks.filter(t => t.name.toLowerCase().includes(query));
            resultsContainer.innerHTML = '';

            if (results.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align:center; color:gray;">找不到符合的任務</p>';
                return;
            }

            results.forEach(task => {
                const item = document.createElement('div');
                item.className = 'task-item';
                const targetDate = task.date || getLocalDateStr();
                item.innerHTML = `
                    <div class="task-info">
                        <span class="task-name">${task.name}</span>
                        <div class="task-meta">${task.type === 'recurring' ? '重複任務' : targetDate} | ${task.score}分 | ${mapImportance(task.importance)}</div>
                    </div>
                    <button onclick="openEditModal(state.tasks.find(t=>t.id==${task.id}), '${targetDate}')" class="btn-icon">✏️</button>
                `;
                resultsContainer.appendChild(item);
            });
        };
    }

    // ─ 導覽列（搜尋、記帳、甘特圖）─
    if (els.nav.searchBtn) els.nav.searchBtn.onclick = () => renderView('search');
    if (els.nav.accountingBtn) els.nav.accountingBtn.onclick = () => renderView('accounting');
    if (els.nav.ganttBtn) els.nav.ganttBtn.onclick = () => renderView('ganttMain');

    // ─ 手動同步按鈕 ─
    const downloadBtn = document.getElementById('manualDownloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => manualDownloadFromCloud(downloadBtn);
    }

    const uploadBtn = document.getElementById('manualUploadBtn');
    if (uploadBtn) {
        uploadBtn.onclick = () => manualUploadToCloud(uploadBtn);
    }

    // ─ 初始化各子系統的事件監聽 ─
    setupEditListeners();      // 06_calendar.js
    setupAccountingListeners(); // 04_accounting.js
    setupGanttListeners();      // 05_gantt.js

    console.log("所有事件監聽器設定完成。");
}
