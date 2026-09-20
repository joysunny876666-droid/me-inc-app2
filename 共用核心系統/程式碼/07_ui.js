// 模組 07: UI 框架、DOM 元素對應與初始化 (UI Framework & App Init)

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
        badHabitList: document.getElementById('badHabitTaskList'),
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
        // Edit Transaction Modal
        editTransactionModal: {
            el: document.getElementById('accountingEditTransactionModal'),
            form: document.getElementById('accountingEditTransactionForm'),
            id: document.getElementById('accEditId'),
            amount: document.getElementById('accEditAmount'),
            name: document.getElementById('accEditName'),
            category: document.getElementById('accEditCategory'),
            bank: document.getElementById('accEditBank'),
            date: document.getElementById('accEditDate'),
            closeBtn: document.getElementById('closeAccEditBtn'),
            cancelBtn: document.getElementById('cancelAccEditBtn')
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
        if (!state.actionLog) state.actionLog = [];
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


function setupEventListeners() {
    console.log("Setting up event listeners...");

    // --- NEW: Manual Sync Connectors ---
    const btnManualDownload = document.getElementById('btnManualDownload');
    if (btnManualDownload) {
        btnManualDownload.onclick = async () => {
            if (!db) return alert("資料庫未連接！");
            if (confirm("【警告】這將會用雲端的資料直接「覆蓋」你現在手機上的資料。確定嗎？")) {
                btnManualDownload.textContent = "下載中...";
                try {
                    const doc = await db.collection('data').doc('state').get();
                    if (doc.exists) {
                        state = { ...defaultState, ...doc.data() };
                        validateAndRepairState();
                        // Force local save without triggering cloud save immediately
                        state.updatedAt = Date.now();
                        localStorage.setItem('me-inc-state', JSON.stringify(state));
                        
                        alert("✅ 成功從雲端下載！");
                        renderStartPage();
                    } else {
                        alert("雲端沒有任何資料可下載。");
                    }
                } catch (err) {
                    console.error("Manual Download Error:", err);
                    alert("下載失敗：" + err.message);
                } finally {
                    btnManualDownload.textContent = "📥 下載雲端紀錄";
                }
            }
        };
    }

    const btnManualUpload = document.getElementById('btnManualUpload');
    if (btnManualUpload) {
        btnManualUpload.onclick = () => {
             if (!db) return alert("資料庫未連接！");
             if (confirm("這將會把你目前看到的分數和清單「強制備份」到雲端，給其他裝置使用。確定嗎？")) {
                 btnManualUpload.textContent = "上傳中...";
                 saveState("ManualUserUpload");
                 setTimeout(() => {
                     btnManualUpload.textContent = "📤 覆寫至雲端";
                     alert("✅ 已成功備份至雲端！");
                 }, 1000);
             }
        };
    }

    // --- NEW: Force save on app background/close for mobile reliability ---
    document.addEventListener('visibilitychange', () => {
        // Run immediately when page goes to background
        if (document.visibilityState === 'hidden') {
            console.log("App moved to background, ensuring state is saved.");
            saveState("AppBackgrounded");
        }
    });

    // --- NEW: Sync Debug Click Handler ---
    const syncIndicatorEl = document.getElementById('syncStatusIndicator');
    if (syncIndicatorEl) {
        syncIndicatorEl.style.cursor = 'pointer';
        syncIndicatorEl.onclick = () => {
            let msg = `[連線狀態診斷]\n目前狀態: ${syncIndicatorEl.textContent}\n是否有資料庫實體: ${typeof db !== 'undefined' ? '有' : '無'}\n連線是否啟動: ${isCloudSyncStarted ? '是' : '否'}\n最後本地存檔時間: ${state.updatedAt ? new Date(state.updatedAt).toLocaleString() : '無'}`;

            alert(msg);
        };
    }

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
    // BUG-01 修復: 補上甘特圖按鈕的 onclick 事件
    if (els.nav.ganttBtn) {
        els.nav.ganttBtn.onclick = () => {
            console.log("Clicked: Gantt Button");
            renderView('ganttMain');
        };
    }


    // First searchBtn binding removed; the second one handles Smart Search.

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
    'add': () => { if(window.updateAddViewRightSidebar) window.updateAddViewRightSidebar(); },
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
                appVersion: "7.0",
                appName: "時間管理大師"
            },
            tasks: state.tasks || [],
            ganttSystem: state.ganttSystem || { projects: [] },
            accounting: state.accounting || { transactions: [], banks: [], categories: [] },
            stockPrice: state.stockPrice || 100,
            history: state.history || [],
            lastLoginDate: state.lastLoginDate || '',
            actionLog: state.actionLog || []
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
                    state.actionLog = importedData.actionLog || [];

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
                lastLoginDate: state.lastLoginDate || '',
                actionLog: state.actionLog || []
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
                lastLoginDate: state.lastLoginDate || '',
                actionLog: state.actionLog || []
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
        state.actionLog = backupData.data.actionLog || [];

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

    const accRecoveryBtn = document.getElementById('accDataRecoveryBtn');
    if (accRecoveryBtn) {
        accRecoveryBtn.onclick = () => {
            // Close settings first
            const settingsModal = document.getElementById('accountingSettingsModal');
            if (settingsModal) settingsModal.classList.add('hidden');

            // Switch to Data View
            if (typeof renderView === 'function') renderView('data');

            // Trigger Scan
            setTimeout(() => {
                if (window.scanForBackups) window.scanForBackups();
            }, 500);
        };
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


