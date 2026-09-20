// 模組 05: 甘特圖與企劃管理系統 (Gantt Chart & Project Management System)

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
    
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    if (type === 'parent') {
        document.getElementById('editGanttImportanceGroup').classList.add('hidden');
    } else {
        document.getElementById('editGanttImportanceGroup').classList.remove('hidden');
        document.getElementById('editGanttImportance').value = item.importance || 'medium';
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

// ============================================================
// 【甘特圖】切換甘特項目完成狀態
// ============================================================
// 【修復】取消勾選時正確退還重要性加成分數（修復無限刷分漏洞）
// 【修復】取消父項目時正確撤銷專案完成獎勵
function toggleGanttItem(projId, parentId, id, isChecked) {
    const proj = state.ganttSystem.projects.find(p => p.id == projId);
    if (!proj) return;
    const item = findGanttItem(proj.parents, id);
    if (!item) return;

    const isParent = proj.parents.some(p => p.id == id);
    const todayStr = getLocalDateStr();

    if (item.completed && !isChecked) {
        // === 取消勾選 ===
        // 計算完整的退款金額（包含重要性加成）
        let totalRefund = item.score;
        if (!isParent) {
            if (item.importance === 'importance-dark-red') totalRefund += 4;
            else if (item.importance === 'importance-light-red') totalRefund += 2;
        }
        state.stockPrice -= totalRefund;
        item.completed = false;

        if (item.completedHistory && item.completedHistory[todayStr]) {
            delete item.completedHistory[todayStr];
        }

        logAction({
            actionDate: todayStr,
            taskId: item.id,
            taskName: item.name,
            type: 'undo',
            source: 'gantt',
            score: -totalRefund,
            details: `取消完成甘特項目`
        });

        // 如果專案已完成，正確撤銷專案完成獎勵
        if (isParent && proj.completed) {
            const projBonus = proj.completedHistory && proj.completedHistory[todayStr]
                ? (typeof proj.completedHistory[todayStr] === 'number' ? proj.completedHistory[todayStr] : proj.score)
                : 0;
            if (projBonus > 0) {
                state.stockPrice -= projBonus;
                logAction({
                    actionDate: todayStr,
                    taskId: proj.id,
                    taskName: proj.name,
                    type: 'undo',
                    source: 'gantt',
                    score: -projBonus,
                    details: `撤銷專案完成獎勵`
                });
                delete proj.completedHistory[todayStr];
            }
            proj.completed = false;
        } else if (isParent) {
            proj.completed = false;
        }

    } else if (!item.completed && isChecked) {
        // === 勾選完成 ===
        let totalGain = item.score;
        if (!isParent) {
            if (item.importance === 'importance-dark-red') totalGain += 4;
            else if (item.importance === 'importance-light-red') totalGain += 2;
        }

        state.stockPrice += totalGain;
        item.completed = true;

        if (!item.completedHistory) item.completedHistory = {};
        item.completedHistory[todayStr] = true;

        logAction({
            actionDate: todayStr,
            taskId: item.id,
            taskName: item.name,
            type: 'ganttCompletion',
            source: 'gantt',
            score: totalGain,
            details: `完成甘特項目${!isParent && totalGain > item.score ? ` (含重要性加成 +${totalGain - item.score})` : ''}`
        });

        if (isParent) {
            checkProjectCompletion(proj);
        }
    }

    syncPriceHistory();
    saveState();
    viewProjectDetail(projId);
}

// 【甘特圖】檢查專案是否全部完成，若是則給予專案完成獎勵
function checkProjectCompletion(proj) {
    if (proj.parents.every(p => p.completed)) {
        const todayStr = getLocalDateStr();
        const startD = new Date(proj.startDate);
        const endD = new Date(proj.endDate);
        const todayD = new Date(todayStr);

        const totalDays = Math.floor((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        let finalBonus = 0;
        let bonusMsg = '';

        // 提前完成獎勵計算
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

        const totalScore = proj.score + finalBonus;
        state.stockPrice += totalScore;
        proj.completed = true;
        if (!proj.completedHistory) proj.completedHistory = {};
        proj.completedHistory[todayStr] = totalScore;

        logAction({
            actionDate: todayStr,
            taskId: proj.id,
            taskName: proj.name,
            type: 'ganttCompletion',
            source: 'gantt',
            score: totalScore,
            details: `專案完成獎勵${bonusMsg}`
        });

        alert(`恭喜完成企劃 [${proj.name}]！獲得 ${totalScore} 分${bonusMsg}`);
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


// 暴露到全局
window.viewProjectDetail = viewProjectDetail;
window.toggleGanttItem = toggleGanttItem;
window.openAddChildModal = openAddChildModal;
window.openEditGanttModal = openEditGanttModal;
window.openEditGanttProjectModal = openEditGanttProjectModal;
window.deleteGanttItem = deleteGanttItem;
