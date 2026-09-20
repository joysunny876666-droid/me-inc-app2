// 模組 04: 記帳系統 (Accounting System)

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

    // Edit Transaction Modal
    if (acc.editTransactionModal.closeBtn) acc.editTransactionModal.closeBtn.onclick = () => acc.editTransactionModal.el.classList.add('hidden');
    if (acc.editTransactionModal.cancelBtn) acc.editTransactionModal.cancelBtn.onclick = () => acc.editTransactionModal.el.classList.add('hidden');
    if (acc.editTransactionModal.form) acc.editTransactionModal.form.onsubmit = handleEditAccountingTransactionSubmit;

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
    
    ex.calendarGrid.style.gridTemplateColumns = 'repeat(8, 1fr)';

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Mon-Sun

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Headers
    ['一', '二', '三', '四', '五', '六', '日', '總和'].forEach(day => {
        const d = document.createElement('div');
        d.className = 'calendar-day-header';
        d.textContent = day;
        if (day === '總和') {
            d.style.color = 'var(--accent-red)';
            d.style.fontSize = '0.8rem';
        }
        ex.calendarGrid.appendChild(d);
    });

    let currentWeekSum = 0;
    let currentDayOfWeek = 0;

    for (let i = 0; i < firstDay; i++) {
        // Calculate the date in the previous month
        const prevDate = new Date(year, month, 1 - firstDay + i);
        const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
        
        const dayTotal = state.accounting.transactions
            .filter(t => t.date === dStr && t.amount < 0)
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
            
        currentWeekSum += dayTotal;
        
        ex.calendarGrid.appendChild(document.createElement('div'));
        currentDayOfWeek++;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTotal = state.accounting.transactions
            .filter(t => t.date === dStr && t.amount < 0)
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);
            
        currentWeekSum += dayTotal;

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
        
        currentDayOfWeek++;
        
        if (currentDayOfWeek === 7 || i === daysInMonth) {
            if (i === daysInMonth && currentDayOfWeek < 7) {
                const nextMonthDays = 7 - currentDayOfWeek;
                for (let j = 0; j < nextMonthDays; j++) {
                    const nextDate = new Date(year, month + 1, 1 + j);
                    const dStrNext = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
                    
                    const nextDayTotal = state.accounting.transactions
                        .filter(t => t.date === dStrNext && t.amount < 0)
                        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
                        
                    currentWeekSum += nextDayTotal;
                    
                    ex.calendarGrid.appendChild(document.createElement('div'));
                }
            }
            
            const sumCell = document.createElement('div');
            sumCell.className = 'calendar-day';
            sumCell.style.background = 'rgba(239, 68, 68, 0.1)';
            sumCell.style.cursor = 'default';
            sumCell.innerHTML = `<span class="day-number" style="color:var(--accent-red);font-size:0.8rem;">週計</span>`;
            const amountLabel = document.createElement('div');
            amountLabel.style.fontSize = '0.75rem';
            amountLabel.style.color = currentWeekSum > 0 ? 'var(--accent-red)' : 'gray';
            amountLabel.style.fontWeight = 'bold';
            amountLabel.textContent = currentWeekSum.toLocaleString();
            sumCell.appendChild(amountLabel);
            ex.calendarGrid.appendChild(sumCell);
            
            currentWeekSum = 0;
            currentDayOfWeek = 0;
        }
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

    const em = els.accounting.editTransactionModal;
    if (!em || !em.el) return;

    em.id.value = t.id;
    em.amount.value = t.amount;
    em.name.value = t.name || '';
    em.date.value = t.date;

    // Populate categories
    em.category.innerHTML = state.accounting.categories.map(c => 
        `<option value="${c.id}" ${c.id == t.categoryId ? 'selected' : ''}>${c.name}</option>`
    ).join('');
    
    // Populate banks
    em.bank.innerHTML = state.accounting.banks.map(b => 
        `<option value="${b.id}" ${b.id == t.bankId ? 'selected' : ''}>${b.name} ($${b.balance.toLocaleString()})</option>`
    ).join('');

    em.el.classList.remove('hidden');
}

function handleEditAccountingTransactionSubmit(e) {
    e.preventDefault();
    const em = els.accounting.editTransactionModal;
    const id = parseInt(em.id.value);
    const t = state.accounting.transactions.find(x => x.id == id);
    if (!t) return;

    const newAmount = parseFloat(em.amount.value);
    if (isNaN(newAmount)) return alert('金額格式錯誤');
    
    const newName = em.name.value.trim();
    const newCategoryId = parseInt(em.category.value);
    const newBankId = parseInt(em.bank.value);
    const newDate = em.date.value;

    // Handle bank balance changes
    const oldBank = state.accounting.banks.find(b => b.id == t.bankId);
    const newBank = state.accounting.banks.find(b => b.id == newBankId);
    
    if (oldBank && newBank) {
        if (oldBank.id === newBank.id) {
            oldBank.balance = oldBank.balance - t.amount + newAmount;
        } else {
            oldBank.balance -= t.amount; // Revert old transaction
            newBank.balance += newAmount; // Apply to new bank
        }
    }

    t.amount = newAmount;
    t.name = newName;
    t.categoryId = newCategoryId;
    t.bankId = newBankId;
    t.date = newDate;

    em.el.classList.add('hidden');
    
    saveState();
    renderAccountingView();
    renderAccountingExpenseCalendar();
    renderAccountingBankDetail();
    // Keep detail view if open, or refresh it
    if (els.accounting.expenseModal.dayDetail && !els.accounting.expenseModal.dayDetail.classList.contains('hidden')) {
        showAccountingDayDetail(t.date);
    }
}

// 暴露到全局
window.removeAccountingTransaction = removeAccountingTransaction;
window.editAccountingTransaction = editAccountingTransaction;
window.removeBank = removeBank;
window.addAccountingBank = addAccountingBank;
window.removeCategory = removeCategory;
window.adjustBankBalance = adjustBankBalance;
