// --- State Management ---
const defaultState = {
    stockPrice: 100.00,
    history: [],
    tasks: [],
    lastLoginDate: '',
    updatedAt: 0, // NEW: For sync conflict resolution
    accounting: {
        transactions: [],
        banks: [
            { id: 1, name: '現金', balance: 0 }
        ],
        categories: [
            { id: 1, name: '飲食' },
            { id: 2, name: '交通' },
            { id: 3, name: '娛樂' },
            { id: 4, name: '薪資' },
            { id: 5, name: '獎金' }
        ]
    },
    ganttSystem: {
        projects: []
    }
};

// Initial state (will be overwritten by Cloud data)
let state = defaultState;
let currentView = 'start';
let currentMonth = new Date();
let chartInstance = null;
let kLineChartInstance = null;
let weeklyStartDay = null; // Monday of the current viewing week
let movingTask = null; // { task, sourceDate }
let isCloudSyncStarted = false;

const firebaseConfig = {
    apiKey: "AIzaSyAa0xcoNbVHc_bzAI53WK2XbU41xJJP4q0",
    authDomain: "me-inc-db.firebaseapp.com",
    projectId: "me-inc-db",
    storageBucket: "me-inc-db.firebasestorage.app",
    messagingSenderId: "598336717364",
    appId: "1:598336717364:web:a56fa398689fedf2fec061",
    measurementId: "G-707RMW9027"
};

// --- Firebase Initialization ---
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        var db = firebase.firestore();
    } else {
        console.warn("Firebase not loaded from CDN.");
    }
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// --- Helper: Date Utilities ---
const getLocalDateStr = (d = new Date()) => {
    try {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    } catch (e) {
        console.error("Date Utility Error:", e);
        return new Date().toISOString().split('T')[0];
    }
};

const getDayName = (dateStr) => {
    return ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][new Date(dateStr).getDay()];
};

// --- DOM Elements ---
const els = {
    views: {
        start: document.getElementById('startView'),
        add: document.getElementById('addView'),
        schedule: document.getElementById('scheduleView'),
        focusedGantt: document.getElementById('focusedGanttView'),
        data: document.getElementById('dataView'),
        accounting: document.getElementById('accountingView'),
        ganttMain: document.getElementById('ganttMainView'),
        ganttAddProject: document.getElementById('ganttAddProjectView'),
        ganttProjectDetail: document.getElementById('ganttProjectDetailView')
    },
    nav: {
        addBtn: document.getElementById('navAddBtn'),
        scheduleBtn: document.getElementById('navScheduleBtn'),
        accountingBtn: document.getElementById('navAccountingBtn'),
        ganttBtn: document.getElementById('navGanttBtn'),
        weeklyPrevBtn: document.getElementById('prevWeekBtn'),
        weeklyNextBtn: document.getElementById('nextWeekBtn'),
        cancelMoveBtn: document.getElementById('cancelMoveBtn')
    },
    backBtns: {
        fromAdd: document.getElementById('backFromAddBtn'),
        fromSchedule: document.getElementById('backFromScheduleBtn'),
        fromGantt: document.getElementById('backFromGanttBtn'),
        fromGanttMain: document.getElementById('backFromGanttMainBtn'),
        fromAddProject: document.getElementById('backFromAddProjectBtn'),
        fromProjDetail: document.getElementById('backFromProjDetailBtn')
    },
    gantt: {
        openAddProjectBtn: document.getElementById('openAddProjectBtn'),
        projectList: document.getElementById('projectList'),
        addForm: document.getElementById('addProjectForm'),
        parentTaskContainer: document.getElementById('parentTaskListContainer'),
        addParentTaskSlotBtn: document.getElementById('addParentTaskSlotBtn'),
        projDetailContent: document.getElementById('projDetailContent'),
        projDetailTitle: document.getElementById('projDetailTitle'),
        childModal: {
            el: document.getElementById('addChildTaskModal'),
            form: document.getElementById('addChildTaskForm'),
            closeBtn: document.getElementById('closeChildTaskModalBtn')
        },
        editModal: {
            el: document.getElementById('editGanttTaskModal'),
            form: document.getElementById('editGanttTaskForm'),
            closeBtn: document.getElementById('closeEditGanttModalBtn'),
            deleteBtn: document.getElementById('deleteGanttTaskBtn')
        },
        projEditModal: {
            el: document.getElementById('editGanttProjectModal'),
            form: document.getElementById('editGanttProjectForm'),
            closeBtn: document.getElementById('closeEditGanttProjectModalBtn'),
            deleteBtn: document.getElementById('deleteGanttProjectBtn'),
            parentList: document.getElementById('editProjParentList'),
            addParentBtn: document.getElementById('editProjAddParentBtn')
        }
    },
    dashboard: {
        price: document.getElementById('currentPrice'),
        change: document.getElementById('priceChange'),
        dailyList: document.getElementById('dailyRoutineList'),
        allList: document.getElementById('allTaskList'),
        importantList: document.getElementById('importantTaskList'),
        searchInput: document.getElementById('searchDateInput'),
        searchBtn: document.getElementById('searchBtn'),
        // focusedList: document.getElementById('focusedGanttList'), // Removed (Obsolete)
        weeklyGrid: document.getElementById('weeklyGrid'),
        weeklyTitle: document.getElementById('weeklyViewTitle'),
        moveHint: document.getElementById('moveTaskHint'),
        untimedTodayList: document.getElementById('untimedTodayList'),
        untimedWeeklyList: document.getElementById('untimedWeeklyList')
    },
    calendar: {
        label: document.getElementById('currentMonthLabel'),
        grid: document.getElementById('calendarGrid'),
        prevBtn: document.getElementById('prevMonthBtn'),
        nextBtn: document.getElementById('nextMonthBtn')
    },
    modal: {
        el: document.getElementById('detailModal'),
        label: document.getElementById('detailDateLabel'),
        list: document.getElementById('detailList'),
        closeBtn: document.getElementById('closeDetailBtn')
    },
    deleteModal: {
        el: document.getElementById('deleteModal'),
        btnSingle: document.getElementById('btnDeleteSingle'),
        btnAll: document.getElementById('btnDeleteAll'),
        btnCancel: document.getElementById('btnCancelDelete')
    },
    addForm: {
        form: document.getElementById('addOptionForm'),
        inputs: {
            name: document.getElementById('taskName'),
            isRecurringRadios: document.querySelectorAll('input[name="isRecurring"]'),
            recurrenceGroup: document.getElementById('recurringOptions'),
            recurrenceType: document.getElementById('recurrenceType'),
            recurrenceInterval: document.getElementById('recurrenceInterval'),
            recurrenceStartDate: document.getElementById('recurrenceStartDate'),
            dateGroup: document.getElementById('dateOptions'),
            dateInput: document.getElementById('taskDate'),
            time: document.getElementById('taskTime'),
            // New inputs
            isTimeRange: document.getElementById('isTimeRange'),
            endTimeGroup: document.getElementById('endTimeGroup'),
            endTime: document.getElementById('taskEndTime'),

            importance: document.getElementById('importance'),
            isMission: document.getElementById('isMission'),
            isPersistent: document.getElementById('isPersistent'),
            score: document.getElementById('score'),
            cancelBtn: document.getElementById('cancelAddBtn')
        }
    },
    editModal: {
        el: document.getElementById('editModal'),
        form: document.getElementById('editForm'),
        name: document.getElementById('editName'),
        time: document.getElementById('editTime'),
        endTime: document.getElementById('editEndTime'),
        score: document.getElementById('editScore'),
        taskId: document.getElementById('editTaskId'),
        taskDate: document.getElementById('editTaskDate'),
        originalDate: document.getElementById('editOriginalDate'),
        isMission: document.getElementById('editIsMission'),
        isPersistent: document.getElementById('editIsPersistent'),
        closeBtn: document.getElementById('closeEditBtn'),
        cancelBtn: document.getElementById('cancelEditBtn')
    },
    editScopeModal: {
        el: document.getElementById('editScopeModal'),
        btnSingle: document.getElementById('btnEditSingle'),
        btnFuture: document.getElementById('btnEditFuture'),
        btnCancel: document.getElementById('btnCancelEditScope')
    },
    data: {
        view: document.getElementById('dataView'),
        navBtn: document.getElementById('navDataBtn'),
        headerBackBtn: document.getElementById('backFromDataBtn'),
        bottomBackBtn: document.getElementById('bottomBackFromDataBtn'),
        dateLabel: document.getElementById('dataDateLabel'),
        totalChange: document.getElementById('dataTotalChange'),
        tableContainer: document.getElementById('dataTableContainer'),
        yesterdayBtn: document.getElementById('dataYesterdayBtn'),
        todayBtn: document.getElementById('dataTodayBtn'),
        resetBtn: document.getElementById('resetStockBtn')
    },
    accounting: {
        totalBalance: document.getElementById('totalBalance'),
        monthExpense: document.getElementById('monthExpense'),
        backBtn: document.getElementById('backFromAccountingBtn'),
        openEntryBtn: document.getElementById('openAccountingEntryBtn'),
        openSettingsBtn: document.getElementById('openAccountingSettingsBtn'),
        incomeCard: document.getElementById('incomeCard'),
        expenseCard: document.getElementById('expenseCard'),
        // Entry Modal
        entryModal: {
            el: document.getElementById('accountingEntryModal'),
            form: document.getElementById('accountingEntryForm'),
            amount: document.getElementById('accAmount'),
            category: document.getElementById('accCategory'),
            manualName: document.getElementById('accManualName'),
            customNameGroup: document.getElementById('accCustomNameGroup'),
            customName: document.getElementById('accCustomName'),
            bank: document.getElementById('accBank'),
            date: document.getElementById('accDate'),
            closeBtn: document.getElementById('closeAccountingEntryBtn'),
            cancelBtn: document.getElementById('cancelAccEntryBtn')
        },
        // Settings Modal
        settingsModal: {
            el: document.getElementById('accountingSettingsModal'),
            bankList: document.getElementById('bankList'),
            categoryList: document.getElementById('categoryList'),
            addBankBtn: document.getElementById('addBankBtn'),
            addCategoryBtn: document.getElementById('addCategoryBtn'),
            closeBtn: document.getElementById('closeAccSettingsBtn'),
            closeBottomBtn: document.getElementById('closeAccSettingsBottomBtn')
        },
        // Detail Modals
        bankModal: {
            el: document.getElementById('accountingBankModal'),
            bankBalanceList: document.getElementById('bankBalanceList'),
            incomeHistoryList: document.getElementById('incomeHistoryList'),
            closeBtn: document.getElementById('closeAccBankBtn')
        },
        expenseModal: {
            el: document.getElementById('accountingExpenseModal'),
            calendarGrid: document.getElementById('accCalendarGrid'),
            monthLabel: document.getElementById('currentAccMonthLabel'),
            prevBtn: document.getElementById('prevAccMonthBtn'),
            nextBtn: document.getElementById('nextAccMonthBtn'),
            dayDetail: document.getElementById('accDayDetail'),
            dayLabel: document.getElementById('accDayLabel'),
            dayList: document.getElementById('accDayList'),
            closeBtn: document.getElementById('closeAccExpenseBtn')
        },
        charts: {
            lineCanvas: document.getElementById('accountingLineChart'),
            pieCanvas: document.getElementById('accountingPieChart'),
            pieLegend: document.getElementById('pieLegend')
        }
    }
};

// --- Initialization ---
function init() {
    console.log("Initializing App...");
    try {
        // 1. Load from localStorage FIRST (Immediate recovery)
        const localData = localStorage.getItem('me-inc-state');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                state = { ...defaultState, ...parsed };
                console.log("State loaded from localStorage.");
            } catch (e) {
                console.error("Local Storage Parse Error:", e);
                state = defaultState;
            }
        } else {
            state = defaultState;
        }

        // 2. Validate State immediately to prevent startup crashes from bad data
        validateAndRepairState();

        setupEventListeners();
        setupEditListeners();
        setupAccountingListeners();
        setupGanttListeners(); // Integrated directly

        // Auto-refresh (every minute)
        setInterval(() => {
            if (currentView === 'start') {
                try {
                    renderStartPage();
                } catch (e) {
                    console.error("Auto-refresh error:", e);
                }
            }
        }, 60000);

        // Check immediate penalties every minute
        setInterval(() => {
            try {
                checkImmediatePenalties();
            } catch (e) { console.error("Penalty check error:", e); }
        }, 60000);

        // Initial check for weeklyStartDay to prevent navigation crashes
        if (!weeklyStartDay) {
            const now = new Date();
            const day = now.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diff);
            weeklyStartDay = monday;
        }

        // Start Cloud Sync
        setupCloudSync();

        // Render immediate view with local data
        renderView(currentView || 'start');
    } catch (error) {
        console.error("Initialization Error:", error);
        alert("應用程式啟動失敗，請重新整理頁面。錯誤：" + error.message);
    }
}

function validateAndRepairState() {
    try {
        if (!state) state = defaultState;
        if (!state.tasks) state.tasks = [];
        if (!state.history) state.history = [];
        if (!state.accounting) state.accounting = { transactions: [], banks: [], categories: [] };
        if (!state.ganttSystem) state.ganttSystem = { projects: [] };

        // Ensure Accounting Arrays
        if (!state.accounting.transactions) state.accounting.transactions = [];
        if (!state.accounting.banks) state.accounting.banks = [{ id: 1, name: '現金', balance: 0 }];
        if (!state.accounting.categories) state.accounting.categories = [{ id: 1, name: '預設' }];

        // Ensure Gantt Arrays
        if (!state.ganttSystem.projects) state.ganttSystem.projects = [];

        // Fix potential Gantt structure issues
        state.ganttSystem.projects.forEach(p => {
            if (!p.parents) p.parents = [];
            p.parents.forEach(parent => {
                if (!parent.children) parent.children = [];
            });
        });

        console.log("State validated and repaired.");
    } catch (e) {
        console.error("State Validation Error:", e);
        // Fallback to default if totally broken
        state = defaultState;
    }
}

function setupCloudSync() {
    // Listen to changes in 'state' document
    try {
        if (!db) throw new Error("Firebase DB not initialized");

        db.collection('data').doc('state').onSnapshot((doc) => {
            try {
                if (doc.exists) {
                    console.log("Cloud data received");
                    const cloudData = doc.data();

                    // --- NEW: Sync Conflict Resolution ---
                    // If local data is significantly newer (or cloud is missing key fields), be careful
                    const localUpdated = state.updatedAt || 0;
                    const cloudUpdated = cloudData.updatedAt || 0;

                    // --- CRITICAL SAFETY CHECK ---
                    // Only push local update if we have actual data, or if we've already confirmed cloud is empty.
                    // If local is empty and cloud has data, WE MUST PREFER CLOUD even if timestamp is older (recovery mode)
                    const localHasData = (state.tasks && state.tasks.length > 0) || (state.ganttSystem && state.ganttSystem.projects && state.ganttSystem.projects.length > 0);
                    const cloudHasData = (cloudData.tasks && cloudData.tasks.length > 0) || (cloudData.ganttSystem && cloudData.ganttSystem.projects && cloudData.ganttSystem.projects.length > 0);

                    if (cloudUpdated < localUpdated && !isInitialSyncDone) {
                        if (!localHasData && cloudHasData) {
                            console.warn("Local is empty but Cloud has data. Preferring Cloud to avoid data loss.");
                            // Continue to merge cloud into local
                        } else {
                            console.log("Cloud data is older than local, pushing local update to cloud.");
                            isCloudSyncStarted = true;
                            isInitialSyncDone = true;
                            saveState("InitialSync_LocalNewer");
                            return;
                        }
                    }

                    // Deep merge or specific field merge is safer than spread
                    // For now, update global state but keep non-serializable UI state
                    state = { ...defaultState, ...cloudData };

                    // Validate integrity after merge
                    validateAndRepairState();

                    // Save to local storage as catch-up
                    localStorage.setItem('me-inc-state', JSON.stringify(state));

                    isCloudSyncStarted = true;
                    if (!isInitialSyncDone) {
                        isInitialSyncDone = true;
                        console.log("Initial Cloud Sync Done.");
                    }
                } else {
                    console.log("No cloud data, permitted to sync and save default.");
                    isCloudSyncStarted = true;
                    isInitialSyncDone = true;
                    saveState("CloudDataEmpty");
                }

                // After data updates, check logic and render
                checkDailyPenaltiesOnLoad();
                checkImmediatePenalties();

                // --- NEW: Data Fix (Run once) ---
                fixDataAnomalies();

                // --- NEW: Automatic Cleanup ---
                runAutomaticCleanup();

                renderView(currentView || 'start');
                updateSyncIndicator("Synced");
                updateDebugInfo(); // Update diagnostic info on sync

                // Check and perform daily backup after initial sync
                if (isInitialSyncDone) {
                    checkAndPerformDailyBackup().catch(err => {
                        console.error('Daily backup check failed:', err);
                    });
                }
            } catch (innerErr) {
                console.error("Error processing cloud data:", innerErr);
                updateSyncIndicator("Error");
            }
        }, (error) => {
            console.error("Sync error:", error);
            updateSyncIndicator("Offline");
        });
    } catch (e) {
        console.warn("Cloud Sync Setup Failed (Offline Mode):", e);
        updateSyncIndicator("Offline");
    }
}

let isInitialSyncDone = false;
function updateSyncIndicator(status) {
    const el = document.getElementById('syncStatusIndicator');
    if (!el) return;
    el.classList.remove('sync-synced', 'sync-error', 'sync-offline', 'sync-loading');

    switch (status) {
        case 'Synced':
            el.textContent = '● 已同步層 (雲端)';
            el.className = 'sync-indicator sync-synced';
            break;
        case 'Offline':
            el.textContent = '○ 離線模式';
            el.className = 'sync-indicator sync-offline';
            break;
        case 'Error':
            el.textContent = '⚠ 同步異常';
            el.className = 'sync-indicator sync-error';
            break;
        case 'Loading':
            el.textContent = '◌ 同步中...';
            el.className = 'sync-indicator sync-loading';
            break;
    }

    // Also update data view sync status if available
    if (typeof updateDataSyncStatus === 'function') {
        updateDataSyncStatus(status);
    }
}

function saveState(reason = "Unknown") {
    // Save to LocalStorage immediately (Safety First)
    state.updatedAt = Date.now();
    try {
        localStorage.setItem('me-inc-state', JSON.stringify(state));
        console.log(`State cached to LocalStorage (${reason})`);
    } catch (e) {
        console.error("LocalStorage Save Failed:", e);
    }

    if (!isCloudSyncStarted) {
        console.warn(`Cloud Save blocked (${reason}): Sync not yet started.`);
        return;
    }

    console.log(`Saving state to cloud due to: ${reason}`);

    // Save to Firestore
    db.collection('data').doc('state').set(state)
        .then(() => {
            console.log(`State saved to Cloud (${reason}) ` + new Date(state.updatedAt).toLocaleTimeString());
            updateSyncIndicator("Synced");
        })
        .catch((e) => {
            console.error("Cloud Save failed", e);
            updateSyncIndicator("Error");
            // Don't alert on mobile to avoid blocking UI, console is enough
        });
}


function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Debug: Check if elements exist
    if (!els.nav.addBtn) console.error("MISSING: nav.addBtn");
    if (!els.nav.scheduleBtn) console.error("MISSING: nav.scheduleBtn");
    if (!els.nav.accountingBtn) console.error("MISSING: nav.accountingBtn");
    if (!els.nav.ganttBtn) console.error("MISSING: nav.ganttBtn");

    if (els.nav.addBtn) {
        els.nav.addBtn.onclick = () => {
            console.log("Clicked: Add Button");
            renderView('add');
        };
    }
    if (els.nav.scheduleBtn) {
        els.nav.scheduleBtn.onclick = () => {
            console.log("Clicked: Schedule Button");
            renderView('schedule');
        };
    }
    // ...


    if (els.dashboard.searchBtn) {
        els.dashboard.searchBtn.onclick = () => {
            const dateVal = els.dashboard.searchInput.value;
            if (!dateVal) return alert('請選擇日期');
            const tasks = getTasksForDate(dateVal);
            showDetailModal(dateVal, tasks);
        };
    }

    if (els.backBtns.fromAdd) els.backBtns.fromAdd.onclick = () => renderView('start');
    if (els.backBtns.fromSchedule) els.backBtns.fromSchedule.onclick = () => renderView('start');
    if (els.backBtns.fromGantt) els.backBtns.fromGantt.onclick = () => renderView('start');
    if (els.nav.weeklyPrevBtn) els.nav.weeklyPrevBtn.onclick = () => {
        if (!weeklyStartDay) return;
        weeklyStartDay.setDate(weeklyStartDay.getDate() - 7);
        renderWeeklySchedule();
    };
    if (els.nav.weeklyNextBtn) els.nav.weeklyNextBtn.onclick = () => {
        if (!weeklyStartDay) return;
        weeklyStartDay.setDate(weeklyStartDay.getDate() + 7);
        renderWeeklySchedule();
    };
    if (els.nav.cancelMoveBtn) els.nav.cancelMoveBtn.onclick = cancelMove;
    if (els.data.headerBackBtn) els.data.headerBackBtn.onclick = () => renderView('start');
    if (els.data.bottomBackBtn) els.data.bottomBackBtn.onclick = () => renderView('start');
    if (els.data.navBtn) els.data.navBtn.onclick = () => {
        dataViewDate = 'yesterday';
        renderView('data');
    };
    if (els.data.yesterdayBtn) els.data.yesterdayBtn.onclick = () => {
        dataViewDate = 'yesterday';
        renderDataView();
    };
    if (els.data.todayBtn) els.data.todayBtn.onclick = () => {
        dataViewDate = 'today';
        renderDataView();
    };
    if (els.data.resetBtn) els.data.resetBtn.onclick = resetStockPrice;
    if (els.nav.accountingBtn) els.nav.accountingBtn.onclick = () => renderView('accounting');

    // Edit Modal Form Submit Handler
    if (els.editModal && els.editModal.form) {
        els.editModal.form.onsubmit = function (e) {
            e.preventDefault();

            const taskId = parseInt(els.editModal.taskId.value);
            const taskDate = els.editModal.taskDate.value;
            const newName = els.editModal.name.value.trim();
            const newTime = els.editModal.time.value;
            const newEndTime = els.editModal.endTime.value;
            const newScore = parseInt(els.editModal.score.value) || 0;

            // Find the task object
            const task = state.tasks.find(t => t.id === taskId);

            if (!task) {
                alert('任務未找到');
                els.editModal.el.classList.add('hidden');
                return;
            }

            // Handle recurring tasks with exceptions
            if (task.type === 'recurring') {
                if (!task.exceptions) task.exceptions = {};
                task.exceptions[taskDate] = {
                    name: newName,
                    time: newTime,
                    endTime: newEndTime,
                    score: newScore
                };
            } else {
                // Update regular scheduled task
                task.name = newName;
                task.time = newTime;
                task.endTime = newEndTime;
                task.score = newScore;

                // Handle date change if applicable
                if (task.date && task.date !== taskDate) {
                    task.date = taskDate;
                }
            }

            // Save state to cloud
            saveState('EditTask');

            // Close modal
            els.editModal.el.classList.add('hidden');

            // Refresh current view
            if (currentView === 'start') {
                renderStartPage();
            } else if (currentView === 'focusedGantt') {
                renderWeeklySchedule();
            }
        };

        // Close button handler
        if (els.editModal.closeBtn) {
            els.editModal.closeBtn.onclick = () => {
                els.editModal.el.classList.add('hidden');
            };
        }

        // Cancel button handler
        if (els.editModal.cancelBtn) {
            els.editModal.cancelBtn.onclick = () => {
                els.editModal.el.classList.add('hidden');
            };
        }
    }

    // Local Export/Import Buttons will be bound in DOMContentLoaded

    // Smart Search Logic
    if (els.dashboard.searchBtn) {
        els.dashboard.searchBtn.onclick = () => {
            const input = els.dashboard.searchInput.value.trim();
            if (!input) return alert('請輸入日期或關鍵字');

            // 1. Date Check (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(input)) {
                // Specific Date -> Show Detail Modal
                const tasks = getTasksForDate(input);
                showDetailModal(input, tasks);
            } else {
                // 2. Keyword Search -> Nearest 3 Items
                const allTasks = [];
                // Collect all instances (Regular + Gantt Leaf) for basic search
                // Simplification: Search main state.tasks + Gantt leaves.
                // Since Gantt leaves are complex to flatten with *dates*, we'll search project structure?
                // Request says: "2/8 剪指甲..." implies it searches Scheduled tasks mainly.
                // Let's search state.tasks first.

                // Helper to get next occurrence of a task relative to Today
                const todayStr = getLocalDateStr();

                const candidates = [];

                state.tasks.forEach(task => {
                    if (task.name.includes(input)) {
                        // Determine occurrence date
                        let targetDate = null;
                        if (task.type === 'scheduled') targetDate = task.date;
                        else if (task.type === 'recurring') {
                            // Find next occurrence from Today
                            // Simple iterator? Limit to 365 days scan?
                            let scanDate = new Date();
                            for (let i = 0; i < 365; i++) {
                                const dStr = getLocalDateStr(scanDate);
                                if (getTasksForDate(dStr).find(t => t.id === task.id)) {
                                    targetDate = dStr;
                                    break;
                                }
                                scanDate.setDate(scanDate.getDate() + 1);
                            }
                        }

                        // Bad Habit? Persistent?
                        if (task.isBadHabit || task.isPersistent) targetDate = todayStr; // Treat as "Today"

                        if (targetDate && targetDate >= todayStr) {
                            candidates.push({ task, date: targetDate });
                        }
                    }
                });

                // Search Gantt
                if (state.ganttSystem && state.ganttSystem.projects) {
                    state.ganttSystem.projects.forEach(proj => {
                        proj.parents.forEach(parent => {
                            const checkItem = (item) => {
                                if (item.name.includes(input)) {
                                    if (!item.completed && item.endDate >= todayStr) {
                                        // For Gantt, Use EndDate as reference? Or start? 
                                        // "2/8 剪指甲" -> Date is execution date. Gantt item has range.
                                        // Use startDate or nearest date in range? Let's use startDate if future, else Today if in range.
                                        let d = item.startDate;
                                        if (todayStr >= item.startDate && todayStr <= item.endDate) d = todayStr;
                                        if (d >= todayStr) candidates.push({ task: item, date: d, isGantt: true });
                                    }
                                }
                                if (item.children) item.children.forEach(checkItem);
                            };
                            checkItem(parent);
                        });
                    });
                }

                // Sort by Date (Nearest first)
                candidates.sort((a, b) => a.date.localeCompare(b.date));

                // Take top 3
                const results = candidates.slice(0, 3);

                if (results.length === 0) return alert('找不到相關項目 (僅搜尋今日及未來)');

                // Show Result Modal (Reuse DetailModal? Or a custom list?)
                // Reuse DetailModal with custom title? DetailModal expects DateStr.
                // Let's verify instructions: "出現離今日最近的3項項目與日期"
                // Alert or List? Let's use a simple Alert for now, or build a custom ephemeral list in DetailModal.
                // Better: Show DetailModal with a "Search Results" pseudo-date title?
                // But DetailModal renders specific tasks.
                // Let's create a temporary view in the Detail Modal manually.

                const list = els.modal.list;
                list.innerHTML = '';
                els.modal.label.textContent = `搜尋: "${input}" (最近3筆)`;

                results.forEach(res => {
                    // Create simple visual item
                    const div = document.createElement('div');
                    div.className = 'task-item'; // Reuse style
                    div.style.background = 'var(--bg-secondary)';
                    div.style.cursor = 'pointer'; // Indicate clickability

                    // Navigation Action
                    const goToDetail = (e) => {
                        if (e) e.stopPropagation(); // Prevent double trigger if button inside div
                        const dailyTasks = getTasksForDate(res.date);
                        // Ensure Gantt item is visible
                        if (res.isGantt) {
                            if (!dailyTasks.some(t => t.id === res.task.id)) {
                                dailyTasks.push(res.task);
                            }
                        }
                        showDetailModal(res.date, dailyTasks);
                    };

                    div.innerHTML = `
                        <div class="task-info">
                             <div class="task-name">
                                <span style="color:var(--accent-blue); margin-right:8px;">${res.date}</span>
                                ${res.task.name}
                             </div>
                             <div class="task-meta">
                                ${res.isGantt ? '[甘特圖]' : '[行程]'}
                             </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn-icon-small" title="查看當日行程" style="width:auto; padding:0 8px;">
                                ➡️ 前往
                            </button>
                        </div>
                    `;

                    div.onclick = goToDetail;
                    const btn = div.querySelector('button');
                    if (btn) btn.onclick = goToDetail;

                    list.appendChild(div);
                });

                els.modal.el.classList.remove('hidden');
            }
        };
    }

    // Chart Click Navigation
    const ctxGantt = document.getElementById('ganttChart');
    if (ctxGantt) {
        ctxGantt.onclick = () => renderView('focusedGantt');
    }


    // Add Form Toggles
    els.addForm.inputs.isRecurringRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'yes') {
                els.addForm.inputs.recurrenceGroup.classList.remove('hidden');
                els.addForm.inputs.dateGroup.classList.add('hidden');
                // Default Start Date to Today if empty
                if (!els.addForm.inputs.recurrenceStartDate.value) {
                    els.addForm.inputs.recurrenceStartDate.value = getLocalDateStr();
                }
            } else {
                els.addForm.inputs.recurrenceGroup.classList.add('hidden');
                els.addForm.inputs.dateGroup.classList.remove('hidden');
            }
        });
    });

    if (els.addForm.form) els.addForm.form.addEventListener('submit', handleAddSubmit);

    if (els.addForm.inputs.cancelBtn) {
        els.addForm.inputs.cancelBtn.onclick = () => {
            renderView('start');
        };
    }

    // Edit Form Recurrence Toggle
    const editRecurrenceCheckbox = document.getElementById('editIsRecurring');
    const editRecurrenceOptions = document.getElementById('editRecurringOptions');

    // Edit Form Recurrence Toggle
    if (editRecurrenceCheckbox && editRecurrenceOptions) {
        editRecurrenceCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                editRecurrenceOptions.classList.remove('hidden');
            } else {
                editRecurrenceOptions.classList.add('hidden');
            }
        });
    }

    // Time Range Toggle
    if (els.addForm.inputs.isTimeRange) {
        els.addForm.inputs.isTimeRange.onchange = (e) => {
            if (e.target.checked) {
                els.addForm.inputs.endTimeGroup.classList.remove('hidden');
            } else {
                els.addForm.inputs.endTimeGroup.classList.add('hidden');
            }
        };
    }

    // Recurrence Type Toggle (Weekdays)
    if (els.addForm.inputs.recurrenceType) {
        els.addForm.inputs.recurrenceType.addEventListener('change', (e) => {
            const daysDiv = document.getElementById('recurrenceWeekDays');
            if (e.target.value === 'weekly') {
                daysDiv.classList.remove('hidden');
            } else {
                daysDiv.classList.add('hidden');
            }
        });
    }

    // Calendar
    if (els.calendar.prevBtn) els.calendar.prevBtn.onclick = () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar(currentMonth);
    };
    if (els.calendar.nextBtn) els.calendar.nextBtn.onclick = () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar(currentMonth);
    };

    // Modal
    if (els.modal.closeBtn) els.modal.closeBtn.onclick = () => els.modal.el.classList.add('hidden');
    window.onclick = (e) => {
        if (els.modal.el && e.target === els.modal.el) els.modal.el.classList.add('hidden');
    };
}

// --- Automatic Cleanup Logic ---
// --- Automatic Cleanup Logic ---
function runAutomaticCleanup() {
    let hasChanges = false;
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    // 1. Cleanup Calendar Tasks (Completed > 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = getLocalDateStr(thirtyDaysAgo);

    const initialTaskCount = state.tasks.length;
    state.tasks = state.tasks.filter(t => {
        // If mission and not complete, keep
        if (t.isMission) {
            const doneDates = t.completedHistory ? Object.keys(t.completedHistory) : [];
            if (doneDates.length === 0) return true;
        }

        if (t.type === 'scheduled' && t.completedHistory) {
            // Scheduled tasks usually have one completion date
            const doneDates = Object.keys(t.completedHistory);
            if (doneDates.length > 0) {
                // Check if the latest completion is old
                const lastDone = doneDates.sort().pop();
                if (lastDone < thirtyDaysAgoStr) return false; // Delete
            }
        }
        return true;
    });

    if (state.tasks.length !== initialTaskCount) hasChanges = true;

    // 2. Cleanup Gantt Projects (Completed > 30 days)
    if (state.ganttSystem && state.ganttSystem.projects) {
        const initialProjCount = state.ganttSystem.projects.length;
        state.ganttSystem.projects = state.ganttSystem.projects.filter(p => {
            if (p.completed && p.endDate < thirtyDaysAgoStr) return false;
            return true;
        });
        if (state.ganttSystem.projects.length !== initialProjCount) hasChanges = true;
    }

    // 3. Cleanup Accounting (Transaction > 60 days)
    // And aggregate to historical expenses
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const sixtyDaysAgoStr = getLocalDateStr(sixtyDaysAgo);

    // Initialize historical if missing
    if (!state.accounting.historicalExpenses) state.accounting.historicalExpenses = {};

    const keepTransactions = [];
    state.accounting.transactions.forEach(t => {
        if (t.date < sixtyDaysAgoStr) {
            // It's old. Is it an expense?
            if (t.amount < 0) {
                // Aggregate
                const monthKey = t.month || t.date.slice(0, 7); // Use date YYYY-MM
                state.accounting.historicalExpenses[monthKey] = (state.accounting.historicalExpenses[monthKey] || 0) + Math.abs(t.amount);
            }
            // Drop it (change detected)
            hasChanges = true;
        } else {
            keepTransactions.push(t);
        }
    });

    // Only update if changes were flagged logic-wise above
    if (keepTransactions.length !== state.accounting.transactions.length) {
        state.accounting.transactions = keepTransactions;
        hasChanges = true;
    }

    if (hasChanges) {
        console.log("Automatic cleanup performed, saving state...");
        saveState();
    }
}

// --- Penalty Logic ---
// --- Penalty Logic ---
function checkDailyPenaltiesOnLoad() {
    let hasChanges = false;

    if (!state.lastLoginDate) {
        state.lastLoginDate = getLocalDateStr();
        saveState(); // Must save if first run
        return;
    }
    const todayStr = getLocalDateStr();
    const lastLogin = state.lastLoginDate;

    // Optimization: If already checked today, skip loop
    if (lastLogin !== todayStr) {
        let curr = new Date(lastLogin);
        const end = new Date(todayStr);

        while (curr < end) {
            const dStr = getLocalDateStr(curr);
            const tasks = getTasksForDate(dStr);
            tasks.forEach(task => {
                // Apply penalty if ANY Task is not completed and has score
                if (task.score > 0 && !task.isPersistent) { // Skip persistent tasks
                    if (!task.penaltyHistory) task.penaltyHistory = {};
                    const isCompleted = task.completedHistory && task.completedHistory[dStr];

                    if (!isCompleted && !task.penaltyHistory[dStr]) {
                        state.stockPrice -= task.score;
                        task.penaltyHistory[dStr] = true;
                        hasChanges = true;
                    }
                }
            });
            curr.setDate(curr.getDate() + 1);
        }

        state.lastLoginDate = todayStr;
        hasChanges = true;
    } else {
        // Even if same day, we might want to check current tasks for IMMEDIATE penalties?
        // No, this function is "OnLoad" (Catch up for past days).
        // Immediate penalties are handled by 'checkImmediatePenalties' interval.
    }

    // Gantt Project Penalties (Check if any project became overdue since last check)
    // Gantt Penalties (Two-Layer: Project + Children)
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            // Skip if project is paused
            if (proj.isPaused) return;

            // 1. Project Overall Penalty
            if (!proj.completed && todayStr > proj.endDate && !proj.penaltyApplied) {
                state.stockPrice -= proj.score;

                // Record History for Data View
                if (!proj.penaltyHistory) proj.penaltyHistory = {};
                proj.penaltyHistory[todayStr] = true;
                proj.penaltyApplied = true;

                console.log(`Penalty applied for project: ${proj.name} (Project Overdue)`);
                hasChanges = true;
            }

            // 2. Child Item Penalties
            // Helper to traverse and check leaf nodes
            const checkChildren = (items) => {
                items.forEach(item => {
                    if (item.children && item.children.length > 0) {
                        checkChildren(item.children);
                    } else {
                        // Leaf node
                        if (!item.completed && todayStr > item.endDate && !item.penaltyApplied) {
                            state.stockPrice -= item.score;

                            // Record History
                            if (!item.penaltyHistory) item.penaltyHistory = {};
                            item.penaltyHistory[todayStr] = true;
                            item.penaltyApplied = true;

                            console.log(`Penalty applied for Gantt item: ${item.name} (Item Overdue)`);
                            hasChanges = true;
                        }
                    }
                });
            };

            proj.parents.forEach(parent => {
                // Check parent itself
                if (!parent.completed && todayStr > parent.endDate && !parent.penaltyApplied) {
                    state.stockPrice -= parent.score;

                    if (!parent.penaltyHistory) parent.penaltyHistory = {};
                    parent.penaltyHistory[todayStr] = true;
                    parent.penaltyApplied = true;

                    console.log(`Penalty applied for Gantt parent: ${parent.name}`);
                    hasChanges = true;
                }

                // Check children recursively
                if (parent.children) checkChildren(parent.children);
            });
        });
    }

    if (hasChanges) {
        console.log("Penalties applied or new day detected, saving state...");
        saveState();
    }
}

// --- Immediate Penalty Check (Runs every minute) ---
function checkImmediatePenalties() {
    let hasChanges = false;
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const currentTimeStr = now.toTimeString().slice(0, 5);

    state.tasks.forEach(task => {
        // Critical Overdue Logic
        if (task.importance === 'critical' && task.time && task.score > 0 && !task.isPersistent) {
            let targetDate = null;
            if (task.type === 'recurring') {
                const tasksToday = getTasksForDate(todayStr);
                if (tasksToday.find(t => t.id === task.id)) targetDate = todayStr;
            } else if (task.date <= todayStr) {
                targetDate = task.date; // Scheduled
            }

            if (targetDate) {
                const isToday = targetDate === todayStr;
                const isPastDate = targetDate < todayStr;
                // Use EndTime if available, else StartTime
                const timeThreshold = task.endTime || task.time;
                const isTimeUp = isToday && currentTimeStr > timeThreshold;

                if (isPastDate || isTimeUp) {
                    if (!task.completedHistory) task.completedHistory = {};
                    if (!task.penaltyHistory) task.penaltyHistory = {};

                    const isCompleted = task.completedHistory[targetDate];
                    const isPenalized = task.penaltyHistory[targetDate];

                    if (!isCompleted && !isPenalized) {
                        state.stockPrice -= task.score;
                        task.penaltyHistory[targetDate] = true;
                        hasChanges = true; // Mark change
                        renderStartPage();
                    }
                }
            }
        }
    });

    if (hasChanges) {
        saveState("ImmediatePenaltyApplied");
    }
}

// --- View Rendering ---
const VIEW_MAP = {
    'start': renderStartPage,
    'schedule': () => renderCalendar(currentMonth),
    'focusedGantt': () => {
        if (!weeklyStartDay) {
            const now = new Date();
            const day = now.getDay();
            const diff = (day === 0 ? -6 : 1) - day;
            weeklyStartDay = new Date(now);
            weeklyStartDay.setDate(now.getDate() + diff);
        }
        renderWeeklySchedule();
    },
    'data': renderDataView,
    'accounting': renderAccountingView,
    'ganttMain': renderGanttMainPage,
    'add': () => { }, // No specific render fn
    'ganttAddProject': () => { },
    'ganttProjectDetail': () => { }
};

function renderView(viewName) {
    currentView = viewName;

    // Toggle Visibility
    Object.keys(els.views).forEach(key => {
        const el = els.views[key];
        if (el) el.classList.toggle('hidden', key !== viewName);
    });

    // Execute specific render logic
    if (VIEW_MAP[viewName]) VIEW_MAP[viewName]();
}

// --- Accounting Logic ---
function setupAccountingListeners() {
    const acc = els.accounting;

    if (acc.backBtn) acc.backBtn.onclick = () => renderView('start');
    if (acc.openEntryBtn) acc.openEntryBtn.onclick = () => {
        // Reset and show entry modal
        acc.entryModal.form.reset();
        acc.entryModal.date.value = getLocalDateStr();
        acc.entryModal.customNameGroup.classList.add('hidden');
        populateAccountingFormOptions();
        acc.entryModal.el.classList.remove('hidden');
    };

    if (acc.openSettingsBtn) acc.openSettingsBtn.onclick = () => {
        renderAccountingSettings();
        acc.settingsModal.el.classList.remove('hidden');
    };

    // Entry Modal
    if (acc.entryModal.closeBtn) acc.entryModal.closeBtn.onclick = () => acc.entryModal.el.classList.add('hidden');
    if (acc.entryModal.cancelBtn) acc.entryModal.cancelBtn.onclick = () => acc.entryModal.el.classList.add('hidden');
    if (acc.entryModal.category) {
        acc.entryModal.category.onchange = (e) => {
            if (e.target.value === 'custom') acc.entryModal.customNameGroup.classList.remove('hidden');
            else acc.entryModal.customNameGroup.classList.add('hidden');
        };
    }
    if (acc.entryModal.form) acc.entryModal.form.onsubmit = handleAccountingEntrySubmit;

    // Summary Cards Detail
    if (acc.incomeCard) acc.incomeCard.onclick = () => {
        renderAccountingBankDetail();
        acc.bankModal.el.classList.remove('hidden');
    };
    if (acc.expenseCard) acc.expenseCard.onclick = () => {
        currentAccMonth = new Date();
        renderAccountingExpenseCalendar();
        acc.expenseModal.el.classList.remove('hidden');
    };

    // Settings Modal
    if (acc.settingsModal.closeBtn) acc.settingsModal.closeBtn.onclick = () => acc.settingsModal.el.classList.add('hidden');
    if (acc.settingsModal.closeBottomBtn) acc.settingsModal.closeBottomBtn.onclick = () => acc.settingsModal.el.classList.add('hidden');
    if (acc.settingsModal.addBankBtn) acc.settingsModal.addBankBtn.onclick = addAccountingBank;
    if (acc.settingsModal.addCategoryBtn) acc.settingsModal.addCategoryBtn.onclick = addAccountingCategory;

    // Bank Modal
    if (acc.bankModal.closeBtn) acc.bankModal.closeBtn.onclick = () => acc.bankModal.el.classList.add('hidden');

    // Expense Modal
    if (acc.expenseModal.closeBtn) acc.expenseModal.closeBtn.onclick = () => acc.expenseModal.el.classList.add('hidden');
    if (acc.expenseModal.prevBtn) acc.expenseModal.prevBtn.onclick = () => {
        currentAccMonth.setMonth(currentAccMonth.getMonth() - 1);
        renderAccountingExpenseCalendar();
    };
    if (acc.expenseModal.nextBtn) acc.expenseModal.nextBtn.onclick = () => {
        currentAccMonth.setMonth(currentAccMonth.getMonth() + 1);
        renderAccountingExpenseCalendar();
    };
}

let currentAccMonth = new Date();
let accLineChartInstance = null;
let accPieChartInstance = null;

function populateAccountingFormOptions() {
    const categorySelect = els.accounting.entryModal.category;
    const bankSelect = els.accounting.entryModal.bank;

    if (categorySelect) {
        categorySelect.innerHTML = state.accounting.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        categorySelect.innerHTML += `<option value="custom">自訂</option>`;
    }

    if (bankSelect) {
        bankSelect.innerHTML = state.accounting.banks.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }
}

function handleAccountingEntrySubmit(e) {
    e.preventDefault();
    const acc = els.accounting.entryModal;
    try {
        const amount = parseFloat(acc.amount.value);
        let category = acc.category.value;
        if (category === 'custom') {
            category = acc.customName.value;
            if (!category) return alert('請輸入類別名稱');
        }
        const name = acc.manualName.value.trim();
        const bankId = parseInt(acc.bank.value);
        const date = acc.date.value;

        const transaction = {
            id: Date.now(),
            amount,
            category,
            name, // New field for optional item name
            bankId,
            date
        };

        // Update state
        state.accounting.transactions.push(transaction);
        const bank = state.accounting.banks.find(b => b.id == bankId);
        if (bank) bank.balance += amount;

        saveState();
        acc.el.classList.add('hidden');
        renderAccountingView();
    } catch (err) {
        console.error("Accounting Submit Error:", err);
        acc.el.classList.add('hidden'); // Guarantee modal closes
        alert("記帳失敗，請檢查輸入內容");
    }
}

function renderAccountingView() {
    // 1. Summary
    const totalBalance = state.accounting.banks.reduce((acc, bank) => acc + bank.balance, 0);
    if (els.accounting.totalBalance) els.accounting.totalBalance.textContent = totalBalance.toLocaleString();

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyExpenses = state.accounting.transactions
        .filter(t => t.amount < 0 && t.date.startsWith(monthStr))
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
    if (els.accounting.monthExpense) els.accounting.monthExpense.textContent = monthlyExpenses.toLocaleString();

    // 2. Charts
    renderAccountingCharts();
}

function renderAccountingCharts() {
    try {
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js not loaded.");
            return;
        }

        const lineCanvas = els.accounting.charts.lineCanvas;
        const pieCanvas = els.accounting.charts.pieCanvas;

        if (!lineCanvas || !pieCanvas) return;

        // Reset instances
        if (accLineChartInstance) accLineChartInstance.destroy();
        if (accPieChartInstance) accPieChartInstance.destroy();

        // --- Line Chart: Balance Trend (Last 7 days) ---
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(getLocalDateStr(d));
        }

        let cumulative = state.accounting.banks.reduce((acc, b) => acc + b.balance, 0);
        const trendData = [];
        const reversedDays = [...last7Days].reverse();
        reversedDays.forEach(day => {
            trendData.unshift(cumulative);
            const dayChange = state.accounting.transactions
                .filter(t => t.date === day)
                .reduce((acc, t) => acc + t.amount, 0);
            cumulative -= dayChange; // step back
        });

        accLineChartInstance = new Chart(lineCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: last7Days.map(d => d.slice(5)),
                datasets: [{
                    label: '總額',
                    data: trendData,
                    borderColor: '#3b82f6',
                    tension: 0.3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });

        // --- Pie Chart: Expenses by Category (Current Month) ---
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthlyTransactions = state.accounting.transactions.filter(t => t.amount < 0 && t.date.startsWith(monthStr));

        const categoryTotals = {};
        monthlyTransactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        // Default if no data
        if (labels.length === 0) {
            labels.push('無支出');
            data.push(1);
        }

        const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

        accPieChartInstance = new Chart(pieCanvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });

        // Custom Legend
        const legendEl = els.accounting.charts.pieLegend;
        if (legendEl) {
            legendEl.innerHTML = labels.map((label, i) => `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${colors[i % colors.length]}"></div>
                    <span class="legend-label">${label}</span>
                    <span class="legend-amount">${categoryTotals[label] ? categoryTotals[label].toLocaleString() : '-'}</span>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Render Accounting Charts Failed:", e);
    }
}

function renderAccountingSettings() {
    const bankList = els.accounting.settingsModal.bankList;
    const catList = els.accounting.settingsModal.categoryList;

    if (bankList) {
        bankList.innerHTML = state.accounting.banks.map(bank => `
            <div class="settings-item">
                <span>${bank.name} (餘額: ${bank.balance})</span>
                <div class="actions">
                    <button onclick="adjustBankBalance(${bank.id})" class="btn-icon-small">⚙️</button>
                    <button onclick="removeBank(${bank.id})" class="btn-icon-small">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    if (catList) {
        catList.innerHTML = state.accounting.categories.map(cat => `
            <div class="settings-item">
                <span>${cat.name}</span>
                <div class="actions">
                    <button onclick="removeCategory(${cat.id})" class="btn-icon-small">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

function addAccountingBank() {
    const name = prompt('請輸入銀行名稱:');
    if (!name) return;
    const balance = parseFloat(prompt('請輸入初始餘額:', '0')) || 0;
    state.accounting.banks.push({ id: Date.now(), name, balance });
    saveState();
    renderAccountingSettings();
}

function adjustBankBalance(id) {
    const bank = state.accounting.banks.find(b => b.id == id);
    if (!bank) return;
    const newBalance = parseFloat(prompt(`強制調整 [${bank.name}] 餘額為:`, bank.balance.toString()));
    if (isNaN(newBalance)) return;
    bank.balance = newBalance;
    saveState();
    renderAccountingSettings();
    renderAccountingView();
}

function removeBank(id) {
    if (confirm('確定要移除此銀行嗎？這將不會調整相關交易紀錄，但會導致餘額統計不準確。')) {
        state.accounting.banks = state.accounting.banks.filter(b => b.id !== id);
        saveState();
        renderAccountingSettings();
    }
}

function addAccountingCategory() {
    const name = prompt('請輸入新項目類別名稱:');
    if (!name) return;
    state.accounting.categories.push({ id: Date.now(), name });
    saveState();
    renderAccountingSettings();
}

function removeCategory(id) {
    state.accounting.categories = state.accounting.categories.filter(c => c.id !== id);
    saveState();
    renderAccountingSettings();
}

function renderAccountingBankDetail() {
    const bankList = els.accounting.bankModal.bankBalanceList;
    const incomeList = els.accounting.bankModal.incomeHistoryList;

    if (bankList) {
        bankList.innerHTML = state.accounting.banks.map(bank => `
            <div class="task-item" style="justify-content: space-between;">
                <span>${bank.name}</span>
                <span style="font-family:monospace; font-weight:700;">${bank.balance.toLocaleString()}</span>
            </div>
        `).join('');
    }

    if (incomeList) {
        const incomes = state.accounting.transactions.filter(t => t.amount > 0).sort((a, b) => b.date.localeCompare(a.date));
        incomeList.innerHTML = incomes.map(t => {
            const displayName = t.name ? `${t.name} <span style="font-size:0.75rem; color:gray; font-weight:normal;">(${t.category})</span>` : t.category;
            return `
                <div class="task-item" style="justify-content: space-between;">
                    <div>
                        <div style="font-size:0.9rem; font-weight:600;">${displayName}</div>
                        <div style="font-size:0.75rem; color:gray;">${t.date}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="color:var(--accent-green); font-weight:700;">+${t.amount.toLocaleString()}</span>
                        <button onclick="editAccountingTransaction(${t.id})" class="btn-icon-small">✏️</button>
                        <button onclick="removeAccountingTransaction(${t.id})" class="btn-icon-small">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderAccountingExpenseCalendar() {
    const ex = els.accounting.expenseModal;
    const year = currentAccMonth.getFullYear();
    const month = currentAccMonth.getMonth();

    if (ex.monthLabel) ex.monthLabel.textContent = `${year}年 ${month + 1}月`;
    ex.calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Headers
    ['日', '一', '二', '三', '四', '五', '六'].forEach(day => {
        const d = document.createElement('div');
        d.className = 'calendar-day-header';
        d.textContent = day;
        ex.calendarGrid.appendChild(d);
    });

    for (let i = 0; i < firstDay; i++) {
        ex.calendarGrid.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTotal = state.accounting.transactions
            .filter(t => t.date === dStr && t.amount < 0)
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.innerHTML = `<span class="day-number">${i}</span>`;
        if (dayTotal > 0) {
            const amountLabel = document.createElement('div');
            amountLabel.style.fontSize = '0.7rem';
            amountLabel.style.color = 'var(--accent-red)';
            amountLabel.textContent = dayTotal.toLocaleString();
            cell.appendChild(amountLabel);
        }

        cell.onclick = () => showAccountingDayDetail(dStr);
        ex.calendarGrid.appendChild(cell);
    }
}

function showAccountingDayDetail(dateStr) {
    const ex = els.accounting.expenseModal;
    ex.dayLabel.textContent = `${dateStr} 支出明細`;
    ex.dayDetail.classList.remove('hidden');

    const transactions = state.accounting.transactions.filter(t => t.date === dateStr && t.amount < 0);

    if (transactions.length === 0) {
        ex.dayList.innerHTML = '<div style="text-align:center; color:gray; padding:10px;">該日無支出紀錄</div>';
    } else {
        ex.dayList.innerHTML = transactions.map(t => {
            const displayName = t.name ? `${t.name} <span style="font-size:0.75rem; color:gray; font-weight:normal;">(${t.category})</span>` : t.category;
            return `
                <div class="task-item" style="justify-content: space-between;">
                    <div>
                        <div style="font-size:0.9rem; font-weight:600;">${displayName}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="color:var(--accent-red); font-weight:700;">${t.amount.toLocaleString()}</span>
                        <button onclick="editAccountingTransaction(${t.id})" class="btn-icon-small">✏️</button>
                        <button onclick="removeAccountingTransaction(${t.id})" class="btn-icon-small">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function removeAccountingTransaction(id) {
    if (!confirm('確定要刪除此筆紀錄嗎？相關銀行餘額將會退回。')) return;
    const t = state.accounting.transactions.find(x => x.id == id);
    if (!t) return;

    const bank = state.accounting.banks.find(b => b.id === t.bankId);
    if (bank) bank.balance -= t.amount; // Subtracting the amount (if it was negative, it adds back)

    state.accounting.transactions = state.accounting.transactions.filter(x => x.id !== id);
    saveState();
    renderAccountingView();
    renderAccountingExpenseCalendar();
    renderAccountingBankDetail(); // Added refresh
    els.accounting.expenseModal.dayDetail.classList.add('hidden');
}

function editAccountingTransaction(id) {
    const t = state.accounting.transactions.find(x => x.id == id);
    if (!t) return;

    const newName = prompt('修改項目名稱 (留空則不變):', t.name || '');
    const newAmount = prompt('修改金額為:', t.amount.toString());

    if (newAmount === null) return;
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum)) return alert('金額格式錯誤');

    const bank = state.accounting.banks.find(b => b.id == t.bankId);
    if (bank) bank.balance = bank.balance - t.amount + amountNum;

    t.name = newName !== null ? newName.trim() : (t.name || '');
    t.amount = amountNum;

    saveState();
    renderAccountingView();
    renderAccountingExpenseCalendar();
    renderAccountingBankDetail();
    // Keep detail view if open, or refresh it
    if (!els.accounting.expenseModal.dayDetail.classList.contains('hidden')) {
        showAccountingDayDetail(t.date);
    }
}

function resetStockPrice() {
    state.stockPrice = 100.00;
    state.history = [];
    saveState();
    renderView('start');
    alert('股價已重設為 100.00');
}

let dataViewDate = 'yesterday'; // 'yesterday' or 'today'

function renderDataView() {
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

    // Daily Tasks Calculation
    tasks.forEach(task => {
        const isCompleted = task.completedHistory && task.completedHistory[targetStr];
        const isPenalized = task.penaltyHistory && task.penaltyHistory[targetStr];
        if (isCompleted) totalChange += task.score;
        else if (isPenalized) totalChange -= task.score;
    });

    // Gantt Items Calculation (Project + Items)
    const activeGanttItems = [];
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            // Project Penalty
            if (proj.penaltyHistory && proj.penaltyHistory[targetStr]) {
                activeGanttItems.push({ type: 'project', name: proj.name, score: proj.score, isPenalized: true, obj: proj });
                totalChange -= proj.score;
            }

            // Traverse items
            const checkItem = (item) => {
                if (item.completedHistory && item.completedHistory[targetStr]) {
                    activeGanttItems.push({ type: 'item', name: item.name, score: item.score, isCompleted: true, obj: item });
                    // Calculate score with bonus logic if needed? 
                    // For now, use base score because tracking bonus historically is hard without logs.
                    // Adjust 'totalChange' approximately.
                    let gain = item.score;
                    if (item.importance === 'importance-dark-red') gain += 4;
                    else if (item.importance === 'importance-light-red') gain += 2;
                    totalChange += gain;
                } else if (item.penaltyHistory && item.penaltyHistory[targetStr]) {
                    activeGanttItems.push({ type: 'item', name: item.name, score: item.score, isPenalized: true, obj: item });
                    totalChange -= item.score;
                }
                if (item.children) item.children.forEach(checkItem);
            };
            proj.parents.forEach(p => checkItem(p));
        });
    }

    if (els.data.totalChange) {
        els.data.totalChange.textContent = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}`;
        els.data.totalChange.className = `price-value ${totalChange >= 0 ? 'price-up' : 'price-down'}`;
    }

    if (els.data.tableContainer) {
        els.data.tableContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'data-table';

        // Combine Tasks and Gantt Items
        // Daily Tasks Rows
        const dailyRows = tasks.map(task => {
            const isCompleted = task.completedHistory && task.completedHistory[targetStr];
            const isPenalized = task.penaltyHistory && task.penaltyHistory[targetStr];
            if (!isCompleted && !isPenalized) return ''; // Skip inactive

            let scoreDisplay = '0';
            let statusText = '執行中';
            let statusClass = 'status-info';

            if (isCompleted) {
                scoreDisplay = `${task.score >= 0 ? '+' : ''}${task.score}`;
                statusText = '已完成';
                statusClass = 'status-success';
            } else if (isPenalized) {
                scoreDisplay = `-${task.score}`;
                statusText = '自動扣分';
                statusClass = 'status-warning';
            }

            const canUndo = true; // Simplified

            return `
                <tr>
                    <td>
                        <div>${task.name} <span style="font-size:0.7em; opacity:0.7;">(日常)</span></div>
                        <div style="font-size:0.7rem; color:var(--text-secondary);">${statusText}</div>
                    </td>
                    <td style="text-align:center; font-family:monospace; font-weight:600; color:${isPenalized ? 'var(--accent-red)' : (isCompleted ? 'var(--accent-green)' : 'inherit')}">${scoreDisplay}</td>
                    <td style="text-align:right;">
                        ${canUndo ? `<button onclick="undoTaskAction(${task.id}, '${targetStr}')" class="btn-icon-small" title="撤銷">撤銷</button>` : '-'}
                    </td>
                </tr>
            `;
        }).join('');

        // Gantt Rows
        const ganttRows = activeGanttItems.map(item => {
            let scoreDisplay = '0';
            let statusText = '甘特圖';

            if (item.isCompleted) {
                scoreDisplay = `+${item.score}`; // Simplified, bonus not shown exactly but ok
                statusText = '已完成';
            } else if (item.isPenalized) {
                scoreDisplay = `-${item.score}`;
                statusText = '逾期扣分';
            }

            return `
                <tr>
                    <td>
                        <div>${item.name} <span style="font-size:0.7em; opacity:0.7;">(甘特)</span></div>
                        <div style="font-size:0.7rem; color:var(--text-secondary);">${statusText}</div>
                    </td>
                    <td style="text-align:center; font-family:monospace; font-weight:600; color:${item.isPenalized ? 'var(--accent-red)' : 'var(--accent-green)'}">${scoreDisplay}</td>
                    <td style="text-align:right;">-</td> <!-- Undo not implemented for Gantt yet -->
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
            <tbody>
                ${dailyRows}
                ${ganttRows}
            </tbody>
        `;
        els.data.tableContainer.appendChild(table);

        // --- Gantt Pause/Resume UI (Per Project) ---
        // Ensure Gantt System exists
        if (state.ganttSystem && state.ganttSystem.projects.length > 0) {
            const pauseContainer = document.createElement('div');
            pauseContainer.style.marginTop = '20px';
            pauseContainer.style.padding = '15px';
            pauseContainer.style.backgroundColor = 'var(--bg-secondary)';
            pauseContainer.style.borderRadius = 'var(--radius-md)';

            let projectsHtml = `
                <h3 style="margin-bottom:10px; color:var(--text-primary); text-align:center;">甘特圖企劃狀態</h3>
                <div style="display:flex; flex-direction:column; gap:10px;">
            `;

            state.ganttSystem.projects.forEach(proj => {
                const isPaused = proj.isPaused;
                projectsHtml += `
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

            projectsHtml += `</div>`;
            pauseContainer.innerHTML = projectsHtml;
            els.data.tableContainer.appendChild(pauseContainer);
        }
    }
}

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
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (confirm(`確定要恢復企劃 [${proj.name}] 嗎？\n已暫停 ${diffDays} 天。\n該企劃所有未完成的項目日期將往後延展 ${diffDays} 天。`)) {

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
                alert(`企劃 [${proj.name}] 已恢復！相關日期已延後 ${diffDays} 天。`);
            } else {
                alert(`企劃 [${proj.name}] 已恢復 (暫停時間不足1天，無日期變動)。`);
            }

            proj.isPaused = false;
            proj.pauseStartDate = null;
            saveState();
            renderDataView(); // Refresh UI
        }

    } else {
        // PAUSE
        if (confirm(`確定要暫停企劃 [${proj.name}] 嗎？\n暫停期間不會計算逾期，恢復時將自動依暫停天數延後截止日期。`)) {
            proj.isPaused = true;
            proj.pauseStartDate = getLocalDateStr();
            saveState();
            renderDataView(); // Refresh UI
        }
    }
}

// Global expose
window.toggleGanttPause = toggleGanttPause;


function undoTaskAction(taskId, dateStr) {
    const task = state.tasks.find(t => t.id == taskId);
    if (!task) return;

    if (confirm(`確定要撤銷 [${task.name}] 在 ${dateStr} 的加(扣)分嗎？`)) {
        const isCompleted = task.completedHistory && task.completedHistory[dateStr];
        const isPenalized = task.penaltyHistory && task.penaltyHistory[dateStr];

        if (isCompleted) {
            state.stockPrice -= task.score;
            delete task.completedHistory[dateStr];
        } else if (isPenalized) {
            state.stockPrice += task.score;
            delete task.penaltyHistory[dateStr];
        }

        // Update history if it's today
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

            const [h, m] = task.time.split(':').map(Number);
            let startH = h + m / 60;
            let duration = 0.5; // Default 30 mins

            if (task.endTime) {
                const [eh, em] = task.endTime.split(':').map(Number);
                duration = (eh + em / 60) - startH;
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
    if (!todayList || !weeklyList) return;

    todayList.innerHTML = '';
    weeklyList.innerHTML = '';

    const weekStrs = weekDays.map(d => getLocalDateStr(d));

    // 1. Regular Untimed Tasks
    state.tasks.forEach(task => {
        if (task.time) return; // Only untimed

        // Check each day of the week if this task applies
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


// --- Data Correction Helper ---
function fixDataAnomalies() {
    let changed = false;
    const targetNames = ["墨守辜城", "多鄰國"];

    state.tasks.forEach(t => {
        if (targetNames.includes(t.name) && t.importance === 'critical') {
            t.importance = 'normal';
            console.log(`Fixed importance for task: ${t.name}`);
            changed = true;
        }
    });

    if (changed) {
        saveState();
        console.log("Data anomalies fixed and state saved.");
    }
}

// Helper: Green-to-Red color gradient (0% = Green, 100% = Red)
function getProgressColor(percentage) {
    // 0% -> Green (#10b981), 50% -> Yellow (#f59e0b), 100% -> Red (#ef4444)
    if (percentage <= 50) {
        // Interpolate from Green to Yellow
        const ratio = percentage / 50;
        const r = Math.round(16 + (245 - 16) * ratio);
        const g = Math.round(185 + (158 - 185) * ratio);
        const b = Math.round(129 + (11 - 129) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Interpolate from Yellow to Red
        const ratio = (percentage - 50) / 50;
        const r = Math.round(245 + (239 - 245) * ratio);
        const g = Math.round(158 + (68 - 158) * ratio);
        const b = Math.round(11 + (68 - 11) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

function renderStartPage() {
    const todayStr = getLocalDateStr();
    const todaysTasks = getTasksForDate(todayStr); // Fix: Define this!

    // Price
    if (els.dashboard.price) els.dashboard.price.textContent = state.stockPrice.toFixed(2);
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
    const dailyRoutineTasks = todaysTasks.filter(t => t.type === 'recurring');
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
    const allPointTasks = todaysTasks;

    // --- NEW: Combine with Gantt Tasks for Today ---
    const ganttTasks = getGanttTasksForDate(todayStr);
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
    const criticalTasks = state.tasks.filter(t => t.importance === 'critical');
    criticalTasks.sort((a, b) => {
        const dateA = a.type === 'recurring' ? todayStr : (a.date || '9999-99-99');
        const dateB = b.type === 'recurring' ? todayStr : (b.date || '9999-99-99');
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return timeSort(a, b);
    });

    if (els.dashboard.importantList) {
        els.dashboard.importantList.innerHTML = '';
        criticalTasks.forEach(task => {
            const targetDate = task.type === 'recurring' ? todayStr : task.date;
            els.dashboard.importantList.appendChild(createTaskEl(task, targetDate, true));
        });
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
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();

    return state.tasks.filter(task => {
        if (task.exceptions && task.exceptions.includes(dateStr)) return false;
        const taskStartDate = task.date || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
        if (dateStr < taskStartDate) return false;

        // Is it completed BEFORE this date?
        const completedDates = task.completedHistory ? Object.keys(task.completedHistory).filter(d => task.completedHistory[d]) : [];
        const firstCompletionDate = completedDates.length > 0 ? completedDates.sort()[0] : null;

        if (task.isMission) {
            // Mission tasks appear until they are completed
            if (firstCompletionDate && firstCompletionDate < dateStr) return false;
            return true;
        }

        if (task.isPersistent) {
            // Persistent tasks always appear from start date onwards
            return true;
        }

        // NEW: Bad Habit Logic
        // Always appears daily starting from creation, UNLESS completed (checked) for that specific date
        if (task.isBadHabit) {
            const startStr = task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01';
            if (dateStr < startStr) return false;

            // If completed today, HIDE it (User request: "勾選完後直到明天都不會出現")
            if (task.completedHistory && task.completedHistory[dateStr]) return false;

            return true;
        }

        if (task.type === 'scheduled') {
            return task.date === dateStr;
        } else if (task.type === 'recurring') {
            // Recurrence Logic
            const interval = task.recurrence.interval || 1;
            // Use specific startDate if available, else fallback to createdAt
            const startStr = task.recurrence.startDate || (task.createdAt ? task.createdAt.split('T')[0] : '1970-01-01');
            const endStr = task.recurrence.endDate;

            const startDate = new Date(startStr);
            const targetDate = new Date(dateStr);

            // If target is before start, no
            if (dateStr < startStr) return false;
            // If target is after end, no
            if (endStr && dateStr > endStr) return false;

            const diffTime = targetDate - startDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            const rType = task.recurrence.type;

            if (rType === 'daily') {
                return diffDays % interval === 0;
            } else if (rType === 'weekly') {
                // Check if same day of week AND correct week interval
                // Modified for Custom Weekdays
                if (task.recurrence.daysOfWeek && task.recurrence.daysOfWeek.length > 0) {
                    const currentDay = targetDate.getDay();
                    if (!task.recurrence.daysOfWeek.includes(currentDay)) return false;

                    // Interval check (Standard 7-day blocks from start date)
                    const weeksPassed = Math.floor(diffDays / 7);
                    return weeksPassed % interval === 0;
                }

                return diffDays % (7 * interval) === 0;
            } else if (rType === 'monthly') {
                // Monthly logic: Same day of month, month diff % interval === 0
                const targetDay = targetDate.getDate();
                const startDay = startDate.getDate();
                if (targetDay !== startDay) return false; // Must be same day of month

                // Calculate month difference
                // (Y2 - Y1) * 12 + (M2 - M1)
                const monthDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
                return monthDiff % interval === 0;
            }
        }
        return false;
    });
}

function getGanttTasksForDate(dateStr) {
    if (!state.ganttSystem || !state.ganttSystem.projects) return [];
    const tasks = [];

    const collectRecursive = (item, projId, parentId) => {
        // If has children, recurse (don't add this item)
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => collectRecursive(child, projId, item.id));
        } else {
            // Leaf node (Lowest level). Check criteria.
            if (dateStr >= item.startDate && dateStr <= item.endDate && !item.completed) {
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
                    completed: item.completed
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

function createTaskEl(task, dateStr, showDateLabel) {
    const el = document.createElement('div');
    el.className = 'task-item';

    // Handle Gantt Completed State vs Normal
    let isCompleted = false;
    if (task.isGantt) {
        isCompleted = task.completed;
    } else {
        isCompleted = task.completedHistory && task.completedHistory[dateStr];
    }
    let timeLabel = '';
    if (task.time) {
        timeLabel = task.time;
        if (task.endTime) {
            timeLabel += ` - ${task.endTime}`;
        }
    }
    const timeDisplay = timeLabel ? `<span style="margin-right:4px; color:var(--text-secondary); font-size:0.8rem;">${timeLabel}</span>` : '';

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

    el.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
        <div class="task-info">
            <span class="task-name" style="${isCompleted && !task.isPersistent ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                ${dateDisplay}${timeDisplay} ${task.name}
            </span>
            <div class="task-meta">
                <span class="task-score ${task.score >= 0 ? 'positive' : 'negative'}">
                    ${task.score >= 0 ? '+' : ''}${task.score}
                </span>
                <span>• ${mapImportance(task.importance)}</span>
            </div>
        </div>
    `;

    const checkbox = el.querySelector('.task-checkbox');

    if (task.isGantt) {
        // Gantt specific handler
        checkbox.onchange = () => {
            // toggleGanttItem(projId, parentId, id, isChecked)
            // Note: toggleGanttItem re-renders viewProjectDetail, we might need to re-render Start Page too.
            // But toggleGanttItem ends with viewProjectDetail(projId). It doesn't call renderStartPage!
            // We need to intercept or ensure renderStartPage updates.
            // Actually, we can just call toggleGanttItem and THEN renderStartPage manually or wait for auto-refresh?
            // Auto refresh is 60s. Better to update immediately.

            toggleGanttItem(task.projId, task.parentId || '', task.id, checkbox.checked);
            // Since toggleGanttItem saves state, we can re-render start.
            // NOTE: toggleGanttItem calls viewProjectDetail which might try to find elements not on screen if we are in Start View.
            // But viewProjectDetail checks if (!proj) return... and renders into 'ganttProjectDetailView'.
            // If we are on Start View, we shouldn't switch view.

            setTimeout(() => {
                renderStartPage();
            }, 100);
        };
        // Add visual cue
        const nameEl = el.querySelector('.task-name');
        if (nameEl) {
            nameEl.innerHTML += ` <span style="font-size:0.7rem; color:var(--accent-blue);">(企劃)</span>`;
        }
    } else {
        checkbox.onchange = () => toggleTask(task.id, dateStr, checkbox.checked);
    }

    return el;
}

function toggleTask(taskId, dateStr, isChecked) {
    const task = state.tasks.find(t => t.id == taskId);
    if (!task) return;

    if (!task.completedHistory) task.completedHistory = {};
    const wasChecked = task.completedHistory[dateStr];

    if (task.isPersistent) {
        // Persistent tasks award points every time they are "checked"
        // We don't record a permanent "completed" state for them in the list
        if (isChecked) {
            state.stockPrice += task.score;
            // Briefly alert or log
            console.log(`Persistent task [${task.name}] checked: +${task.score}`);
        } else {
            // Unchecking doesn't subtract for persistent? 
            // User said "每次勾選都會加此分數". If they uncheck, maybe it should subtract if was accidental.
            // But usually persistent tasks are like "Logged a meal".
            // Let's make it symmetric for now to allow correction.
            state.stockPrice -= task.score;
        }
        // Force re-render to reset checkbox if we want "button" behavior, 
        // but user might want to see it checked for today.
        // If they want "multiple times", it should probably reset.
        // Let's keep it checked for the day, but it stays in list tomorrow.
        task.completedHistory[dateStr] = isChecked;
    } else if (task.isBadHabit) {
        // NEW: Bad Habit Progressive Penalty Logic
        if (!task.badHabitHistory) task.badHabitHistory = {};

        if (isChecked) {
            // "Doing" the bad habit -> Penalty
            // 1. Calculate Penalty Amount
            let penalty = Math.abs(task.score); // Default base score (Day 1)

            // Find last penalty date and amount
            const historyDates = Object.keys(task.badHabitHistory).sort();
            if (historyDates.length > 0) {
                const lastDate = historyDates[historyDates.length - 1]; // Last recorded date
                const lastPenalty = task.badHabitHistory[lastDate];

                // Check if lastDate is "Yesterday"
                const today = new Date(dateStr);
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const yesterdayStr = getLocalDateStr(yesterday);

                if (lastDate === yesterdayStr) {
                    // Consecutive day: Increase penalty (Previous * 1.5)
                    penalty = Math.round(lastPenalty * 1.5);
                } else {
                    // Not consecutive (broken chain): Reset to base penalty
                    console.log(`Bad Habit chain broken (Last: ${lastDate}, Today: ${dateStr}). Resetting penalty.`);
                    penalty = Math.abs(task.score);
                }
            }

            // Apply Penalty (Subtract from stock)
            state.stockPrice -= penalty;

            // Record this specific penalty for this date (so we can calculate next day or undo)
            task.badHabitHistory[dateStr] = penalty;
            task.completedHistory[dateStr] = true; // Mark done so it disappears

            console.log(`Bad Habit [${task.name}] done. Penalty: ${penalty}`);
            alert(`壞習慣檢討：已扣除 ${penalty} 分\n(下次再犯將扣更多！)`);

        } else {
            // Unchecking (Undo) - NOTE: This might be hard to trigger if task is hidden!
            // But if user finds it in "Data" view or we unhide it, we support undo.
            if (task.badHabitHistory[dateStr]) {
                const refund = task.badHabitHistory[dateStr];
                state.stockPrice += refund;
                delete task.badHabitHistory[dateStr];
            }
            task.completedHistory[dateStr] = false;
        }
    } else {
        task.completedHistory[dateStr] = isChecked;
        if (isChecked && !wasChecked) {
            state.stockPrice += task.score;
        } else if (!isChecked && wasChecked) {
            state.stockPrice -= task.score;
        }
    }

    const todayStr = getLocalDateStr();
    const historyIndex = state.history.findIndex(h => h.date === todayStr);
    if (historyIndex >= 0) {
        state.history[historyIndex].price = state.stockPrice;
    } else {
        state.history.push({ date: todayStr, price: state.stockPrice });
    }

    saveState();
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
}

// --- Schedule Logic ---
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

// Global Delete Handler State
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
                if (!freshTask.exceptions) freshTask.exceptions = [];
                freshTask.exceptions.push(dateToDelete);
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
    els.editModal.taskDate.value = dateStr;     // Visible: Editable
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
                // Update core properties
                task.name = newName;
                task.score = newScore;
                task.importance = newImportance;
                task.isMission = newIsMission;
                task.isPersistent = newIsPersistent;
                task.isBadHabit = newIsBadHabit;
                task.time = newTime;
                task.endTime = newEndTime;

                if (isRecSet) {
                    task.type = 'recurring';
                    const interval = parseInt(document.getElementById('editRecurrenceInterval').value) || 1;
                    const type = document.getElementById('editRecurrenceType').value;
                    const rec = { type, interval, startDate: newDate };
                    if (type === 'weekly') {
                        const days = Array.from(document.getElementsByName('editRecurrenceDay')).filter(c => c.checked).map(c => parseInt(c.value));
                        rec.daysOfWeek = days;
                    }
                    task.recurrence = rec;
                } else {
                    if (task.type === 'recurring') {
                        task.type = 'scheduled';
                        delete task.recurrence;
                    }
                    task.date = newDate;
                }

                editPendingData = { name: newName, time: newTime, endTime: newEndTime, newDate: newDate, score: newScore, importance: newImportance, isMission: newIsMission, isPersistent: newIsPersistent, isBadHabit: newIsBadHabit };
                taskToEdit = task;
                editOriginalDateVal = originalDate;

                if (task.type === 'recurring') {
                    els.editScopeModal.el.classList.remove('hidden');
                } else {
                    finishEdit();
                }
            } else {
                // Try Gantt... (Existing logic preserved below or merged)
                // Actually I should find it first to decide logic
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

function updateRecurringSingle() {
    // RE-FETCH task to avoid stale state
    const freshTask = state.tasks.find(t => t.id === taskToEdit.id);
    if (!freshTask) return alert('Task not found (concurrency error)');

    // 1. Add exception to old (Using ORIGINAL Date)
    if (!freshTask.exceptions) freshTask.exceptions = [];
    freshTask.exceptions.push(editOriginalDateVal);

    // 2. Create new Single Scheduled Task (Using NEW Date)
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
        exceptions: [], // Important: Reset exceptions for the new instance
        // Reset histories for the new task as it's a new instance
        completedHistory: {},
        penaltyHistory: {},
        createdAt: editPendingData.newDate
    };

    // If we're on the same date, preserve status?
    // If date changed, we usually restart status.
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
    // RE-FETCH task
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
        id: Date.now(), // New ID
        name: editPendingData.name,
        time: editPendingData.time,
        endTime: editPendingData.endTime,
        score: editPendingData.score,
        importance: editPendingData.importance,
        isMission: editPendingData.isMission,
        isPersistent: editPendingData.isPersistent,
        createdAt: editPendingData.newDate,
        recurrence: {
            ...freshTask.recurrence,
            startDate: editPendingData.newDate,
            endDate: null // Clear end date for new one
        },
        completedHistory: {}, // Reset history for new series
        penaltyHistory: {}
    };

    // Preserve status if dates match
    if (editPendingData.newDate === editOriginalDateVal) {
        if (taskToEdit.completedHistory && taskToEdit.completedHistory[editOriginalDateVal]) {
            newTask.completedHistory[editPendingData.newDate] = true;
        }
    }

    state.tasks.push(newTask);
    els.editScopeModal.el.classList.add('hidden');
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

// --- Gantt System Logic ---
function setupGanttListeners() {
    const g = els.gantt;
    const nav = els.nav;
    const back = els.backBtns;

    if (nav.ganttBtn) nav.ganttBtn.onclick = () => renderView('ganttMain');

    if (back.fromGanttMain) back.fromGanttMain.onclick = () => renderView('start');
    if (back.fromAddProject) back.fromAddProject.onclick = () => renderView('ganttMain');
    if (back.fromProjDetail) back.fromProjDetail.onclick = () => renderView('ganttMain');

    if (g.openAddProjectBtn) g.openAddProjectBtn.onclick = () => {
        g.addForm.reset();
        g.parentTaskContainer.innerHTML = '';
        addParentTaskSlot(); // Add one by default
        renderView('ganttAddProject');
    };

    if (g.addParentTaskSlotBtn) g.addParentTaskSlotBtn.onclick = addParentTaskSlot;

    if (g.addForm) g.addForm.onsubmit = handleAddProjectSubmit;

    if (g.childModal.closeBtn) g.childModal.closeBtn.onclick = () => g.childModal.el.classList.add('hidden');
    if (g.childModal.form) g.childModal.form.onsubmit = handleAddChildTaskSubmit;

    if (g.editModal.closeBtn) g.editModal.closeBtn.onclick = () => g.editModal.el.classList.add('hidden');
    if (g.editModal.form) g.editModal.form.onsubmit = handleEditGanttTaskSubmit;
    if (g.editModal.deleteBtn) g.editModal.deleteBtn.onclick = handleDeleteGanttTask;

    if (g.projEditModal.closeBtn) g.projEditModal.closeBtn.onclick = () => g.projEditModal.el.classList.add('hidden');
    if (g.projEditModal.form) g.projEditModal.form.onsubmit = handleEditGanttProjectSubmit;
    if (g.projEditModal.deleteBtn) g.projEditModal.deleteBtn.onclick = handleDeleteGanttProject;
    if (g.projEditModal.addParentBtn) g.projEditModal.addParentBtn.onclick = addParentTaskSlotToEdit;
}
function openEditGanttProjectModal(projId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    document.getElementById('editProjId').value = projId;
    document.getElementById('editProjName').value = proj.name;
    document.getElementById('editProjScore').value = proj.score;
    document.getElementById('editProjStart').value = proj.startDate;
    document.getElementById('editProjEnd').value = proj.endDate;

    els.gantt.projEditModal.parentList.innerHTML = ''; // Clear for new additions
    els.gantt.projEditModal.el.classList.remove('hidden');
}

function addParentTaskSlotToEdit() {
    const container = els.gantt.projEditModal.parentList;
    const id = Date.now();
    const div = document.createElement('div');
    div.className = 'form-group parent-slot-edit'; // Use distinct class
    div.style = 'border: 1px solid var(--border-color); padding: 10px; border-radius: 8px; margin-bottom: 5px;';
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; opacity: 0.7;">新增父任務</span>
            <button type="button" class="btn-icon-small" onclick="this.parentElement.parentElement.remove()">🗑️</button>
        </div>
        <input type="text" placeholder="父任務名稱" class="parent-name" required style="margin-bottom: 8px;">
        <input type="number" placeholder="完成得分" class="parent-score" required value="50" style="margin-bottom: 8px;">
        <div style="display: flex; gap: 8px;">
            <input type="date" class="parent-start" required>
            <input type="date" class="parent-end" required>
        </div>
    `;
    container.appendChild(div);
}

function handleEditGanttProjectSubmit(e) {
    e.preventDefault();
    const projId = document.getElementById('editProjId').value;
    const proj = state.ganttSystem.projects.find(p => p.id == projId);

    proj.name = document.getElementById('editProjName').value;
    proj.score = parseInt(document.getElementById('editProjScore').value);
    proj.startDate = document.getElementById('editProjStart').value;
    proj.endDate = document.getElementById('editProjEnd').value;

    // Handle new parent tasks
    const newParentSlots = document.querySelectorAll('.parent-slot-edit');
    const newParents = Array.from(newParentSlots).map((slot, index) => ({
        id: `p-${Date.now()}-${index}`,
        name: slot.querySelector('.parent-name').value,
        score: parseInt(slot.querySelector('.parent-score').value),
        startDate: slot.querySelector('.parent-start').value,
        endDate: slot.querySelector('.parent-end').value,
        children: [],
        completed: false
    }));

    if (newParents.length > 0) {
        proj.parents.push(...newParents);
        // Resort if needed? Usually they are added at the end.
    }

    saveState();
    els.gantt.projEditModal.el.classList.add('hidden');
    renderGanttMainPage();
}

function handleDeleteGanttProject() {
    if (!confirm('確定要刪除整個企劃嗎？此操作不可撤銷。')) return;
    const projId = document.getElementById('editProjId').value;
    state.ganttSystem.projects = state.ganttSystem.projects.filter(p => p.id != projId);
    saveState();
    els.gantt.projEditModal.el.classList.add('hidden');
    renderGanttMainPage();
}

function openEditGanttModal(projId, parentId, id, type) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    let item;
    if (type === 'parent') {
        item = proj.parents.find(p => p.id == id);
        document.getElementById('editGanttImportanceGroup').classList.add('hidden');
    } else {
        const parent = proj.parents.find(p => p.id == parentId);
        if (!parent) return;
        item = (parent.children || []).find(c => c.id == id);
        if (!item) return;
        document.getElementById('editGanttImportanceGroup').classList.remove('hidden');
        document.getElementById('editGanttImportance').value = item.importance;
    }

    document.getElementById('editGanttProjectId').value = projId;
    document.getElementById('editGanttParentId').value = parentId;
    document.getElementById('editGanttTaskId').value = id;
    document.getElementById('editGanttType').value = type;

    document.getElementById('editGanttName').value = item.name;
    document.getElementById('editGanttScore').value = item.score;
    document.getElementById('editGanttStart').value = item.startDate;
    document.getElementById('editGanttEnd').value = item.endDate;

    els.gantt.editModal.el.classList.remove('hidden');
}

function handleEditGanttTaskSubmit(e) {
    e.preventDefault();
    const projId = document.getElementById('editGanttProjectId').value;
    const parentId = document.getElementById('editGanttParentId').value;
    const id = document.getElementById('editGanttTaskId').value;
    const type = document.getElementById('editGanttType').value;

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    if (type === 'child') {
        item.importance = document.getElementById('editGanttImportance').value;
    }

    item.name = document.getElementById('editGanttName').value;
    item.score = parseInt(document.getElementById('editGanttScore').value);
    item.startDate = document.getElementById('editGanttStart').value;
    item.endDate = document.getElementById('editGanttEnd').value;

    saveState();
    els.gantt.editModal.el.classList.add('hidden');
    viewProjectDetail(projId);
}

function handleDeleteGanttTask() {
    if (!confirm('確定要刪除此項目嗎？')) return;

    const projId = document.getElementById('editGanttProjectId').value;
    const parentId = document.getElementById('editGanttParentId').value;
    const id = document.getElementById('editGanttTaskId').value;
    const type = document.getElementById('editGanttType').value;

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    if (type === 'parent') {
        proj.parents = proj.parents.filter(p => p.id != id);
    } else {
        // Find parent and remove child
        const parent = findGanttItem(proj.parents, parentId || '');
        if (parent && parent.children) {
            parent.children = parent.children.filter(c => c.id != id);
        }
    }

    saveState();
    els.gantt.editModal.el.classList.add('hidden');
    viewProjectDetail(projId);
}

function addParentTaskSlot() {
    const container = els.gantt.parentTaskContainer;
    const id = Date.now();
    const div = document.createElement('div');
    div.className = 'form-group parent-slot';
    div.style = 'border: 1px solid var(--border-color); padding: 10px; border-radius: 8px;';
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>父任務</span>
            <button type="button" class="btn-icon-small" onclick="this.parentElement.parentElement.remove()">🗑️</button>
        </div>
        <input type="text" placeholder="父任務名稱" class="parent-name" required style="margin-bottom: 8px;">
        <input type="number" placeholder="完成得分" class="parent-score" required value="50" style="margin-bottom: 8px;">
        <div style="display: flex; gap: 8px;">
            <input type="date" class="parent-start" required>
            <input type="date" class="parent-end" required>
        </div>
    `;
    container.appendChild(div);
}

function handleAddProjectSubmit(e) {
    e.preventDefault();
    const g = els.gantt;
    const name = document.getElementById('projName').value;
    const score = parseInt(document.getElementById('projScore').value);
    const startDate = document.getElementById('projStartDate').value;
    const endDate = document.getElementById('projEndDate').value;

    const parentSlots = document.querySelectorAll('.parent-slot');
    const parents = Array.from(parentSlots).map((slot, index) => ({
        id: `p-${Date.now()}-${index}`,
        name: slot.querySelector('.parent-name').value,
        score: parseInt(slot.querySelector('.parent-score').value),
        startDate: slot.querySelector('.parent-start').value,
        endDate: slot.querySelector('.parent-end').value,
        children: [],
        completed: false
    }));

    const newProject = {
        id: `proj-${Date.now()}`,
        name,
        score,
        startDate,
        endDate,
        parents,
        completed: false
    };

    state.ganttSystem.projects.push(newProject);
    saveState();
    renderView('ganttMain');
}

function renderGanttMainPage() {
    const container = els.gantt.projectList;
    if (!container) return;
    container.innerHTML = '';

    if (state.ganttSystem.projects.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">尚無企劃，請點擊 + 新增</p>';
        return;
    }

    const todayStr = getLocalDateStr();

    state.ganttSystem.projects.forEach(proj => {
        const card = document.createElement('div');
        card.className = 'project-card';

        // Calculate progress
        const totalItems = proj.parents.length + proj.parents.reduce((acc, p) => acc + (p.children || []).length, 0);
        const completedItems = proj.parents.filter(p => p.completed).length +
            proj.parents.reduce((acc, p) => acc + (p.children || []).filter(c => c.completed).length, 0);
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        // Find today's task
        let todayTaskHtml = '<div style="font-size: 0.8rem; color: gray;">今日無任務</div>';
        const todayChild = proj.parents.flatMap(p => p.children || []).find(c => todayStr >= c.startDate && todayStr <= c.endDate && !c.completed);
        const todayParent = proj.parents.find(p => todayStr >= p.startDate && todayStr <= p.endDate && !p.completed);

        if (todayChild) {
            todayTaskHtml = `<div style="font-size: 0.8rem; color: var(--accent-blue);">今日：${todayChild.name} (子任務)</div>`;
        } else if (todayParent) {
            todayTaskHtml = `<div style="font-size: 0.8rem; color: var(--accent-blue);">今日：${todayParent.name} (父任務)</div>`;
        }

        card.innerHTML = `
            <div class="project-header">
                <div class="project-title">${proj.name}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <div class="project-score">${proj.score} 分</div>
                    <button class="btn-icon-small" onclick="openEditGanttProjectModal('${proj.id}')">✏️</button>
                </div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">期限：${proj.startDate} ~ ${proj.endDate}</div>
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">
                <span>總進度</span>
                <span>${Math.round(progress)}% (${completedItems}/${totalItems})</span>
            </div>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%; background: ${getProgressColor(progress)};"></div>
            </div>
            ${todayTaskHtml}
            <button class="btn-secondary small full-width" style="margin-top: 10px;" onclick="viewProjectDetail('${proj.id}')">查看詳細 / 任務管理</button>
        `;
        container.appendChild(card);
    });
}

function viewProjectDetail(projId) {
    try {
        const proj = state.ganttSystem.projects.find(p => p.id == projId);
        if (!proj) {
            console.error("Project not found:", projId);
            return;
        }

        renderView('ganttProjectDetail');
        els.gantt.projDetailTitle.textContent = proj.name;
        const container = els.gantt.projDetailContent;
        container.innerHTML = '';

        proj.parents.forEach((parent, pIdx) => {
            const isLocked = pIdx > 0 && !proj.parents[pIdx - 1].completed;
            container.appendChild(renderGanttItemRecursive(proj, null, parent, 0, isLocked));
        });

        // Visualization Button
        const vizBtn = document.createElement('button');
        vizBtn.className = 'btn-secondary small full-width'; // Or place in header
        vizBtn.style.marginTop = '10px';
        vizBtn.style.textAlign = 'center';
        vizBtn.textContent = '📊 甘特圖視覺化 (Visualization)';
        vizBtn.onclick = () => renderGanttVisualization(projId);
        container.appendChild(vizBtn);

        // Add "Next Parent" button at the bottom
        const addParentBtn = document.createElement('button');
        addParentBtn.className = 'btn-primary full-width';
        addParentBtn.style.marginTop = '10px';
        addParentBtn.textContent = '+ 新增下一個父任務';
        addParentBtn.onclick = () => {
            // Open the dedicated add parent task modal
            openAddParentTaskModal(projId);
        };
        container.appendChild(addParentBtn);

    } catch (e) {
        console.error("View Project Detail Error:", e);
        alert("無法開啟企劃詳情：資料可能已損毀");
    }
}

function renderGanttItemRecursive(proj, parentId, item, level, isLocked) {
    const isParent = level === 0;
    const div = document.createElement('div');
    div.className = isParent ? `parent-task-item ${isLocked ? 'task-locked' : ''}` : `child-task-item ${item.importance || 'medium'}`;
    div.style.marginLeft = level > 0 ? '15px' : '0';

    // Drag and Drop Attributes for Parents
    if (isParent) {
        div.draggable = true;
        div.style.cursor = 'grab';
        div.dataset.id = item.id;
        div.dataset.projId = proj.id;

        div.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', item.id);
            e.dataTransfer.setData('projId', proj.id);
            div.classList.add('dragging');
        };

        div.ondragend = () => {
            div.classList.remove('dragging');
            document.querySelectorAll('.parent-task-item').forEach(el => el.classList.remove('drag-over'));
        };

        div.ondragover = (e) => {
            e.preventDefault(); // Necessary for drop
            div.classList.add('drag-over');
        };

        div.ondragleave = () => {
            div.classList.remove('drag-over');
        };

        div.ondrop = (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const sourceProjId = e.dataTransfer.getData('projId'); // Ensure same project
            if (sourceProjId !== proj.id) return;
            if (draggedId === item.id) return;

            handleParentReorder(proj.id, draggedId, item.id); // draggedId dropped ONTO item.id
        };
    }

    const hasChildren = item.children && item.children.length > 0;
    const childrenAllDone = areChildrenCompletedRecursive(item);
    const canCheck = !isLocked && childrenAllDone;

    const itemHtml = `
        <div class="${isParent ? 'parent-header' : 'item-header'}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                 ${isParent ? '<span style="cursor:grab; opacity:0.5;">☰</span>' : ''}
                <input type="checkbox" class="task-checkbox"
                    ${item.completed ? 'checked' : ''}
                    ${(item.completed || canCheck) ? '' : 'disabled'}
                    onchange="toggleGanttItem('${proj.id}', '${parentId || ''}', '${item.id}', this.checked)">
                <span style="font-weight: ${isParent ? '700' : 'normal'}; ${item.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${item.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                 <span style="font-size: 0.75rem; color: var(--text-secondary);">${item.score} 分</span>
                 <button class="btn-icon-small" title="編輯" onclick="openEditGanttModal('${proj.id}', '${parentId || ''}', '${item.id}', '${isParent ? 'parent' : 'child'}')">✏️</button>
                 <button class="btn-icon-small" title="刪除" onclick="deleteGanttItem('${proj.id}', '${parentId || ''}', '${item.id}', '${isParent ? 'parent' : 'child'}')">🗑️</button>
                 <button class="btn-add-small" onclick="openAddChildModal('${proj.id}', '${item.id}')">+ 子任務</button>
            </div>
        </div>
        ${isParent ? `<div style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 8px;">範圍：${item.startDate} ~ ${item.endDate}</div>` : ''}
    `;

    div.innerHTML = itemHtml;

    if (hasChildren) {
        const childrenList = document.createElement('div');
        childrenList.className = 'children-list';
        item.children.forEach(child => {
            childrenList.appendChild(renderGanttItemRecursive(proj, item.id, child, level + 1, isLocked));
        });
        div.appendChild(childrenList);
    }

    return div;
}

function handleParentReorder(projId, draggedId, targetId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    const fromIdx = proj.parents.findIndex(p => p.id == draggedId);
    const toIdx = proj.parents.findIndex(p => p.id == targetId);

    if (fromIdx < 0 || toIdx < 0) return;

    // Move logic
    const [moved] = proj.parents.splice(fromIdx, 1);
    proj.parents.splice(toIdx, 0, moved);

    saveState();
    viewProjectDetail(projId);
}

function openAddParentTaskModal(projId) {
    document.getElementById('addParentProjId').value = projId;
    document.getElementById('addParentName').value = '';
    document.getElementById('addParentScore').value = 50;

    // Default dates: today
    const today = getLocalDateStr();
    document.getElementById('addParentStart').value = today;
    document.getElementById('addParentEnd').value = today;

    document.getElementById('addParentInsertTop').checked = false;

    const modal = document.getElementById('addParentTaskModal');
    modal.classList.remove('hidden');

    // Bind verify
    const closeBtn = document.getElementById('closeAddParentModalBtn');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    const form = document.getElementById('addParentTaskForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        handleAddParentTaskSubmit();
    };
}

function handleAddParentTaskSubmit() {
    const projId = document.getElementById('addParentProjId').value;
    const name = document.getElementById('addParentName').value;
    const score = parseInt(document.getElementById('addParentScore').value);
    const startDate = document.getElementById('addParentStart').value;
    const endDate = document.getElementById('addParentEnd').value;
    const insertTop = document.getElementById('addParentInsertTop').checked;

    const newParent = {
        id: `p-${Date.now()}`,
        name,
        score,
        startDate,
        endDate,
        children: [],
        completed: false
    };

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (proj) {
        if (insertTop) {
            proj.parents.unshift(newParent);
        } else {
            proj.parents.push(newParent);
        }
        saveState();
        document.getElementById('addParentTaskModal').classList.add('hidden');
        viewProjectDetail(projId);
        renderGanttVisualization(projId); // Refresh viz if open? Usually we are in detail view.
    }
}

function renderGanttVisualization(projId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    const modal = document.getElementById('detailModal'); // Reuse detail modal for viz? Or create full page?
    // Request says "New Web Page". But usually we just render a view in our SPA.
    // Let's create a dedicated CONTAINER in our View Stack, reusing 'focusedGanttView' or similar?
    // "Gantt Visualization Page" -> Let's interpret as a View like 'ganttProjectDetail'.
    // Let's create a temporary overlay or reuse the modal but make it wide?
    // User: "New Web Page for Gantt Visualization".
    // I can render it into `els.gantt.projDetailContent` REPLACING lists?
    // Best: Clear content and render Visualization there, with a "Back to List" button.

    const container = els.gantt.projDetailContent;
    container.innerHTML = ''; // clear list

    // Header Back
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary small';
    backBtn.textContent = '← 返回列表';
    backBtn.style.marginBottom = '15px';
    backBtn.onclick = () => viewProjectDetail(projId);
    container.appendChild(backBtn);

    const title = document.createElement('h3');
    title.textContent = `視覺化圖表：${proj.name}`;
    title.style.marginBottom = '15px';
    container.appendChild(title);

    // Canvas Container
    const canvasContainer = document.createElement('div');
    canvasContainer.style.position = 'relative';
    canvasContainer.style.height = '400px';
    canvasContainer.style.overflowX = 'auto'; // Horizontal scroll
    canvasContainer.style.overflowY = 'auto'; // Vertical scroll
    canvasContainer.style.border = '1px solid var(--border-color)';
    canvasContainer.style.borderRadius = '8px';
    canvasContainer.style.padding = '10px';

    // We need to calculate date range.
    const allDates = [];
    allDates.push(proj.startDate, proj.endDate);
    proj.parents.forEach(p => { allDates.push(p.startDate, p.endDate); });
    // Also include children? Usually children are within parent range, but just in case.

    allDates.sort();
    const minDateStr = allDates[0]; // Start
    const maxDateStr = allDates[allDates.length - 1]; // End

    const minDate = new Date(minDateStr);
    const maxDate = new Date(maxDateStr);
    // Add margin
    maxDate.setDate(maxDate.getDate() + 2);

    const dayWidth = 40; // px
    const headerHeight = 30; // px
    const rowHeight = 40; // px

    const totalDays = Math.max(1, Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    const totalWidth = totalDays * dayWidth;
    const totalHeight = (proj.parents.length + 1) * rowHeight + headerHeight + 50; // +1 for project itself? Or just parents

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(container.clientWidth - 40, totalWidth); // At least container width
    canvas.height = totalHeight;
    canvasContainer.appendChild(canvas);
    container.appendChild(canvasContainer);

    const ctx = canvas.getContext('2d');

    // Helper
    const getX = (dStr) => {
        const d = new Date(dStr);
        const diff = Math.floor((d - minDate) / (1000 * 60 * 60 * 24));
        return diff * dayWidth;
    };

    // Draw Grid & Dates
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#30363d';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8b949e';

    for (let i = 0; i <= totalDays; i++) {
        const x = i * dayWidth;
        // Line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        // Date Label
        const curr = new Date(minDate);
        curr.setDate(curr.getDate() + i);
        const dStr = `${curr.getMonth() + 1}/${curr.getDate()}`;
        ctx.fillText(dStr, x + 5, 20);
    }

    // Current Time Pointer
    const todayStr = getLocalDateStr();
    const todayX = getX(todayStr); // Only works if today is in range.
    if (todayX >= 0 && todayX <= totalWidth) {
        ctx.strokeStyle = '#ef4444'; // Red
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(todayX, 0);
        ctx.lineTo(todayX, canvas.height);
        ctx.stroke();
        ctx.lineWidth = 1; // Reset
    }

    // Draw Tasks
    let y = headerHeight + 20;

    proj.parents.forEach((parent, idx) => {
        // Parent Bar (Color Coded if we want, user asked for "Color Coded Parent")
        // Colors from palette? #3b82f6 (Blue), #10b981 (Green), #f59e0b (Orange)
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        const color = colors[idx % colors.length];

        const startX = getX(parent.startDate);
        const endX = getX(parent.endDate) + dayWidth; // Include full end day
        const width = Math.max(5, endX - startX);

        // Bar
        ctx.fillStyle = parent.completed ? '#10b981' : color;
        ctx.fillRect(startX, y, width, 20);

        // Text
        ctx.fillStyle = '#ffffff'; // White text
        ctx.fillText(parent.name, startX + 5, y + 14);

        // Children (Black Lines)
        if (parent.children) {
            parent.children.forEach(child => {
                const cStartX = getX(child.startDate);
                const cEndX = getX(child.endDate) + dayWidth;
                const cWidth = Math.max(2, cEndX - cStartX);

                // Draw line below parent bar? Or overlay? 
                // User request: "Parent color bars, Children black lines".
                // Let's draw a thin black line just below the bar or inside it?
                // "Time Range for children is black line".

                const lineY = y + 24; // Just below bar

                ctx.strokeStyle = '#000000'; // Black (or lighter if dark mode? dark mode black is invisible)
                // Use White for dark mode visibility? User said "Black Lines".
                // If background is dark (#0d1117), black is bad. Let's use White or Light Gray but user asked Black.
                // Maybe they meant "Dark Line". I'll use a high contrast color (white/black depending on theme).
                // Actually the user specified "Black Line". I'll try black but if invisible, I'll add a white stroke border.
                ctx.strokeStyle = '#ffffff'; // Override to white for visibility in dark mode? 
                // Let's stick to request but maybe ensure visibility. 
                // I'll draw a thin line.
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cStartX, lineY);
                ctx.lineTo(cEndX, lineY);
                ctx.stroke();
                ctx.lineWidth = 1;
            });
        }

        y += rowHeight;
    });
}

function findGanttItem(items, id) {
    if (!items) return null;
    for (const it of items) {
        if (it.id == id) return it;
        if (it.children) {
            const found = findGanttItem(it.children, id);
            if (found) return found;
        }
    }
    return null;
}

function areChildrenCompletedRecursive(item) {
    if (!item.children || item.children.length === 0) return true;
    return item.children.every(child => child.completed && areChildrenCompletedRecursive(child));
}

function toggleGanttItem(projId, parentId, id, isChecked) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    // Is it a parent? (level 0)
    const isParent = proj.parents.some(p => p.id == id);
    const todayStr = getLocalDateStr();

    if (item.completed && !isChecked) {
        state.stockPrice -= item.score;
        item.completed = false;

        // Remove history if exists for today
        if (item.completedHistory && item.completedHistory[todayStr]) {
            delete item.completedHistory[todayStr];
        }

        // If it was a parent and the project was completed, uncomplete it?
        if (isParent) proj.completed = false;
    } else if (!item.completed && isChecked) {
        // Points plus importance bonus for children
        let totalGain = item.score;
        if (!isParent) {
            if (item.importance === 'importance-dark-red') totalGain += 4;
            else if (item.importance === 'importance-light-red') totalGain += 2;
        }

        state.stockPrice += totalGain;
        item.completed = true;

        // Record History
        if (!item.completedHistory) item.completedHistory = {};
        item.completedHistory[todayStr] = true;

        if (isParent) {
            checkProjectCompletion(proj);
        }
    }

    saveState();
    viewProjectDetail(projId);
}

function checkProjectCompletion(proj) {
    if (proj.parents.every(p => p.completed)) {
        const todayStr = getLocalDateStr();
        const startStr = proj.startDate;
        const endStr = proj.endDate;
        const startD = new Date(startStr);
        const endD = new Date(endStr);
        const todayD = new Date(todayStr);

        const totalDays = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        let finalBonus = 0;
        let bonusMsg = '';

        if (totalDays > 0) {
            const elapsedDays = Math.floor((todayD - startD) / (1000 * 60 * 60 * 24)) + 1;
            if (elapsedDays <= totalDays / 3) {
                finalBonus = Math.floor(proj.score * 0.5);
                bonusMsg = ` (獲得額外 1/2 獎勵 +${finalBonus})`;
            } else if (elapsedDays <= (2 * totalDays) / 3) {
                finalBonus = Math.floor(proj.score / 3);
                bonusMsg = ` (獲得額外 1/3 獎勵 +${finalBonus})`;
            }
        }

        state.stockPrice += proj.score + finalBonus;
        proj.completed = true;
        alert(`恭喜完成企劃 [${proj.name}]！獲得 ${proj.score + finalBonus} 分${bonusMsg}`);
    }
}

function openAddChildModal(projId, parentOrChildId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, parentOrChildId);
    if (!item) return;

    document.getElementById('childProjectId').value = projId;
    document.getElementById('childParentId').value = parentOrChildId; // This is the ID we'll append to

    // Set date bounds based on target parent/child
    document.getElementById('childStartDate').min = item.startDate;
    document.getElementById('childStartDate').max = item.endDate;
    document.getElementById('childEndDate').min = item.startDate;
    document.getElementById('childEndDate').max = item.endDate;

    // Default values
    document.getElementById('childStartDate').value = item.startDate;
    document.getElementById('childEndDate').value = item.endDate;

    els.gantt.childModal.el.classList.remove('hidden');
}

function handleAddChildTaskSubmit(e) {
    e.preventDefault();
    const projId = document.getElementById('childProjectId').value;
    const parentId = document.getElementById('childParentId').value;

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, parentId);
    if (!item) return;

    const child = {
        id: `c-${Date.now()}`,
        name: document.getElementById('childName').value,
        score: parseInt(document.getElementById('childScore').value),
        startDate: document.getElementById('childStartDate').value,
        endDate: document.getElementById('childEndDate').value,
        importance: document.getElementById('childImportance').value,
        children: [], // Allow nesting
        completed: false
    };

    item.children.push(child);
    saveState();
    els.gantt.childModal.el.classList.add('hidden');
    viewProjectDetail(projId);
}

// Global functions for onclick (since they are in HTML strings)
window.viewProjectDetail = viewProjectDetail;
window.toggleGanttItem = toggleGanttItem;
window.openAddChildModal = openAddChildModal;
window.openEditGanttModal = openEditGanttModal;
window.openEditGanttProjectModal = openEditGanttProjectModal;
window.undoTaskAction = undoTaskAction;
window.toggleTask = toggleTask;
window.openEditModal = openEditModal;
window.deleteGanttItem = deleteGanttItem;
window.initiateDelete = initiateDelete;

function deleteGanttItem(projId, parentId, id, type) {
    if (!confirm('確定要刪除此項目嗎？')) return;

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    if (type === 'parent') {
        proj.parents = proj.parents.filter(p => p.id != id);
    } else {
        const parent = findGanttItem(proj.parents, parentId || '');
        if (parent && parent.children) {
            parent.children = parent.children.filter(c => c.id != id);
        }
    }

    saveState();
    viewProjectDetail(projId);
}

function mapImportance(imp) {
    const map = { critical: '重要', high: '還好', medium: '輕微', low: '不重要', daily: '日常' };
    return map[imp] || imp;
}

// Start
try {
    init();
} catch (e) {
    console.error("Critical Failure in Top-Level Init:", e);
    alert("程式初始化失敗，請連繫開發者。");
}
// --- System Updates ---
// --- Debug & Diagnostics ---
let versionClickCount = 0;
window.forceUpdate = async function () {
    versionClickCount++;
    if (versionClickCount >= 5) {
        document.getElementById('debugPanel').classList.remove('hidden');
        updateDebugInfo();
    }

    if (!confirm('是否強制清除快取並更新至最新版本？(將會重新整理頁面)')) return;
    // ... rest of forceUpdate logic

    alert('正在清理系統快取...');

    try {
        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // List of keys to clear
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        alert('清理完成！即將重啟...');
        window.location.reload(true);
    } catch (e) {
        alert('清理失敗，請手動清除瀏覽器資料: ' + e.message);
    }
};

window.updateDebugInfo = function () {
    const statsEl = document.getElementById('debugStats');
    const rawEl = document.getElementById('debugRaw');
    if (!statsEl) return;

    const taskCount = state.tasks ? state.tasks.length : 0;
    const projectCount = (state.ganttSystem && state.ganttSystem.projects) ? state.ganttSystem.projects.length : 0;
    const lastUpdate = state.updatedAt ? new Date(state.updatedAt).toLocaleString() : '無';

    statsEl.innerHTML = `任務數: ${taskCount} | 企劃數: ${projectCount} | 最後更新: ${lastUpdate}`;
    rawEl.textContent = JSON.stringify(state, null, 2);
};

window.copyRawData = function () {
    const rawText = JSON.stringify(state);
    navigator.clipboard.writeText(rawText).then(() => {
        alert('原始資料已複製到剪貼簿。');
    }).catch(err => {
        console.error('複製失敗:', err);
    });
};

window.toggleDebugRaw = function () {
    const rawEl = document.getElementById('debugRaw');
    if (rawEl) rawEl.classList.toggle('hidden');
};

window.scanForBackups = async function () {
    const resultsEl = document.getElementById('scanResults');
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');
    resultsEl.innerHTML = '正在全力掃描資料庫中所有可能的位置...';

    const collections = ['data', 'tasks', 'users', 'state', 'accounting'];
    let html = '<div style="margin-bottom:8px; font-weight:bold;">掃描結果：</div>';
    let foundAny = false;

    try {
        for (const colName of collections) {
            try {
                const snapshot = await db.collection(colName).get();
                if (!snapshot.empty) {
                    foundAny = true;
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const taskCount = (data.tasks || []).length;
                        const projCount = (data.ganttSystem && data.ganttSystem.projects) ? data.ganttSystem.projects.length : 0;
                        const updateTime = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '未知';

                        html += `
                            <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding:4px 0;">
                                集合: [${colName}] | ID: ${doc.id}<br>
                                任務: ${taskCount} | 企劃: ${projCount}<br>
                                最後更新: ${updateTime}
                                <button onclick="restoreFromID('${colName}', '${doc.id}')" class="btn-confirm small" style="margin-top:4px; font-size:0.7rem; padding:2px 8px; background:var(--accent-green);">嘗試選用此備份</button>
                            </div>
                        `;
                    });
                }
            } catch (e) { console.warn(`Scan failed for ${colName}:`, e); }
        }

        if (!foundAny) {
            resultsEl.innerHTML = '資料庫中無任何可辨識的備份文件。';
        } else {
            resultsEl.innerHTML = html;
        }
    } catch (e) {
        console.error("Scan Error:", e);
        resultsEl.innerHTML = '掃描失敗: ' + e.message;
    }
};

window.restoreFromID = async function (colName, docId) {
    if (!confirm(`確定要嘗試從 [${colName}] 中的 [${docId}] 還原資料嗎？`)) return;

    try {
        const doc = await db.collection(colName).doc(docId).get();
        if (doc.exists) {
            state = { ...defaultState, ...doc.data() };
            validateAndRepairState();
            saveState("ManualRestoreFromID");
            alert("資料已還原並存入雲端！頁面即將重新整理...");
            window.location.reload();
        } else {
            alert("文件不存在。");
        }
    } catch (e) {
        alert("讀取失敗: " + e.message);
    }
};

// --- Add Parent Task Logic ---

// --- Local Export/Import Functions ---
window.exportLocalData = function () {
    try {
        // Create export object with core data
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                appVersion: "6.09",
                appName: "時間管理大師"
            },
            tasks: state.tasks || [],
            ganttSystem: state.ganttSystem || { projects: [] },
            accounting: state.accounting || { transactions: [], banks: [], categories: [] },
            stockPrice: state.stockPrice || 100,
            history: state.history || [],
            lastLoginDate: state.lastLoginDate || ''
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create blob and download link
        const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with date
        const dateStr = getLocalDateStr().replace(/-/g, '');
        link.download = `time-master-backup-${dateStr}.txt`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`資料已成功導出！\n文件名：time-master-backup-${dateStr}.txt\n\n包含：\n- ${exportData.tasks.length} 個任務\n- ${exportData.ganttSystem.projects.length} 個專案\n- ${exportData.accounting.transactions.length} 筆記帳記錄`);
    } catch (error) {
        console.error('Export error:', error);
        alert('導出失敗：' + error.message);
    }
};

window.importLocalData = function () {
    const fileInput = document.getElementById('importFileInput');
    if (!fileInput) {
        alert('文件輸入元素未找到');
        return;
    }

    fileInput.click();
};

// Handle file selection for import
document.addEventListener('DOMContentLoaded', () => {
    // Bind export/import buttons
    const exportBtn = document.getElementById('exportLocalDataBtn');
    const importBtn = document.getElementById('importLocalDataBtn');
    if (exportBtn) {
        exportBtn.onclick = window.exportLocalData;
        console.log('Export button bound');
    }
    if (importBtn) {
        importBtn.onclick = window.importLocalData;
        console.log('Import button bound');
    }

    // Bind file input
    const fileInput = document.getElementById('importFileInput');
    if (fileInput) {
        fileInput.onchange = function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                try {
                    const content = event.target.result;
                    const importedData = JSON.parse(content);

                    // Validate required fields
                    if (!importedData.tasks && !importedData.ganttSystem && !importedData.accounting) {
                        throw new Error('無效的備份文件：缺少必要欄位');
                    }

                    // Show summary
                    const taskCount = (importedData.tasks || []).length;
                    const projectCount = ((importedData.ganttSystem || {}).projects || []).length;
                    const transactionCount = ((importedData.accounting || {}).transactions || []).length;

                    const confirmMsg = `確定要載入此備份嗎？\n\n備份資訊：\n- 任務：${taskCount} 個\n- 專案：${projectCount} 個\n- 記帳記錄：${transactionCount} 筆\n\n警告：這將完全覆蓋當前所有數據！`;

                    if (!confirm(confirmMsg)) {
                        fileInput.value = ''; // Reset file input
                        return;
                    }

                    // Restore data
                    state.tasks = importedData.tasks || [];
                    state.ganttSystem = importedData.ganttSystem || { projects: [] };
                    state.accounting = importedData.accounting || { transactions: [], banks: [], categories: [] };
                    state.stockPrice = importedData.stockPrice || 100;
                    state.history = importedData.history || [];
                    state.lastLoginDate = importedData.lastLoginDate || '';

                    // Validate and repair
                    validateAndRepairState();

                    // Save to cloud
                    saveState('LocalImport');

                    alert('資料載入成功！即將重新整理頁面...');
                    setTimeout(() => window.location.reload(), 500);

                } catch (error) {
                    console.error('Import error:', error);
                    alert('載入失敗：' + error.message);
                }

                // Reset file input
                fileInput.value = '';
            };

            reader.onerror = function () {
                alert('文件讀取失敗');
                fileInput.value = '';
            };

            reader.readAsText(file);
        };
    }
});

// Update sync status display in data view
window.updateDataSyncStatus = function (status) {
    const el = document.getElementById('dataSyncStatus');
    if (!el) return;

    switch (status) {
        case 'Synced':
            el.textContent = '● 已同步 (雲端)';
            el.style.color = 'var(--accent-green)';
            break;
        case 'Offline':
            el.textContent = '○ 離線模式';
            el.style.color = 'var(--text-secondary)';
            break;
        case 'Error':
            el.textContent = '⚠ 同步異常';
            el.style.color = 'var(--accent-red)';
            break;
        case 'Loading':
            el.textContent = '◌ 同步中...';
            el.style.color = 'var(--accent-blue)';
            break;
    }
};

// Update diagnostic stats in data view
window.updateDataDiagnosticStats = function () {
    const statsEl = document.getElementById('dataDiagnosticStats');
    const rawEl = document.getElementById('dataDebugRaw');
    if (!statsEl) return;

    const taskCount = state.tasks ? state.tasks.length : 0;
    const projectCount = (state.ganttSystem && state.ganttSystem.projects) ? state.ganttSystem.projects.length : 0;
    const lastUpdate = state.updatedAt ? new Date(state.updatedAt).toLocaleString() : '無';

    statsEl.innerHTML = `任務數: ${taskCount} | 企劃數: ${projectCount} | 最後更新: ${lastUpdate}`;
    if (rawEl) {
        rawEl.textContent = JSON.stringify(state, null, 2);
    }
};

// ============================================
// Cloud Backup System
// ============================================

// Helper: Get date string with offset
function getDateStrOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return getLocalDateStr(d);
}

// Check and perform daily backup
async function checkAndPerformDailyBackup() {
    try {
        const today = getLocalDateStr();
        const lastBackupDate = localStorage.getItem('lastBackupDate');

        console.log(`Checking daily backup: today=${today}, lastBackup=${lastBackupDate}`);

        if (lastBackupDate !== today) {
            console.log('Performing daily backup...');
            await performDailyBackup();
            localStorage.setItem('lastBackupDate', today);
            console.log('Daily backup completed');
        }
    } catch (error) {
        console.error('Daily backup check failed:', error);
    }
}

// Perform daily backup
async function performDailyBackup() {
    if (!db) {
        console.warn('Firestore not available, skipping backup');
        return;
    }

    try {
        const yesterday = getDateStrOffset(-1);
        const backupId = `backup-${yesterday}`;

        const backupData = {
            backupDate: yesterday,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            data: {
                tasks: state.tasks || [],
                ganttSystem: state.ganttSystem || { projects: [] },
                accounting: state.accounting || { transactions: [], banks: [], categories: [] },
                stockPrice: state.stockPrice || 100,
                history: state.history || [],
                lastLoginDate: state.lastLoginDate || ''
            }
        };

        await db.collection('dailyBackups').doc(backupId).set(backupData);
        console.log(`Daily backup created: ${backupId}`);

        // Cleanup old backups
        await cleanupOldBackups();
    } catch (error) {
        console.error('Failed to perform daily backup:', error);
        throw error;
    }
}

// Cleanup old backups (keep only last 2 days)
async function cleanupOldBackups() {
    if (!db) return;

    try {
        const twoDaysAgo = getDateStrOffset(-2);
        const snapshot = await db.collection('dailyBackups')
            .where('backupDate', '<', twoDaysAgo)
            .get();

        if (snapshot.empty) {
            console.log('No old backups to clean up');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            console.log(`Deleting old backup: ${doc.id}`);
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${snapshot.size} old backups`);
    } catch (error) {
        console.error('Failed to cleanup old backups:', error);
    }
}

// Manual cloud backup
window.createManualCloudBackup = async function () {
    if (!db) {
        alert('雲端服務未連接');
        return;
    }

    if (!confirm('確定要手動創建雲端備份嗎？')) {
        return;
    }

    try {
        const timestamp = Date.now();
        const today = getLocalDateStr();
        const backupId = `manual-${timestamp}`;

        const backupData = {
            backupDate: today,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isManual: true,
            data: {
                tasks: state.tasks || [],
                ganttSystem: state.ganttSystem || { projects: [] },
                accounting: state.accounting || { transactions: [], banks: [], categories: [] },
                stockPrice: state.stockPrice || 100,
                history: state.history || [],
                lastLoginDate: state.lastLoginDate || ''
            }
        };

        await db.collection('dailyBackups').doc(backupId).set(backupData);

        const taskCount = state.tasks.length;
        const projectCount = (state.ganttSystem && state.ganttSystem.projects) ? state.ganttSystem.projects.length : 0;
        const transactionCount = (state.accounting && state.accounting.transactions) ? state.accounting.transactions.length : 0;

        alert(`雲端備份成功！\n\n備份內容：\n- 任務：${taskCount} 個\n- 專案：${projectCount} 個\n- 記帳：${transactionCount} 筆`);
    } catch (error) {
        console.error('Manual backup failed:', error);
        alert('雲端備份失敗：' + error.message);
    }
};

// List cloud backups
window.listCloudBackups = async function () {
    if (!db) {
        alert('雲端服務未連接');
        return;
    }

    const listEl = document.getElementById('cloudBackupList');
    if (!listEl) return;

    try {
        listEl.classList.remove('hidden');
        listEl.innerHTML = '<div style="text-align:center; padding:10px;">正在載入雲端備份...</div>';

        const snapshot = await db.collection('dailyBackups')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            listEl.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-secondary);">目前沒有雲端備份</div>';
            return;
        }

        let html = '<div style="margin-bottom:8px; font-weight:bold; border-bottom: 1px solid var(--border-color); padding-bottom:8px;">可用的雲端備份</div>';

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const backupDate = data.backupDate || '未知';
            const createdAt = data.createdAt ? data.createdAt.toDate().toLocaleString('zh-TW') : '未知';
            const isManual = data.isManual ? ' (手動)' : ' (自動)';

            const taskCount = (data.data && data.data.tasks) ? data.data.tasks.length : 0;
            const projectCount = (data.data && data.data.ganttSystem && data.data.ganttSystem.projects) ? data.data.ganttSystem.projects.length : 0;

            html += `
                <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding:8px 0; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="color:var(--accent-blue);">${backupDate}${isManual}</strong>
                        <button onclick="restoreFromCloudBackup('${doc.id}')" class="btn-confirm small" style="font-size:0.7rem; padding:4px 10px; background:var(--accent-green);">還原</button>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">
                        創建時間：${createdAt}<br>
                        任務：${taskCount} | 專案：${projectCount}
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    } catch (error) {
        console.error('Failed to list cloud backups:', error);
        listEl.innerHTML = '<div style="color:var(--accent-red); padding:10px;">載入失敗：' + error.message + '</div>';
    }
};

// Restore from cloud backup
window.restoreFromCloudBackup = async function (backupId) {
    if (!db) {
        alert('雲端服務未連接');
        return;
    }

    try {
        const doc = await db.collection('dailyBackups').doc(backupId).get();
        if (!doc.exists) {
            alert('備份不存在');
            return;
        }

        const backupData = doc.data();
        const taskCount = (backupData.data && backupData.data.tasks) ? backupData.data.tasks.length : 0;
        const projectCount = (backupData.data && backupData.data.ganttSystem && backupData.data.ganttSystem.projects) ? backupData.data.ganttSystem.projects.length : 0;
        const transactionCount = (backupData.data && backupData.data.accounting && backupData.data.accounting.transactions) ? backupData.data.accounting.transactions.length : 0;

        const confirmMsg = `確定要從此備份還原數據嗎？\n\n備份信息：\n- 備份日期：${backupData.backupDate}\n- 任務：${taskCount} 個\n- 專案：${projectCount} 個\n- 記帳：${transactionCount} 筆\n\n警告：這將完全覆蓋當前所有數據！`;

        if (!confirm(confirmMsg)) {
            return;
        }

        // Restore data
        state.tasks = backupData.data.tasks || [];
        state.ganttSystem = backupData.data.ganttSystem || { projects: [] };
        state.accounting = backupData.data.accounting || { transactions: [], banks: [], categories: [] };
        state.stockPrice = backupData.data.stockPrice || 100;
        state.history = backupData.data.history || [];
        state.lastLoginDate = backupData.data.lastLoginDate || '';

        // Validate and repair
        validateAndRepairState();

        // Save to cloud
        saveState('CloudBackupRestore');

        alert('數據還原成功！即將重新整理頁面...');
        setTimeout(() => window.location.reload(), 500);

    } catch (error) {
        console.error('Failed to restore from cloud backup:', error);
        alert('還原失敗：' + error.message);
    }
};

// Bind cloud backup buttons in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const createBtn = document.getElementById('createCloudBackupBtn');
    const listBtn = document.getElementById('listCloudBackupsBtn');

    if (createBtn) {
        createBtn.onclick = window.createManualCloudBackup;
        console.log('Cloud backup create button bound');
    }
    if (listBtn) {
        listBtn.onclick = window.listCloudBackups;
        console.log('Cloud backup list button bound');
    }
});


// ============================================
// Calendar Rendering with Today Highlight
// ============================================

// Add this to ensure calendar rendering has today highlight
// This should be called when schedule view is rendered
window.renderCalendarWithTodayHighlight = function () {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    const today = getLocalDateStr();

    // Find all calendar day elements and add today class to matching date
    const dayElements = calendarGrid.querySelectorAll('.calendar-day');
    dayElements.forEach(dayEl => {
        const dayDate = dayEl.dataset.date; // Assumes calendar days have data-date attribute
        if (dayDate === today) {
            dayEl.classList.add('today');
        }
    });
};

// Patch renderView to call calendar highlight when switching to schedule
const originalRenderView = window.renderView || renderView;
if (typeof originalRenderView === 'function') {
    window.renderView = function (viewName) {
        originalRenderView(viewName);

        if (viewName === 'schedule') {
            // Wait for DOM update then highlight today
            setTimeout(() => {
                renderCalendarWithTodayHighlight();
            }, 10);
        }
    };
}

