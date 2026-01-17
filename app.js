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

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyAa0xcoNbVHc_bzAI53WK2XbU41xJJP4q0",
    authDomain: "me-inc-db.firebaseapp.com",
    projectId: "me-inc-db",
    storageBucket: "me-inc-db.firebasestorage.app",
    messagingSenderId: "598336717364",
    appId: "1:598336717364:web:a56fa398689fedf2fec061",
    measurementId: "G-707RMW9027"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Helper: Date Utilities ---
const getLocalDateStr = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
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
        focusedList: document.getElementById('focusedGanttList'), // Obsolete
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
    setupEventListeners();
    setupEditListeners();
    setupAccountingListeners();
    setupGanttListeners(); // Integrated directly

    // Auto-refresh (every minute)
    setInterval(() => {
        if (currentView === 'start') renderStartPage();
    }, 60000);

    // Check immediate penalties every minute
    setInterval(checkImmediatePenalties, 60000);

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
}

function setupCloudSync() {
    // Listen to changes in 'state' document
    db.collection('data').doc('state').onSnapshot((doc) => {
        if (doc.exists) {
            console.log("Cloud data received");
            const cloudData = doc.data();

            // --- NEW: Sync Conflict Resolution ---
            // If local data is newer, don't overwrite with older cloud data
            if (cloudData.updatedAt && state.updatedAt && cloudData.updatedAt < state.updatedAt) {
                console.log("Cloud data is older than local, ignoring cloud update");
                isCloudSyncStarted = true;
                return;
            }

            // Merge with default to ensure structure
            state = { ...defaultState, ...cloudData };
            isCloudSyncStarted = true;
        } else {
            console.log("No cloud data, creating initial...");
            // New user or cleared DB, permit sync and save default
            isCloudSyncStarted = true;
            saveState();
        }

        // After data updates, check logic and render
        checkDailyPenaltiesOnLoad();
        checkImmediatePenalties();

        // --- NEW: Automatic Cleanup ---
        runAutomaticCleanup();

        renderView(currentView || 'start');
    }, (error) => {
        console.error("Sync error:", error);
        alert("連線資料庫失敗，請檢查網路或是 API 金鑰。目前使用離線模式。");
    });
}

function saveState() {
    if (!isCloudSyncStarted) {
        console.warn("Save blocked: Cloud sync not yet started or initialized.");
        return;
    }

    // Update timestamp
    state.updatedAt = Date.now();

    // Save to Firestore
    db.collection('data').doc('state').set(state)
        .then(() => console.log("State saved to Cloud " + new Date(state.updatedAt).toLocaleTimeString()))
        .catch((e) => {
            console.error("Save failed", e);
            alert("儲存失敗！請檢查 Firebase 權限設定 (Rules) 是否已開啟測試模式。\n錯誤訊息: " + e.message);
        });
}

function setupEventListeners() {
    if (els.nav.addBtn) els.nav.addBtn.onclick = () => renderView('add');
    if (els.nav.scheduleBtn) els.nav.scheduleBtn.onclick = () => renderView('schedule');

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
            els.addForm.form.reset();
            els.addForm.inputs.recurrenceGroup.classList.add('hidden');
            els.addForm.inputs.dateGroup.classList.remove('hidden');
            // Reset Time Range UI
            els.addForm.inputs.endTimeGroup.classList.add('hidden');
        };
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
function runAutomaticCleanup() {
    const today = new Date();
    const todayStr = getLocalDateStr(today);

    // 1. Cleanup Calendar Tasks (Completed > 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = getLocalDateStr(thirtyDaysAgo);

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

    // 2. Cleanup Gantt Projects (Completed > 30 days)
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects = state.ganttSystem.projects.filter(p => {
            if (p.completed && p.endDate < thirtyDaysAgoStr) return false;
            return true;
        });
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
            // Drop it
        } else {
            keepTransactions.push(t);
        }
    });
    state.accounting.transactions = keepTransactions;

    saveState();
}

// --- Penalty Logic ---
function checkDailyPenaltiesOnLoad() {
    if (!state.lastLoginDate) {
        state.lastLoginDate = getLocalDateStr();
        saveState();
        return;
    }
    const todayStr = getLocalDateStr();
    const lastLogin = state.lastLoginDate;

    let curr = new Date(lastLogin);
    const end = new Date(todayStr);

    while (curr < end) {
        const dStr = getLocalDateStr(curr);
        const tasks = getTasksForDate(dStr);
        tasks.forEach(task => {
            // Apply penalty if ANY Task is not completed and has score
            if (task.score > 0 && !task.isPersistent) { // NEW: Skip persistent tasks
                if (!task.penaltyHistory) task.penaltyHistory = {};
                const isCompleted = task.completedHistory && task.completedHistory[dStr];

                if (!isCompleted && !task.penaltyHistory[dStr]) {
                    state.stockPrice -= task.score;
                    task.penaltyHistory[dStr] = true;
                }
            }
        });
        curr.setDate(curr.getDate() + 1);
    }
    state.lastLoginDate = todayStr;

    // Gantt Project Penalties
    if (state.ganttSystem && state.ganttSystem.projects) {
        state.ganttSystem.projects.forEach(proj => {
            if (!proj.completed && todayStr > proj.endDate && !proj.penaltyApplied) {
                state.stockPrice -= proj.score;
                proj.penaltyApplied = true;
                console.log(`Penalty applied for project: ${proj.name}`);
            }
        });
    }

    saveState();
}

function checkImmediatePenalties() {
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
                        renderStartPage();
                    }
                }
            }
        }
    });
    saveState();
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
        const bank = state.accounting.banks.find(b => b.id === bankId);
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
    if (typeof Chart === 'undefined') return;

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

    // This is tricky: we need cumulative balance.
    // For simplicity, we'll show daily net change or just mockup the trend based on current balance and recent transactions.
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

    accLineChartInstance = new Chart(els.accounting.charts.lineCanvas.getContext('2d'), {
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
    const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    accPieChartInstance = new Chart(els.accounting.charts.pieCanvas.getContext('2d'), {
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
                <span class="legend-amount">${categoryTotals[label].toLocaleString()}</span>
            </div>
        `).join('');
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
    const bank = state.accounting.banks.find(b => b.id === id);
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
    const t = state.accounting.transactions.find(x => x.id === id);
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
    const t = state.accounting.transactions.find(x => x.id === id);
    if (!t) return;

    const newName = prompt('修改項目名稱 (留空則不變):', t.name || '');
    const newAmount = prompt('修改金額為:', t.amount.toString());

    if (newAmount === null) return;
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum)) return alert('金額格式錯誤');

    const bank = state.accounting.banks.find(b => b.id === t.bankId);
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

    tasks.forEach(task => {
        const isCompleted = task.completedHistory && task.completedHistory[targetStr];
        const isPenalized = task.penaltyHistory && task.penaltyHistory[targetStr];
        if (isCompleted) totalChange += task.score;
        else if (isPenalized) totalChange -= task.score;
    });

    if (els.data.totalChange) {
        els.data.totalChange.textContent = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}`;
        els.data.totalChange.className = `price-value ${totalChange >= 0 ? 'price-up' : 'price-down'}`;
    }

    if (els.data.tableContainer) {
        els.data.tableContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>項目</th>
                    <th style="text-align:center;">得分異動</th>
                    <th style="text-align:right;">操作</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => {
            const isCompleted = task.completedHistory && task.completedHistory[targetStr];
            const isPenalized = task.penaltyHistory && task.penaltyHistory[targetStr];

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

            const canUndo = isCompleted || isPenalized;

            return `
                        <tr>
                            <td>
                                <div>${task.name}</div>
                                <div style="font-size:0.7rem; color:var(--text-secondary);">${statusText}</div>
                            </td>
                            <td style="text-align:center; font-family:monospace; font-weight:600; color:${isPenalized ? 'var(--accent-red)' : (isCompleted ? 'var(--accent-green)' : 'inherit')}">${scoreDisplay}</td>
                            <td style="text-align:right;">
                                ${canUndo ? `<button onclick="undoTaskAction(${task.id}, '${targetStr}')" class="btn-icon-small" title="撤銷">撤銷</button>` : '-'}
                            </td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        `;
        els.data.tableContainer.appendChild(table);
    }
}

function undoTaskAction(taskId, dateStr) {
    const task = state.tasks.find(t => t.id === taskId);
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
            const applies = getTasksForDate(dStr).some(t => t.id === task.id);
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
        dailyRoutineTasks.forEach(task => els.dashboard.dailyList.appendChild(createTaskEl(task, todayStr, false)));
    }

    // 2. All Schedule (All Today)
    const allPointTasks = todaysTasks;
    allPointTasks.sort(timeSort);
    if (els.dashboard.allList) {
        els.dashboard.allList.innerHTML = '';
        allPointTasks.forEach(task => els.dashboard.allList.appendChild(createTaskEl(task, todayStr, false)));
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
                // diffDays % (7 * interval) === 0 checks if it's exactly N weeks apart on the same day
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

function createTaskEl(task, dateStr, showDateLabel) {
    const el = document.createElement('div');
    el.className = 'task-item';

    const isCompleted = task.completedHistory && task.completedHistory[dateStr];
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
    checkbox.onchange = () => toggleTask(task.id, dateStr, checkbox.checked);

    return el;
}

function toggleTask(taskId, dateStr, isChecked) {
    const task = state.tasks.find(t => t.id === taskId);
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

                    // Past items (Gray out if not done?) or just blue
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
}

// --- Add Logic ---
function handleAddSubmit(e) {
    e.preventDefault();

    const name = els.addForm.inputs.name.value;
    const isRecurring = document.querySelector('input[name="isRecurring"]:checked').value === 'yes';
    const recurrenceType = els.addForm.inputs.recurrenceType.value;
    const recurrenceInterval = parseInt(els.addForm.inputs.recurrenceInterval.value) || 1;
    const recurrenceStartDate = els.addForm.inputs.recurrenceStartDate.value;

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

    // Validation
    if (!name) return alert('請輸入名稱');
    if (!isRecurring && !date) return alert('請選擇日期');

    const now = new Date();
    const todayStr = getLocalDateStr(now);

    const newTask = {
        id: Date.now(),
        createdAt: isRecurring ? (recurrenceStartDate || todayStr) : date,
        name,
        type: isRecurring ? 'recurring' : 'scheduled',
        isMission: isMission || false,
        isPersistent: isPersistent || false,
        recurrence: isRecurring ? {
            type: recurrenceType,
            interval: recurrenceInterval,
            startDate: recurrenceStartDate || todayStr
        } : null,
        date: isRecurring ? null : date,
        time: time || null,
        endTime: endTime || null, // Save endTime
        exceptions: [],
        importance,
        score,
        completedHistory: {}
    };

    state.tasks.push(newTask);
    saveState();

    alert('已新增！');
    if (els.addForm.form) els.addForm.form.reset();

    // Reset state
    if (els.addForm.inputs.recurrenceGroup) els.addForm.inputs.recurrenceGroup.classList.add('hidden');
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

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

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
            // Single Cancel
            if (!taskToDelete.exceptions) taskToDelete.exceptions = [];
            taskToDelete.exceptions.push(dateToDelete);
            finishDelete();
        };

        els.deleteModal.btnAll.onclick = () => {
            // All Cancel - Ask Confirmation
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
        // Single Task
        if (confirm('確定要取消此行程嗎？')) {
            state.tasks = state.tasks.filter(t => t.id !== taskToDelete.id);
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
    if (els.editModal.score) els.editModal.score.value = task.score; // New Score Field
    if (els.editModal.isMission) els.editModal.isMission.checked = task.isMission || false;

    els.editModal.el.classList.remove('hidden');

    if (els.modal.el) els.modal.el.classList.add('hidden');
}

function setupEditListeners() {
    if (els.editModal.closeBtn) els.editModal.closeBtn.onclick = () => els.editModal.el.classList.add('hidden');
    if (els.editModal.cancelBtn) els.editModal.cancelBtn.onclick = () => els.editModal.el.classList.add('hidden');

    if (els.editModal.form) {
        els.editModal.form.onsubmit = (e) => {
            e.preventDefault();
            const taskId = els.editModal.taskId.value; // Store as string first (Gantt IDs might be string or number)
            const originalDate = els.editModal.originalDate.value;
            const newDate = els.editModal.taskDate.value;
            const newName = els.editModal.name.value;
            const newTime = els.editModal.time.value;
            const newEndTime = els.editModal.endTime ? els.editModal.endTime.value : null;
            const newScore = parseFloat(els.editModal.score.value);
            const newIsMission = els.editModal.isMission ? els.editModal.isMission.checked : false;
            const newIsPersistent = els.editModal.isPersistent ? els.editModal.isPersistent.checked : false;

            if (newEndTime && newTime && newEndTime <= newTime) return alert('結束時間必須晚於開始時間');
            if (!newName) return alert('請輸入名稱');
            if (!newDate) return alert('請輸入日期');
            if (isNaN(newScore)) return alert('請輸入分數');

            // Find Task (Check Regular then Gantt)
            let task = state.tasks.find(t => t.id == taskId);
            let isGantt = false;

            if (!task) {
                // Try finding in Gantt
                if (state.ganttSystem && state.ganttSystem.projects) {
                    for (const proj of state.ganttSystem.projects) {
                        for (const parent of proj.parents) {
                            const child = parent.children.find(c => c.id == taskId);
                            if (child) {
                                task = child;
                                isGantt = true;
                                break;
                            }
                        }
                        if (task) break;
                    }
                }
            }

            if (!task) return;

            // Handle Save
            if (isGantt) {
                // If it's a Gantt task, update properties directly
                task.name = newName;
                task.score = newScore;

                // If Date/Time is provided, we treat it as "Scheduling" this Gantt task
                // Which effectively creates a linked scheduled task (as per completeMove logic)
                // But users might expect the Gantt task itself to change. 
                // Creating a scheduled copy is safer for now to preserve Gantt structure.
                if (newTime) {
                    const newTask = {
                        id: Date.now(),
                        name: newName, // Use edit name (might remove [Project] prefix if user wants)
                        type: 'scheduled',
                        date: newDate,
                        time: newTime,
                        score: newScore,
                        isMission: newIsMission,
                        isPersistent: newIsPersistent,
                        createdAt: new Date().toISOString()
                    };
                    if (newEndTime) newTask.endTime = newEndTime;
                    state.tasks.push(newTask);

                    // Mark Gantt child as completed? Or just leave it?
                    // User request: "Edit (Name, Score, Date, Time Range)"
                    // If they set a date/time, it should appear on schedule.
                }
                // If no time set, we just updated the Gantt child's properties above.

                finishEdit();
                // Special refresh for Gantt
                renderWeeklySchedule();
            } else {
                // Regular Task
                editPendingData = { name: newName, time: newTime, endTime: newEndTime, newDate: newDate, score: newScore, isMission: newIsMission, isPersistent: newIsPersistent };
                taskToEdit = task;
                editOriginalDateVal = originalDate;

                if (task.type === 'recurring') {
                    // Ask Scope
                    els.editScopeModal.el.classList.remove('hidden');
                } else {
                    // Direct Save (Scheduled)
                    task.name = newName;
                    task.time = newTime;
                    task.endTime = newEndTime;
                    task.date = newDate;
                    task.score = newScore;
                    task.isMission = newIsMission;
                    task.isPersistent = newIsPersistent;
                    finishEdit();
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
    // 1. Add exception to old (Using ORIGINAL Date)
    if (!taskToEdit.exceptions) taskToEdit.exceptions = [];
    taskToEdit.exceptions.push(editOriginalDateVal);

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
    // 1. End old task yesterday relative to ORIGINAL Date
    // This effectively stops the series before the instance we are editing.
    const targetDate = new Date(editOriginalDateVal);
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    taskToEdit.recurrence.endDate = yesterdayStr;

    // 2. Create new Recurring Task starting from NEW Date
    const newTask = {
        ...taskToEdit,
        id: Date.now(), // New ID
        name: editPendingData.name,
        time: editPendingData.time,
        endTime: editPendingData.endTime,
        isMission: editPendingData.isMission,
        isPersistent: editPendingData.isPersistent,
        createdAt: editPendingData.newDate,
        recurrence: {
            ...taskToEdit.recurrence,
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
    const proj = state.ganttSystem.projects.find(p => p.id === projId);
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
    const proj = state.ganttSystem.projects.find(p => p.id === projId);

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
    state.ganttSystem.projects = state.ganttSystem.projects.filter(p => p.id !== projId);
    saveState();
    els.gantt.projEditModal.el.classList.add('hidden');
    renderGanttMainPage();
}

function openEditGanttModal(projId, parentId, id, type) {
    const proj = state.ganttSystem.projects.find(p => p.id === projId);
    let item;
    if (type === 'parent') {
        item = proj.parents.find(p => p.id === id);
        document.getElementById('editGanttImportanceGroup').classList.add('hidden');
    } else {
        const parent = proj.parents.find(p => p.id === parentId);
        item = parent.children.find(c => c.id === id);
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

    const proj = state.ganttSystem.projects.find(p => p.id === projId);
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

    const proj = state.ganttSystem.projects.find(p => p.id === projId);

    if (type === 'parent') {
        proj.parents = proj.parents.filter(p => p.id !== id);
    } else {
        // Find parent and remove child
        const parent = findGanttItem(proj.parents, parentId || '');
        if (parent && parent.children) {
            parent.children = parent.children.filter(c => c.id !== id);
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
        const totalItems = proj.parents.length + proj.parents.reduce((acc, p) => acc + p.children.length, 0);
        const completedItems = proj.parents.filter(p => p.completed).length +
            proj.parents.reduce((acc, p) => acc + p.children.filter(c => c.completed).length, 0);
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        // Find today's task
        let todayTaskHtml = '<div style="font-size: 0.8rem; color: gray;">今日無任務</div>';
        const todayChild = proj.parents.flatMap(p => p.children).find(c => todayStr >= c.startDate && todayStr <= c.endDate && !c.completed);
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
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            ${todayTaskHtml}
            <button class="btn-secondary small full-width" style="margin-top: 10px;" onclick="viewProjectDetail('${proj.id}')">查看詳細 / 任務管理</button>
        `;
        container.appendChild(card);
    });
}

function viewProjectDetail(projId) {
    const proj = state.ganttSystem.projects.find(p => p.id === projId);
    if (!proj) return;

    renderView('ganttProjectDetail');
    els.gantt.projDetailTitle.textContent = proj.name;
    const container = els.gantt.projDetailContent;
    container.innerHTML = '';

    proj.parents.forEach((parent, pIdx) => {
        const isLocked = pIdx > 0 && !proj.parents[pIdx - 1].completed;
        container.appendChild(renderGanttItemRecursive(proj, null, parent, 0, isLocked));
    });

    // Add "Next Parent" button at the bottom
    const addParentBtn = document.createElement('button');
    addParentBtn.className = 'btn-primary full-width';
    addParentBtn.style.marginTop = '20px';
    addParentBtn.textContent = '+ 新增下一個父任務';
    addParentBtn.onclick = () => {
        // Open the project edit modal but specifically for adding a parent
        openEditGanttProjectModal(projId);
        // We might want to scroll to the parent list in that modal
    };
    container.appendChild(addParentBtn);
}

function renderGanttItemRecursive(proj, parentId, item, level, isLocked) {
    const isParent = level === 0;
    const div = document.createElement('div');
    div.className = isParent ? `parent-task-item ${isLocked ? 'task-locked' : ''}` : `child-task-item ${item.importance || 'medium'}`;
    div.style.marginLeft = level > 0 ? '15px' : '0';

    const hasChildren = item.children && item.children.length > 0;

    // Check if this specific item is disabled
    // If it's a child with nested children, it can only be completed if its children are all done.
    const childrenAllDone = areChildrenCompletedRecursive(item);
    const canCheck = !isLocked && childrenAllDone;
    const canUncheck = item.completed && (isParent ? !proj.completed : true); // Simplified: can always uncheck if completed

    const itemHtml = `
        <div class="${isParent ? 'parent-header' : 'item-header'}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <input type="checkbox" class="task-checkbox" 
                    ${item.completed ? 'checked' : ''} 
                    ${(item.completed || canCheck) ? '' : 'disabled'}
                    onchange="toggleGanttItem('${proj.id}', '${parentId || ''}', '${item.id}', this.checked)">
                <span style="font-weight: ${isParent ? '700' : 'normal'}; ${item.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${item.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                 <span style="font-size: 0.75rem; color: var(--text-secondary);">${item.score} 分</span>
                 <button class="btn-icon-small" onclick="openEditGanttModal('${proj.id}', '${parentId || ''}', '${item.id}', '${isParent ? 'parent' : 'child'}')">✏️</button>
                 <button class="btn-add-small" onclick="openAddChildModal('${proj.id}', '${item.id}')" ${item.completed ? 'disabled' : ''}>+ 子任務</button>
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

function findGanttItem(items, id) {
    for (const it of items) {
        if (it.id === id) return it;
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
    const proj = state.ganttSystem.projects.find(p => p.id === projId);
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    // Is it a parent? (level 0)
    const isParent = proj.parents.some(p => p.id === id);

    if (item.completed && !isChecked) {
        state.stockPrice -= item.score;
        item.completed = false;
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
    const proj = state.ganttSystem.projects.find(p => p.id === projId);

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
    const proj = state.ganttSystem.projects.find(p => p.id === projId);
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

function mapImportance(imp) {
    const map = { critical: '重要', high: '還好', medium: '輕微', low: '不重要', daily: '日常' };
    return map[imp] || imp;
}

// Start
init();
// --- System Updates ---
window.forceUpdate = async function () {
    if (!confirm('是否強制清除快取並更新至最新版本？(將會重新整理頁面)')) return;

    alert('正在清理系統快取...');

    try {
        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Clear Cache Storage
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
