// ============================================================
// 模組 04: 記帳系統 (Accounting System)
// ============================================================
// 這個檔案包含所有和「記帳」相關的功能。
// 設計概念：支援多帳戶（銀行/現金錢包），追蹤每筆收支，
//          並提供視覺化圖表幫助了解消費習慣。
//
// 包含：
//   - 渲染記帳主頁 (renderAccountingView)
//   - 新增/刪除/編輯交易 (addTransaction, etc.)
//   - 圓餅圖支出分析 (renderSpendingChart)
//   - 帳戶設定管理 (renderBankSettings, renderCategorySettings)
//   - 查看帳戶/類別詳細資料 (viewBankDetail, viewCategoryDetail)
//
// 所有記帳資料儲存在 state.accounting 子物件中。
// ============================================================

// ─────────────────────────────────────────────
// § 1. 事件監聽器設置 (setupAccountingListeners)
// ─────────────────────────────────────────────
/**
 * 【setupAccountingListeners】綁定記帳相關頁面的所有互動事件
 * 在 init() 啟動時被呼叫一次，設定好所有按鈕和表單的事件處理器。
 */
function setupAccountingListeners() {
    const acc = els.accounting;
    const nav = els.nav;
    const back = els.backBtns;

    // ─ 導覽按鈕 ─
    if (nav.accountingBtn) nav.accountingBtn.onclick = () => renderView('accounting');
    if (back.fromAccounting) back.fromAccounting.onclick = () => renderView('start');

    // ─ 新增交易按鈕 ─
    if (acc.openAddFormBtn) acc.openAddFormBtn.onclick = () => {
        acc.addForm.reset();
        populateFormSelects(); // 填入所有帳戶和類別選項
        acc.section.add.classList.remove('hidden');
        acc.section.list.classList.add('hidden');
        acc.section.chart.classList.add('hidden');
        acc.section.settings.classList.add('hidden');
    };

    // ─ 新增交易表單送出 ─
    if (acc.addForm) acc.addForm.onsubmit = handleAddTransactionSubmit;

    // ─ 分頁切換按鈕（全部/收入/支出） ─
    if (acc.viewAllBtn) acc.viewAllBtn.onclick = () => {
        acc.section.add.classList.add('hidden');
        acc.section.list.classList.remove('hidden');
        acc.section.chart.classList.add('hidden');
        acc.section.settings.classList.add('hidden');
        renderTransactionList('all');
    };

    if (acc.viewChartBtn) acc.viewChartBtn.onclick = () => {
        acc.section.add.classList.add('hidden');
        acc.section.list.classList.add('hidden');
        acc.section.chart.classList.remove('hidden');
        acc.section.settings.classList.add('hidden');
        renderSpendingChart();
    };

    if (acc.viewSettingsBtn) acc.viewSettingsBtn.onclick = () => {
        acc.section.add.classList.add('hidden');
        acc.section.list.classList.add('hidden');
        acc.section.chart.classList.add('hidden');
        acc.section.settings.classList.remove('hidden');
        renderBankSettings();
        renderCategorySettings();
    };

    // ─ 帳戶設定相關按鈕 ─
    if (acc.addBankBtn) acc.addBankBtn.onclick = handleAddBank;
    if (acc.addCategoryBtn) acc.addCategoryBtn.onclick = handleAddCategory;

    // ─ 詳細頁面的返回按鈕 ─
    if (back.fromBankDetail) back.fromBankDetail.onclick = () => {
        renderView('accounting');
        setTimeout(() => {
            els.accounting.section.settings.classList.remove('hidden');
            renderBankSettings();
            renderCategorySettings();
        }, 50);
    };

    if (back.fromCategoryDetail) back.fromCategoryDetail.onclick = () => {
        renderView('accounting');
        setTimeout(() => {
            els.accounting.section.settings.classList.remove('hidden');
            renderBankSettings();
            renderCategorySettings();
        }, 50);
    };

    // ─ 編輯交易 Modal ─
    if (acc.editModal && acc.editModal.closeBtn) acc.editModal.closeBtn.onclick = () => acc.editModal.el.classList.add('hidden');
    if (acc.editModal && acc.editModal.cancelBtn) acc.editModal.cancelBtn.onclick = () => acc.editModal.el.classList.add('hidden');
    if (acc.editModal && acc.editModal.form) acc.editModal.form.onsubmit = handleEditTransactionSubmit;
}

// ─────────────────────────────────────────────
// § 2. 渲染記帳主頁 (renderAccountingView)
// ─────────────────────────────────────────────
/**
 * 【renderAccountingView】渲染記帳首頁的帳戶總覽卡片
 * 顯示每個帳戶（現金/銀行）的當前餘額。
 */
function renderAccountingView() {
    const container = els.accounting.accountCards;
    if (!container) return;
    container.innerHTML = '';

    state.accounting.banks.forEach(bank => {
        const card = document.createElement('div');
        card.className = 'account-card';
        const balance = bank.balance || 0;
        card.innerHTML = `
            <div class="account-name">${bank.name}</div>
            <div class="account-balance ${balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                $${balance.toLocaleString()}
            </div>
        `;
        card.onclick = () => viewBankDetail(bank.id);
        container.appendChild(card);
    });
}

// ─────────────────────────────────────────────
// § 3. 新增交易 (handleAddTransactionSubmit)
// ─────────────────────────────────────────────
/**
 * 【handleAddTransactionSubmit】處理新增交易表單的送出
 * 從表單中取出所有欄位，建立交易物件，並更新對應帳戶的餘額。
 */
function handleAddTransactionSubmit(e) {
    e.preventDefault();
    const acc = els.accounting;

    const description = acc.inputs.description.value;
    const amount = parseFloat(acc.inputs.amount.value);
    const type = acc.inputs.type.value; // 'income' 或 'expense'
    const bankId = parseInt(acc.inputs.bank.value);
    const categoryId = parseInt(acc.inputs.category.value);
    const date = acc.inputs.date.value || getLocalDateStr();

    if (isNaN(amount) || amount <= 0) return alert('請輸入有效金額');

    // 依收入/支出決定正負值（支出為負）
    const signedAmount = type === 'income' ? Math.abs(amount) : -Math.abs(amount);

    const newTransaction = {
        id: Date.now(),
        description,
        amount: signedAmount,
        bankId,
        categoryId,
        date,
        createdAt: new Date().toISOString()
    };

    state.accounting.transactions.push(newTransaction);

    // 更新帳戶餘額
    const bank = state.accounting.banks.find(b => b.id == bankId);
    if (bank) bank.balance = (bank.balance || 0) + signedAmount;

    saveState();
    renderAccountingView();

    // 顯示成功訊息然後返回列表
    acc.section.add.classList.add('hidden');
    acc.section.list.classList.remove('hidden');
    renderTransactionList('all');
    alert('已新增交易！');
}

// ─────────────────────────────────────────────
// § 4. 填入表單選項 (populateFormSelects)
// ─────────────────────────────────────────────
/**
 * 【populateFormSelects】在新增交易表單中，動態填入帳戶和類別的下拉選項
 * 確保每次開啟表單時都顯示最新的帳戶/類別列表。
 */
function populateFormSelects() {
    const bankSelect = els.accounting.inputs.bank;
    const categorySelect = els.accounting.inputs.category;

    if (bankSelect) {
        bankSelect.innerHTML = state.accounting.banks
            .map(b => `<option value="${b.id}">${b.name}</option>`)
            .join('');
    }
    if (categorySelect) {
        categorySelect.innerHTML = state.accounting.categories
            .map(c => `<option value="${c.id}">${c.name}</option>`)
            .join('');
    }
}

// ─────────────────────────────────────────────
// § 5. 渲染交易清單 (renderTransactionList)
// ─────────────────────────────────────────────
/**
 * 【renderTransactionList】渲染交易記錄列表
 * @param {string} filter - 'all' | 'income' | 'expense'
 */
function renderTransactionList(filter = 'all') {
    const container = els.accounting.transactionList;
    if (!container) return;
    container.innerHTML = '';

    let transactions = [...state.accounting.transactions];
    transactions.sort((a, b) => b.date.localeCompare(a.date)); // 最新的在前

    // 依過濾條件篩選
    if (filter === 'income') transactions = transactions.filter(t => t.amount > 0);
    if (filter === 'expense') transactions = transactions.filter(t => t.amount < 0);

    if (transactions.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:gray; padding:20px;">無交易記錄</div>';
        return;
    }

    transactions.forEach(t => {
        const bank = state.accounting.banks.find(b => b.id == t.bankId);
        const category = state.accounting.categories.find(c => c.id == t.categoryId);

        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
            <div class="transaction-info">
                <div class="transaction-desc">${t.description || '無描述'}</div>
                <div class="transaction-meta">${t.date} | ${bank?.name || '未知帳戶'} | ${category?.name || '未知類別'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div class="transaction-amount ${t.amount >= 0 ? 'income' : 'expense'}">
                    ${t.amount >= 0 ? '+' : ''}$${Math.abs(t.amount).toLocaleString()}
                </div>
                <button onclick="editTransaction(${t.id})" class="btn-icon">✏️</button>
                <button onclick="removeTransaction(${t.id})" class="btn-icon">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// ─────────────────────────────────────────────
// § 6. 支出圓餅圖 (renderSpendingChart)
// ─────────────────────────────────────────────
/**
 * 【renderSpendingChart】渲染支出分析圓餅圖
 * 依類別計算各類支出總額，並繪製成圓餅圖讓使用者直觀了解消費結構。
 */
function renderSpendingChart() {
    const canvas = document.getElementById('spendingChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // 銷毀舊圖表
    if (window.spendingChartInstance) {
        window.spendingChartInstance.destroy();
        window.spendingChartInstance = null;
    }

    // 按類別彙總支出
    const categoryTotals = {};
    state.accounting.transactions.forEach(t => {
        if (t.amount < 0) { // 只計算支出
            const category = state.accounting.categories.find(c => c.id == t.categoryId);
            const name = category?.name || '其他';
            categoryTotals[name] = (categoryTotals[name] || 0) + Math.abs(t.amount);
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (labels.length === 0) {
        canvas.parentElement.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">尚無支出記錄</p>';
        return;
    }

    // 調色盤：和 CSS 主題色保持一致
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    window.spendingChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'doughnut', // 甜甜圈圖（圓餅圖的空心版）
        data: {
            labels,
            datasets: [{ data, backgroundColor: palette, borderWidth: 0 }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8b949e' } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: $${ctx.raw.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// ─────────────────────────────────────────────
// § 7. 刪除/編輯交易
// ─────────────────────────────────────────────
/**
 * 【removeTransaction】刪除一筆交易並相應調整帳戶餘額
 */
function removeTransaction(id) {
    const t = state.accounting.transactions.find(t => t.id == id);
    if (!t) return;

    if (confirm(`確定要刪除這筆交易：「${t.description}」嗎？`)) {
        // 在刪除前，把這筆金額「退還」回帳戶
        const bank = state.accounting.banks.find(b => b.id == t.bankId);
        if (bank) bank.balance -= t.amount; // 反向操作

        state.accounting.transactions = state.accounting.transactions.filter(item => item.id != id);
        saveState();
        renderAccountingView();
        renderTransactionList('all');
    }
}

/**
 * 【editTransaction】開啟編輯交易的 Modal
 */
function editTransaction(id) {
    const t = state.accounting.transactions.find(t => t.id == id);
    if (!t || !els.accounting.editModal) return;

    const em = els.accounting.editModal;

    // 填入現有資料
    em.inputs.editId.value = t.id;
    em.inputs.editDescription.value = t.description || '';
    em.inputs.editAmount.value = Math.abs(t.amount);
    em.inputs.editType.value = t.amount >= 0 ? 'income' : 'expense';
    em.inputs.editDate.value = t.date;

    // 填入帳戶和類別選項
    if (em.inputs.editBank) {
        em.inputs.editBank.innerHTML = state.accounting.banks
            .map(b => `<option value="${b.id}" ${b.id == t.bankId ? 'selected' : ''}>${b.name}</option>`)
            .join('');
    }
    if (em.inputs.editCategory) {
        em.inputs.editCategory.innerHTML = state.accounting.categories
            .map(c => `<option value="${c.id}" ${c.id == t.categoryId ? 'selected' : ''}>${c.name}</option>`)
            .join('');
    }

    em.el.classList.remove('hidden');
}

/**
 * 【handleEditTransactionSubmit】處理編輯交易表單的送出
 */
function handleEditTransactionSubmit(e) {
    e.preventDefault();
    const em = els.accounting.editModal;

    const id = parseInt(em.inputs.editId.value);
    const t = state.accounting.transactions.find(t => t.id == id);
    if (!t) return;

    const newAmount = parseFloat(em.inputs.editAmount.value);
    const newType = em.inputs.editType.value;
    const signedNewAmount = newType === 'income' ? Math.abs(newAmount) : -Math.abs(newAmount);
    const newBankId = parseInt(em.inputs.editBank.value);

    // 先把舊交易的金額退還給舊帳戶
    const oldBank = state.accounting.banks.find(b => b.id == t.bankId);
    if (oldBank) oldBank.balance -= t.amount;

    // 更新交易資料
    t.description = em.inputs.editDescription.value;
    t.amount = signedNewAmount;
    t.bankId = newBankId;
    t.categoryId = parseInt(em.inputs.editCategory.value);
    t.date = em.inputs.editDate.value;

    // 把新金額加入新帳戶
    const newBank = state.accounting.banks.find(b => b.id == newBankId);
    if (newBank) newBank.balance += signedNewAmount;

    saveState();
    em.el.classList.add('hidden');
    renderAccountingView();
    renderTransactionList('all');
}

// ─────────────────────────────────────────────
// § 8. 帳戶與類別管理 (Settings)
// ─────────────────────────────────────────────
/**
 * 【renderBankSettings】在設定頁渲染帳戶管理清單
 */
function renderBankSettings() {
    const container = els.accounting.bankList;
    if (!container) return;
    container.innerHTML = '';

    state.accounting.banks.forEach(bank => {
        const item = document.createElement('div');
        item.className = 'settings-item';
        item.innerHTML = `
            <div>
                <div class="settings-name">${bank.name}</div>
                <div class="settings-balance">餘額: $${(bank.balance || 0).toLocaleString()}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="viewBankDetail(${bank.id})" class="btn-secondary small">詳細</button>
                <button onclick="removeBank(${bank.id})" class="btn-icon">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });
}

/**
 * 【handleAddBank】新增一個帳戶（銀行/錢包）
 */
function handleAddBank() {
    const nameEl = els.accounting.newBankName;
    const balanceEl = els.accounting.newBankBalance;
    if (!nameEl) return;

    const name = nameEl.value.trim();
    const balance = parseFloat(balanceEl?.value || '0') || 0;
    if (!name) return alert('請輸入帳戶名稱');

    state.accounting.banks.push({ id: Date.now(), name, balance });
    if (nameEl) nameEl.value = '';
    if (balanceEl) balanceEl.value = '';

    saveState();
    renderBankSettings();
    renderAccountingView();
}

/**
 * 【removeBank】刪除一個帳戶
 */
function removeBank(id) {
    if (!confirm('確定要刪除此帳戶嗎？相關交易記錄不會被刪除。')) return;
    state.accounting.banks = state.accounting.banks.filter(b => b.id != id);
    saveState();
    renderBankSettings();
    renderAccountingView();
}

/**
 * 【renderCategorySettings】在設定頁渲染類別管理清單
 */
function renderCategorySettings() {
    const container = els.accounting.categoryList;
    if (!container) return;
    container.innerHTML = '';

    state.accounting.categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'settings-item';
        item.innerHTML = `
            <span class="settings-name">${cat.name}</span>
            <div style="display:flex; gap:8px;">
                <button onclick="viewCategoryDetail(${cat.id})" class="btn-secondary small">詳細</button>
                <button onclick="removeCategory(${cat.id})" class="btn-icon">🗑️</button>
            </div>
        `;
        container.appendChild(item);
    });
}

/**
 * 【handleAddCategory】新增一個支出分類
 */
function handleAddCategory() {
    const nameEl = els.accounting.newCategoryName;
    if (!nameEl) return;
    const name = nameEl.value.trim();
    if (!name) return alert('請輸入類別名稱');

    state.accounting.categories.push({ id: Date.now(), name });
    nameEl.value = '';
    saveState();
    renderCategorySettings();
}

/**
 * 【removeCategory】刪除一個支出分類
 */
function removeCategory(id) {
    if (!confirm('確定要刪除此類別嗎？')) return;
    state.accounting.categories = state.accounting.categories.filter(c => c.id != id);
    saveState();
    renderCategorySettings();
}

// ─────────────────────────────────────────────
// § 9. 帳戶 & 類別詳細頁面
// ─────────────────────────────────────────────
/**
 * 【viewBankDetail】顯示某個帳戶的所有相關交易紀錄
 */
function viewBankDetail(bankId) {
    const bank = state.accounting.banks.find(b => b.id == bankId);
    if (!bank) return;

    renderView('bankDetail');
    const titleEl = document.getElementById('bankDetailTitle');
    const listEl = document.getElementById('bankDetailList');
    if (titleEl) titleEl.textContent = `${bank.name} 交易記錄`;

    const bankTransactions = state.accounting.transactions
        .filter(t => t.bankId == bankId)
        .sort((a, b) => b.date.localeCompare(a.date));

    if (!listEl) return;
    listEl.innerHTML = '';

    if (bankTransactions.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:gray;">無交易記錄</p>';
        return;
    }

    // 顯示帳戶餘額
    const balanceDiv = document.createElement('div');
    balanceDiv.style.cssText = 'text-align:center; font-size:1.5rem; font-weight:bold; margin-bottom:15px; color:var(--accent-green);';
    balanceDiv.textContent = `當前餘額: $${(bank.balance || 0).toLocaleString()}`;
    listEl.appendChild(balanceDiv);

    bankTransactions.forEach(t => {
        const category = state.accounting.categories.find(c => c.id == t.categoryId);
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div>
                <div>${t.description || '無描述'}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${t.date} | ${category?.name || '未知類別'}</div>
            </div>
            <div class="transaction-amount ${t.amount >= 0 ? 'income' : 'expense'}">
                ${t.amount >= 0 ? '+' : ''}$${Math.abs(t.amount).toLocaleString()}
            </div>
        `;
        listEl.appendChild(div);
    });
}

/**
 * 【viewCategoryDetail】顯示某個類別的所有相關交易紀錄
 */
function viewCategoryDetail(catId) {
    const cat = state.accounting.categories.find(c => c.id == catId);
    if (!cat) return;

    renderView('categoryDetail');
    const titleEl = document.getElementById('categoryDetailTitle');
    const listEl = document.getElementById('categoryDetailList');
    if (titleEl) titleEl.textContent = `${cat.name} 消費記錄`;

    const catTransactions = state.accounting.transactions
        .filter(t => t.categoryId == catId)
        .sort((a, b) => b.date.localeCompare(a.date));

    if (!listEl) return;
    listEl.innerHTML = '';

    if (catTransactions.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:gray;">無消費記錄</p>';
        return;
    }

    const total = catTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalDiv = document.createElement('div');
    totalDiv.style.cssText = 'text-align:center; font-size:1.2rem; margin-bottom:15px;';
    totalDiv.innerHTML = `總計: <span style="color:${total >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:bold;">$${Math.abs(total).toLocaleString()}</span>`;
    listEl.appendChild(totalDiv);

    catTransactions.forEach(t => {
        const bank = state.accounting.banks.find(b => b.id == t.bankId);
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
            <div>
                <div>${t.description || '無描述'}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${t.date} | ${bank?.name || '未知帳戶'}</div>
            </div>
            <div class="transaction-amount ${t.amount >= 0 ? 'income' : 'expense'}">
                ${t.amount >= 0 ? '+' : ''}$${Math.abs(t.amount).toLocaleString()}
            </div>
        `;
        listEl.appendChild(div);
    });
}

// 暴露到全局，讓 HTML 的 onclick 可以使用
window.removeTransaction = removeTransaction;
window.editTransaction = editTransaction;
window.removeBank = removeBank;
window.viewBankDetail = viewBankDetail;
window.removeCategory = removeCategory;
window.viewCategoryDetail = viewCategoryDetail;
