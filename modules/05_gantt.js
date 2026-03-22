// ============================================================
// 模組 05: 甘特圖 & 企劃管理 (Gantt Chart System)
// ============================================================
// 「甘特圖」原本是一種專案管理工具，用水平長條圖顯示每個任務的時間範圍。
// 在這個 APP 裡，甘特圖系統讓你管理「大型企劃」，
// 把一個大目標分解成「父任務 → 子任務」的樹狀結構，
// 並追蹤每個項目的完成狀況。
//
// 資料結構：
//   state.ganttSystem.projects[]  → 企劃
//     └── .parents[]              → 父任務（階段）
//           └── .children[]       → 子任務（具體工作）
//
// 包含：
//   - 企劃列表渲染 (renderGanttMainPage)
//   - 企劃詳情 (viewProjectDetail)
//   - 甘特圖視覺化 (renderGanttVisualization)
//   - 新增/編輯/刪除企劃和任務
//   - 勾選完成 (toggleGanttItem)
//   - 企劃完成獎勵 (checkProjectCompletion)
// ============================================================

// ─────────────────────────────────────────────
// § 1. 事件監聽器設置 (setupGanttListeners)
// ─────────────────────────────────────────────
/**
 * 【setupGanttListeners】綁定甘特圖相關頁面的所有互動事件
 * 在 init() 啟動時被呼叫一次。
 */
function setupGanttListeners() {
    const g = els.gantt;
    const nav = els.nav;
    const back = els.backBtns;

    if (nav.ganttBtn) nav.ganttBtn.onclick = () => renderView('ganttMain');
    if (back.fromGanttMain) back.fromGanttMain.onclick = () => renderView('start');
    if (back.fromAddProject) back.fromAddProject.onclick = () => renderView('ganttMain');
    if (back.fromProjDetail) back.fromProjDetail.onclick = () => renderView('ganttMain');

    // 新增企劃按鈕：重設表單後切換到新增頁面
    if (g.openAddProjectBtn) g.openAddProjectBtn.onclick = () => {
        g.addForm.reset();
        g.parentTaskContainer.innerHTML = '';
        addParentTaskSlot(); // 預設添加一個父任務欄位
        renderView('ganttAddProject');
    };

    if (g.addParentTaskSlotBtn) g.addParentTaskSlotBtn.onclick = addParentTaskSlot;
    if (g.addForm) g.addForm.onsubmit = handleAddProjectSubmit;

    // 子任務 Modal
    if (g.childModal.closeBtn) g.childModal.closeBtn.onclick = () => g.childModal.el.classList.add('hidden');
    if (g.childModal.form) g.childModal.form.onsubmit = handleAddChildTaskSubmit;

    // 編輯任務 Modal
    if (g.editModal.closeBtn) g.editModal.closeBtn.onclick = () => g.editModal.el.classList.add('hidden');
    if (g.editModal.form) g.editModal.form.onsubmit = handleEditGanttTaskSubmit;
    if (g.editModal.deleteBtn) g.editModal.deleteBtn.onclick = handleDeleteGanttTask;

    // 編輯企劃 Modal
    if (g.projEditModal.closeBtn) g.projEditModal.closeBtn.onclick = () => g.projEditModal.el.classList.add('hidden');
    if (g.projEditModal.form) g.projEditModal.form.onsubmit = handleEditGanttProjectSubmit;
    if (g.projEditModal.deleteBtn) g.projEditModal.deleteBtn.onclick = handleDeleteGanttProject;
    if (g.projEditModal.addParentBtn) g.projEditModal.addParentBtn.onclick = addParentTaskSlotToEdit;
}

// ─────────────────────────────────────────────
// § 2. 渲染企劃列表 (renderGanttMainPage)
// ─────────────────────────────────────────────
/**
 * 【renderGanttMainPage】渲染甘特圖主頁，顯示所有企劃的卡片
 * 每張卡片包含：企劃名稱、整體進度條、今日任務提示
 */
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

        // 計算整體進度
        const totalItems = proj.parents.length + proj.parents.reduce((acc, p) => acc + (p.children || []).length, 0);
        const completedItems = proj.parents.filter(p => p.completed).length +
            proj.parents.reduce((acc, p) => acc + (p.children || []).filter(c => c.completed).length, 0);
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        // 尋找今日有效任務
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

// ─────────────────────────────────────────────
// § 3. 企劃詳細頁面 (viewProjectDetail)
// ─────────────────────────────────────────────
/**
 * 【viewProjectDetail】顯示一個企劃的所有父/子任務
 * 支援拖曳排序父任務（Drag and Drop Reorder）。
 */
function viewProjectDetail(projId) {
    try {
        const proj = state.ganttSystem.projects.find(p => p.id == projId);
        if (!proj) return;

        renderView('ganttProjectDetail');
        els.gantt.projDetailTitle.textContent = proj.name;
        const container = els.gantt.projDetailContent;
        container.innerHTML = '';

        // 渲染所有父任務（第二個以上的父任務，如果前一個未完成則鎖定）
        proj.parents.forEach((parent, pIdx) => {
            const isLocked = pIdx > 0 && !proj.parents[pIdx - 1].completed;
            container.appendChild(renderGanttItemRecursive(proj, null, parent, 0, isLocked));
        });

        // 甘特圖視覺化按鈕
        const vizBtn = document.createElement('button');
        vizBtn.className = 'btn-secondary small full-width';
        vizBtn.style.marginTop = '10px';
        vizBtn.textContent = '📊 甘特圖視覺化 (Visualization)';
        vizBtn.onclick = () => renderGanttVisualization(projId);
        container.appendChild(vizBtn);

        // 新增父任務按鈕
        const addParentBtn = document.createElement('button');
        addParentBtn.className = 'btn-primary full-width';
        addParentBtn.style.marginTop = '10px';
        addParentBtn.textContent = '+ 新增下一個父任務';
        addParentBtn.onclick = () => openAddParentTaskModal(projId);
        container.appendChild(addParentBtn);

    } catch (e) {
        console.error("View Project Detail Error:", e);
        alert("無法開啟企劃詳情：資料可能已損毀");
    }
}

// ─────────────────────────────────────────────
// § 4. 遞迴渲染甘特圖項目 (renderGanttItemRecursive)
// ─────────────────────────────────────────────
/**
 * 【renderGanttItemRecursive】遞迴建立甘特圖的每一個項目的 DOM 元素
 * 支援多層巢狀（父任務 > 子任務 > 子子任務...）
 * 每個父任務支援拖曳排序。
 *
 * @param {Object} proj - 所屬企劃
 * @param {string|null} parentId - 父任務的 ID（根項目為 null）
 * @param {Object} item - 當前要渲染的項目
 * @param {number} level - 巢狀層級（0=父任務, 1=子任務...）
 * @param {boolean} isLocked - 是否因前置任務未完成而鎖定
 */
function renderGanttItemRecursive(proj, parentId, item, level, isLocked) {
    const isParent = level === 0;
    const div = document.createElement('div');
    div.className = isParent ? `parent-task-item ${isLocked ? 'task-locked' : ''}` : `child-task-item ${item.importance || 'medium'}`;
    div.style.marginLeft = level > 0 ? '15px' : '0';

    // 父任務支援拖曳排序
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
        div.ondragover = (e) => { e.preventDefault(); div.classList.add('drag-over'); };
        div.ondragleave = () => div.classList.remove('drag-over');
        div.ondrop = (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            const sourceProjId = e.dataTransfer.getData('projId');
            if (sourceProjId !== proj.id || draggedId === item.id) return;
            handleParentReorder(proj.id, draggedId, item.id);
        };
    }

    const hasChildren = item.children && item.children.length > 0;
    // 子任務必須先完成，父任務才能勾選
    const childrenAllDone = areChildrenCompletedRecursive(item);
    const canCheck = !isLocked && childrenAllDone;

    div.innerHTML = `
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

    // 遞迴渲染子任務
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

// ─────────────────────────────────────────────
// § 5. 勾選甘特圖項目 (toggleGanttItem)
// ─────────────────────────────────────────────
/**
 * 【toggleGanttItem】勾選/取消勾選甘特圖的任意項目
 * 包含重要程度加分、企劃完成判斷。
 */
function toggleGanttItem(projId, parentId, id, isChecked) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    const isParent = proj.parents.some(p => p.id == id);
    const todayStr = getLocalDateStr();

    if (item.completed && !isChecked) {
        // 取消勾選：退還分數
        state.stockPrice -= item.score;
        item.completed = false;
        if (item.completedHistory) delete item.completedHistory[todayStr];
        if (isParent) proj.completed = false;
    } else if (!item.completed && isChecked) {
        // 勾選：計算加分（子任務依重要程度有額外獎勵）
        let totalGain = item.score;
        if (!isParent) {
            if (item.importance === 'importance-dark-red') totalGain += 4;
            else if (item.importance === 'importance-light-red') totalGain += 2;
        }

        state.stockPrice += totalGain;
        item.completed = true;
        if (!item.completedHistory) item.completedHistory = {};
        item.completedHistory[todayStr] = true;

        if (isParent) checkProjectCompletion(proj);
    }

    // ─ 同步更新今日股價歷史紀錄 ─
    const historyIndex = state.history.findIndex(h => h.date === todayStr);
    if (historyIndex >= 0) {
        state.history[historyIndex].price = state.stockPrice;
    }

    saveState();
    viewProjectDetail(projId);
}

// ─────────────────────────────────────────────
// § 6. 企劃完成判斷與獎勵 (checkProjectCompletion)
// ─────────────────────────────────────────────
/**
 * 【checkProjectCompletion】當父任務被勾選時，檢查整個企劃是否全部完成
 * 如果所有父任務都完成了，觸發企劃完成的獎勵計算（早完成獎勵更多）。
 *
 * 獎勵規則：
 * - 在 1/3 時程內完成 → 額外 50% 分數
 * - 在 2/3 時程內完成 → 額外 33% 分數
 * - 超時完成 → 只有基本分數
 */
function checkProjectCompletion(proj) {
    if (proj.parents.every(p => p.completed)) {
        const todayStr = getLocalDateStr();
        const startD = new Date(proj.startDate);
        const endD = new Date(proj.endDate);
        const todayD = new Date(todayStr);

        const totalDays = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        const elapsedDays = Math.floor((todayD - startD) / (1000 * 60 * 60 * 24)) + 1;

        let finalBonus = 0, bonusMsg = '';
        if (totalDays > 0) {
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

// ─────────────────────────────────────────────
// § 7. 甘特圖視覺化 (renderGanttVisualization)
// ─────────────────────────────────────────────
/**
 * 【renderGanttVisualization】用 Canvas 繪製甘特圖的視覺化橫向條形圖
 * - 父任務：彩色橫條（每個顏色不同）
 * - 子任務：白色細線（在父任務橫條下方）
 * - 今天的位置：紅色垂直線
 */
function renderGanttVisualization(projId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    const container = els.gantt.projDetailContent;
    container.innerHTML = '';

    // 返回按鈕
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

    // 計算日期範圍
    const allDates = [proj.startDate, proj.endDate];
    proj.parents.forEach(p => allDates.push(p.startDate, p.endDate));
    allDates.sort();
    const minDate = new Date(allDates[0]);
    const maxDate = new Date(allDates[allDates.length - 1]);
    maxDate.setDate(maxDate.getDate() + 2); // 加一點右側邊距

    const dayWidth = 40, headerHeight = 30, rowHeight = 40;
    const totalDays = Math.max(1, Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    const totalWidth = totalDays * dayWidth;

    // 建立滾動容器
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = 'position:relative; height:400px; overflow:auto; border:1px solid var(--border-color); border-radius:8px; padding:10px;';

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(container.clientWidth - 40, totalWidth);
    canvas.height = (proj.parents.length + 1) * rowHeight + headerHeight + 50;
    canvasContainer.appendChild(canvas);
    container.appendChild(canvasContainer);

    const ctx = canvas.getContext('2d');
    const getX = (dStr) => Math.floor((new Date(dStr) - minDate) / (1000 * 60 * 60 * 24)) * dayWidth;

    // 背景
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 畫日期格線和標籤
    ctx.strokeStyle = '#30363d';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8b949e';
    for (let i = 0; i <= totalDays; i++) {
        const x = i * dayWidth;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        const curr = new Date(minDate);
        curr.setDate(curr.getDate() + i);
        ctx.fillText(`${curr.getMonth() + 1}/${curr.getDate()}`, x + 5, 20);
    }

    // 畫「今天」的紅色指示線
    const todayStr = getLocalDateStr();
    const todayX = getX(todayStr);
    if (todayX >= 0 && todayX <= totalWidth) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(todayX, 0); ctx.lineTo(todayX, canvas.height); ctx.stroke();
        ctx.lineWidth = 1;
    }

    // 畫父任務橫條
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    let y = headerHeight + 20;

    proj.parents.forEach((parent, idx) => {
        const color = palette[idx % palette.length];
        const startX = getX(parent.startDate);
        const endX = getX(parent.endDate) + dayWidth;
        const width = Math.max(5, endX - startX);

        // 父任務橫條（已完成為綠色）
        ctx.fillStyle = parent.completed ? '#10b981' : color;
        ctx.fillRect(startX, y, width, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(parent.name, startX + 5, y + 14);

        // 子任務：白色細線
        if (parent.children) {
            parent.children.forEach(child => {
                const cStartX = getX(child.startDate);
                const cEndX = getX(child.endDate) + dayWidth;
                const cWidth = Math.max(2, cEndX - cStartX);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cStartX, y + 24);
                ctx.lineTo(cEndX, y + 24);
                ctx.stroke();
                ctx.lineWidth = 1;
            });
        }
        y += rowHeight;
    });
}

// ─────────────────────────────────────────────
// § 8. 新增企劃 & 父任務相關函式
// ─────────────────────────────────────────────
/**
 * 【addParentTaskSlot】在「新增企劃」表單中動態新增一個父任務欄位
 */
function addParentTaskSlot() {
    const container = els.gantt.parentTaskContainer;
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

/**
 * 【handleAddProjectSubmit】處理新增企劃表單的送出
 */
function handleAddProjectSubmit(e) {
    e.preventDefault();
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

    state.ganttSystem.projects.push({
        id: `proj-${Date.now()}`,
        name, score, startDate, endDate, parents, completed: false
    });

    saveState();
    renderView('ganttMain');
}

/**
 * 【openAddParentTaskModal】開啟「新增父任務」的 Modal
 */
function openAddParentTaskModal(projId) {
    document.getElementById('addParentProjId').value = projId;
    document.getElementById('addParentName').value = '';
    document.getElementById('addParentScore').value = 50;
    const today = getLocalDateStr();
    document.getElementById('addParentStart').value = today;
    document.getElementById('addParentEnd').value = today;
    document.getElementById('addParentInsertTop').checked = false;

    const modal = document.getElementById('addParentTaskModal');
    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('closeAddParentModalBtn');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    const form = document.getElementById('addParentTaskForm');
    form.onsubmit = (e) => { e.preventDefault(); handleAddParentTaskSubmit(); };
}

/**
 * 【handleAddParentTaskSubmit】確認送出新增父任務
 */
function handleAddParentTaskSubmit() {
    const projId = document.getElementById('addParentProjId').value;
    const name = document.getElementById('addParentName').value;
    const score = parseInt(document.getElementById('addParentScore').value);
    const startDate = document.getElementById('addParentStart').value;
    const endDate = document.getElementById('addParentEnd').value;
    const insertTop = document.getElementById('addParentInsertTop').checked;

    const newParent = { id: `p-${Date.now()}`, name, score, startDate, endDate, children: [], completed: false };
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (proj) {
        if (insertTop) proj.parents.unshift(newParent);
        else proj.parents.push(newParent);
        saveState();
        document.getElementById('addParentTaskModal').classList.add('hidden');
        viewProjectDetail(projId);
    }
}

// ─────────────────────────────────────────────
// § 9. 子任務新增
// ─────────────────────────────────────────────
/**
 * 【openAddChildModal】開啟「新增子任務」的 Modal
 * 日期範圍會被自動限制在父任務的範圍內。
 */
function openAddChildModal(projId, parentOrChildId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, parentOrChildId);
    if (!item) return;

    document.getElementById('childProjectId').value = projId;
    document.getElementById('childParentId').value = parentOrChildId;

    // 限制子任務日期範圍
    ['childStartDate', 'childEndDate'].forEach(id => {
        const el = document.getElementById(id);
        el.min = item.startDate;
        el.max = item.endDate;
    });
    document.getElementById('childStartDate').value = item.startDate;
    document.getElementById('childEndDate').value = item.endDate;

    els.gantt.childModal.el.classList.remove('hidden');
}

/**
 * 【handleAddChildTaskSubmit】處理新增子任務表單的送出
 */
function handleAddChildTaskSubmit(e) {
    e.preventDefault();
    const projId = document.getElementById('childProjectId').value;
    const parentId = document.getElementById('childParentId').value;

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, parentId);
    if (!item) return;

    item.children.push({
        id: `c-${Date.now()}`,
        name: document.getElementById('childName').value,
        score: parseInt(document.getElementById('childScore').value),
        startDate: document.getElementById('childStartDate').value,
        endDate: document.getElementById('childEndDate').value,
        importance: document.getElementById('childImportance').value,
        children: [],
        completed: false
    });

    saveState();
    els.gantt.childModal.el.classList.add('hidden');
    viewProjectDetail(projId);
}

// ─────────────────────────────────────────────
// § 10. 編輯/刪除相關函式
// ─────────────────────────────────────────────
function openEditGanttProjectModal(projId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    document.getElementById('editProjId').value = projId;
    document.getElementById('editProjName').value = proj.name;
    document.getElementById('editProjScore').value = proj.score;
    document.getElementById('editProjStart').value = proj.startDate;
    document.getElementById('editProjEnd').value = proj.endDate;
    els.gantt.projEditModal.parentList.innerHTML = '';
    els.gantt.projEditModal.el.classList.remove('hidden');
}

function addParentTaskSlotToEdit() {
    const container = els.gantt.projEditModal.parentList;
    const div = document.createElement('div');
    div.className = 'form-group parent-slot-edit';
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

    const newParentSlots = document.querySelectorAll('.parent-slot-edit');
    const newParents = Array.from(newParentSlots).map((slot, index) => ({
        id: `p-${Date.now()}-${index}`,
        name: slot.querySelector('.parent-name').value,
        score: parseInt(slot.querySelector('.parent-score').value),
        startDate: slot.querySelector('.parent-start').value,
        endDate: slot.querySelector('.parent-end').value,
        children: [], completed: false
    }));
    if (newParents.length > 0) proj.parents.push(...newParents);

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
    const id = document.getElementById('editGanttTaskId').value;
    const type = document.getElementById('editGanttType').value;

    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    if (type === 'child') item.importance = document.getElementById('editGanttImportance').value;
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
        const parent = findGanttItem(proj.parents, parentId || '');
        if (parent && parent.children) parent.children = parent.children.filter(c => c.id != id);
    }

    saveState();
    els.gantt.editModal.el.classList.add('hidden');
    viewProjectDetail(projId);
}

// ─────────────────────────────────────────────
// § 11. 輔助函式
// ─────────────────────────────────────────────
/**
 * 【findGanttItem】在樹狀結構中遞迴尋找特定 ID 的項目
 */
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

/**
 * 【areChildrenCompletedRecursive】遞迴確認某個項目的所有子任務是否都完成了
 * 用於判斷父任務的 checkbox 是否可以被勾選。
 */
function areChildrenCompletedRecursive(item) {
    if (!item.children || item.children.length === 0) return true;
    return item.children.every(child => child.completed && areChildrenCompletedRecursive(child));
}

/**
 * 【handleParentReorder】處理父任務的拖曳排序（同一企劃內）
 */
function handleParentReorder(projId, draggedId, targetId) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const fromIdx = proj.parents.findIndex(p => p.id == draggedId);
    const toIdx = proj.parents.findIndex(p => p.id == targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = proj.parents.splice(fromIdx, 1);
    proj.parents.splice(toIdx, 0, moved);
    saveState();
    viewProjectDetail(projId);
}

/**
 * 【deleteGanttItem】刪除甘特圖中的某個任務（父或子）
 */
function deleteGanttItem(projId, parentId, id, type) {
    if (!confirm('確定要刪除此項目嗎？')) return;
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;

    if (type === 'parent') {
        proj.parents = proj.parents.filter(p => p.id != id);
    } else {
        const parent = findGanttItem(proj.parents, parentId || '');
        if (parent && parent.children) parent.children = parent.children.filter(c => c.id != id);
    }
    saveState();
    viewProjectDetail(projId);
}

// 暴露到全局（HTML 的 onclick 需要這些函式）
window.viewProjectDetail = viewProjectDetail;
window.toggleGanttItem = toggleGanttItem;
window.openAddChildModal = openAddChildModal;
window.openEditGanttModal = openEditGanttModal;
window.openEditGanttProjectModal = openEditGanttProjectModal;
window.deleteGanttItem = deleteGanttItem;
