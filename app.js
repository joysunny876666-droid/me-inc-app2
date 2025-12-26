// --- State Management ---
const defaultState = {
    stockPrice: 100.00,
    history: [],
    tasks: [],
    lastLoginDate: '',
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
    }
};

// Initial state (will be overwritten by Cloud data)
let state = defaultState;
let currentView = 'start';
let currentMonth = new Date();
let chartInstance = null;
let kLineChartInstance = null;

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

// --- Helper: Local Date String (YYYY-MM-DD) ---
function getLocalDateStr(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- DOM Elements ---
const els = {
    views: {
        start: document.getElementById('startView'),
        add: document.getElementById('addView'),
        schedule: document.getElementById('scheduleView'),
        focusedGantt: document.getElementById('focusedGanttView'),
        data: document.getElementById('dataView'),
        accounting: document.getElementById('accountingView')
    },
    nav: {
        addBtn: document.getElementById('navAddBtn'),
        scheduleBtn: document.getElementById('navScheduleBtn'),
        accountingBtn: document.getElementById('navAccountingBtn'),
    },
    backBtns: {
        fromAdd: document.getElementById('backFromAddBtn'),
        fromSchedule: document.getElementById('backFromScheduleBtn'),
        fromGantt: document.getElementById('backFromGanttBtn')
    },
    dashboard: {
        price: document.getElementById('currentPrice'),
        change: document.getElementById('priceChange'),
        dailyList: document.getElementById('dailyRoutineList'),
        allList: document.getElementById('allTaskList'),
        importantList: document.getElementById('importantTaskList'),
        searchInput: document.getElementById('searchDateInput'),
        searchBtn: document.getElementById('searchBtn'),
        focusedList: document.getElementById('focusedGanttList') // New List
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
        taskId: document.getElementById('editTaskId'),
        taskDate: document.getElementById('editTaskDate'),
        originalDate: document.getElementById('editOriginalDate'),
        isMission: document.getElementById('editIsMission'),
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
        tableContainer: document.getElementById('dataTableContainer')
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

    // Auto-refresh Time Table (every minute)
    setInterval(() => {
        if (currentView === 'start') renderStartPage();
    }, 60000);

    // Check immediate penalties every minute
    setInterval(checkImmediatePenalties, 60000);

    // Start Cloud Sync
    setupCloudSync();
}

function setupCloudSync() {
    // Listen to changes in 'state' document
    db.collection('data').doc('state').onSnapshot((doc) => {
        if (doc.exists) {
            console.log("Cloud data received");
            const cloudData = doc.data();
            // Merge with default to ensure structure
            state = { ...defaultState, ...cloudData };
        } else {
            console.log("No cloud data, creating initial...");
            // New user or cleared DB, save default
            saveState();
        }

        // After data updates, check logic and render
        checkDailyPenaltiesOnLoad();
        checkImmediatePenalties();
        renderView(currentView || 'start');
    }, (error) => {
        console.error("Sync error:", error);
        alert("連線資料庫失敗，請檢查網路或是 API 金鑰。目前使用離線模式。");
    });
}

function saveState() {
    // Save to Firestore
    db.collection('data').doc('state').set(state)
        .then(() => console.log("State saved to Cloud"))
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
    if (els.data.headerBackBtn) els.data.headerBackBtn.onclick = () => renderView('start');
    if (els.data.bottomBackBtn) els.data.bottomBackBtn.onclick = () => renderView('start');
    if (els.data.navBtn) els.data.navBtn.onclick = () => renderView('data');
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
        const dStr = curr.toISOString().split('T')[0];
        const tasks = getTasksForDate(dStr);
        tasks.forEach(task => {
            // Apply penalty if ANY Task is not completed and has score
            if (task.score > 0) {
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
    saveState();
}

function checkImmediatePenalties() {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const currentTimeStr = now.toTimeString().slice(0, 5);

    state.tasks.forEach(task => {
        // Critical Overdue Logic
        if (task.importance === 'critical' && task.time && task.score > 0) {
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
function renderView(viewName) {
    currentView = viewName; // Update global state
    Object.values(els.views).forEach(v => { if (v) v.classList.add('hidden'); });
    if (els.views[viewName]) els.views[viewName].classList.remove('hidden');
    if (viewName === 'start') renderStartPage();
    if (viewName === 'schedule') renderCalendar(currentMonth);
    if (viewName === 'focusedGantt') renderFocusedGantt();
    if (viewName === 'data') renderDataView();
    if (viewName === 'accounting') renderAccountingView();
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
            if (!category) return alert('請輸入自訂名稱');
        }
        const bankId = parseInt(acc.bank.value);
        const date = acc.date.value;

        const transaction = {
            id: Date.now(),
            amount,
            category,
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
        incomeList.innerHTML = incomes.map(t => `
            <div class="task-item" style="justify-content: space-between;">
                <div>
                    <div style="font-size:0.9rem;">${t.category}</div>
                    <div style="font-size:0.75rem; color:gray;">${t.date}</div>
                </div>
                <span style="color:var(--accent-green); font-weight:700;">+${t.amount.toLocaleString()}</span>
            </div>
        `).join('');
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
        ex.dayList.innerHTML = transactions.map(t => `
            <div class="task-item" style="justify-content: space-between;">
                <div>
                    <div style="font-size:0.9rem; font-weight:600;">${t.category}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:var(--accent-red); font-weight:700;">${t.amount.toLocaleString()}</span>
                    <button onclick="editAccountingTransaction(${t.id})" class="btn-icon-small">✏️</button>
                    <button onclick="removeAccountingTransaction(${t.id})" class="btn-icon-small">🗑️</button>
                </div>
            </div>
        `).join('');
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
    els.accounting.expenseModal.dayDetail.classList.add('hidden');
}

function editAccountingTransaction(id) {
    const t = state.accounting.transactions.find(x => x.id === id);
    if (!t) return;
    const newAmount = parseFloat(prompt('修改金額為:', t.amount.toString()));
    if (isNaN(newAmount)) return;

    const bank = state.accounting.banks.find(b => b.id === t.bankId);
    if (bank) bank.balance = bank.balance - t.amount + newAmount;

    t.amount = newAmount;
    saveState();
    renderAccountingView();
    renderAccountingExpenseCalendar();
    els.accounting.expenseModal.dayDetail.classList.add('hidden');
}

function renderDataView() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    if (els.data.dateLabel) els.data.dateLabel.textContent = `${yesterdayStr} 數據回顧`;

    const tasks = getTasksForDate(yesterdayStr);
    let totalChange = 0;

    tasks.forEach(task => {
        const isCompleted = task.completedHistory && task.completedHistory[yesterdayStr];
        const isPenalized = task.penaltyHistory && task.penaltyHistory[yesterdayStr];
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
                    <th style="text-align:right;">狀態</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(task => {
            const isCompleted = task.completedHistory && task.completedHistory[yesterdayStr];
            const isPenalized = task.penaltyHistory && task.penaltyHistory[yesterdayStr];

            let scoreDisplay = '0';
            let statusText = '執行中';
            let statusClass = 'status-info';

            if (isCompleted) {
                scoreDisplay = `${task.score >= 0 ? '+' : ''}${task.score}`;
                statusText = '已完成';
                statusClass = 'status-success';
            } else if (isPenalized) {
                // If it was penalized, the score was subtracted
                scoreDisplay = `-${task.score}`;
                statusText = '自動扣分';
                statusClass = 'status-warning';
            }

            return `
                        <tr>
                            <td>${task.name}</td>
                            <td style="text-align:center; font-family:monospace; font-weight:600; color:${isPenalized ? 'var(--accent-red)' : (isCompleted ? 'var(--accent-green)' : 'inherit')}">${scoreDisplay}</td>
                            <td style="text-align:right;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        `;
        els.data.tableContainer.appendChild(table);
    }
}

function renderFocusedGantt() {
    const todayStr = getLocalDateStr();
    const tasks = getTasksForDate(todayStr); // All today's tasks
    // Filter only ranged tasks
    const rangedTasks = tasks.filter(t => t.time && t.endTime);

    // Sort by time
    rangedTasks.sort((a, b) => a.time.localeCompare(b.time));

    const container = els.dashboard.focusedList;
    if (!container) return;
    container.innerHTML = '';

    if (rangedTasks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">今日無時段行程</p>';
        return;
    }

    const timeToPercent = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        const totalMin = h * 60 + m;
        return (totalMin / (24 * 60)) * 100;
    };

    rangedTasks.forEach(task => {
        const startP = timeToPercent(task.time);
        const endP = timeToPercent(task.endTime);
        const widthP = endP - startP;

        const el = document.createElement('div');
        el.className = 'focused-task-row';

        const isCompleted = task.completedHistory && task.completedHistory[todayStr];

        el.innerHTML = `
            <div class="focused-task-left">
                <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
                <div class="task-info">
                    <span class="task-name" style="${isCompleted ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${task.name}</span>
                    <span class="task-meta">${task.time} - ${task.endTime}</span>
                </div>
            </div>
            <div class="focused-task-right">
                <div class="time-grid-line" style="left:0%"></div>
                <div class="time-grid-line" style="left:25%"></div> <!-- 06:00 -->
                <div class="time-grid-line" style="left:50%"></div> <!-- 12:00 -->
                <div class="time-grid-line" style="left:75%"></div> <!-- 18:00 -->
                <div class="time-bar" style="left:${startP}%; width:${widthP}%; background-color: ${isCompleted ? 'var(--accent-green)' : 'var(--accent-blue)'};"></div>
            </div>
        `;

        const checkbox = el.querySelector('.task-checkbox');
        checkbox.onchange = () => {
            // Reuse toggleTask logic but refresh current view
            toggleTask(task.id, todayStr, checkbox.checked);
            renderFocusedGantt(); // Re-render to update bar color etc
        };

        container.appendChild(el);
    });
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
            // If they are NOT completed yet, or were completed ON this date, they appear.
            // If they were completed BEFORE this date, they stop appearing.
            if (firstCompletionDate && firstCompletionDate < dateStr) return false;
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
            <span class="task-name" style="${isCompleted ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
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
    task.completedHistory[dateStr] = isChecked;

    if (isChecked && !wasChecked) {
        state.stockPrice += task.score;
    } else if (!isChecked && wasChecked) {
        state.stockPrice -= task.score;
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

    // Prepare Data
    let data = state.history.slice();
    const todayStr = getLocalDateStr();

    // Always ensure today is in dataset for visualization
    if (!data.find(h => h.date === todayStr)) {
        data.push({ date: todayStr, price: state.stockPrice });
    }
    // Update today's price in data view if strictly needed
    const todayEntry = data.find(h => h.date === todayStr);
    if (todayEntry) todayEntry.price = state.stockPrice;

    const ctxLine = document.getElementById('mainChart');
    const ctxK = document.getElementById('kLineChart');
    const ctxGantt = document.getElementById('ganttChart'); // Gantt Canvas

    if (!ctxLine || !ctxK || !ctxGantt) return;

    // Destroy old
    if (chartInstance) chartInstance.destroy();
    if (kLineChartInstance) kLineChartInstance.destroy();

    // Line Chart
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
    let ganttChartInstance = window.ganttChartInstance;
    if (ganttChartInstance) ganttChartInstance.destroy();

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

        // Indicators
        const tasks = getTasksForDate(dateStr);
        if (tasks.length > 0) {
            const hasImportant = tasks.some(t => ['critical', 'high'].includes(t.importance));
            const dot = document.createElement('div');
            dot.className = `day-indicator ${hasImportant ? 'has-important' : ''}`;
            cell.appendChild(dot);
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

    if (task.type === 'recurring') {
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
            const taskId = parseInt(els.editModal.taskId.value);
            const originalDate = els.editModal.originalDate.value;
            const newDate = els.editModal.taskDate.value; // User might have changed this
            const newName = els.editModal.name.value;
            const newTime = els.editModal.time.value;
            const newEndTime = els.editModal.endTime ? els.editModal.endTime.value : null;
            const newIsMission = els.editModal.isMission ? els.editModal.isMission.checked : false;

            if (newEndTime && newTime && newEndTime <= newTime) return alert('結束時間必須晚於開始時間');

            if (!newName) return alert('請輸入名稱');
            if (!newDate) return alert('請輸入日期');

            const task = state.tasks.find(t => t.id === taskId);
            if (!task) return;

            editPendingData = { name: newName, time: newTime, endTime: newEndTime, newDate: newDate, isMission: newIsMission };
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
                task.date = newDate; // Update Date
                task.isMission = newIsMission;
                finishEdit();
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

function mapImportance(imp) {
    const map = { critical: '重要', high: '還好', medium: '輕微', low: '不重要', daily: '日常' };
    return map[imp] || imp;
}

// Start
init();
