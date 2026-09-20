// 模組 00: 狀態管理與工具

// --- State Management ---
const defaultState = {
    stockPrice: 100.00,
    history: [],
    tasks: [],
    lastLoginDate: '',
    actionLog: [],
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

// ============================================================
// 【核心】統一行為紀錄系統 (Action Log)
// ============================================================
// 所有分數變動都透過此函式記錄，確保「動作發生在哪天，就顯示在哪天」
// actionDate: 動作發生實際的日期 (通常是今天)
// type: 'completion' | 'penalty' | 'badHabit' | 'persistent' | 'ganttCompletion' | 'ganttPenalty' | 'undo'
// source: 'daily' | 'gantt' | 'system'
function logAction(params) {
    if (!state.actionLog) state.actionLog = [];
    const entry = {
        id: Date.now() + Math.random(), // 唯一識別碼
        actionDate: params.actionDate || getLocalDateStr(), // 動作發生日期（預設今天）
        taskId: params.taskId || null,
        taskName: params.taskName || '未知',
        type: params.type || 'unknown',     // 行為類型
        source: params.source || 'daily',    // 來源分類
        score: params.score || 0,            // 分數異動（正數=加分，負數=扣分）
        scheduledDate: params.scheduledDate || null, // 原始排定日期（僅供參考）
        details: params.details || ''        // 額外說明
    };
    state.actionLog.push(entry);
    return entry;
}

// 【輔助】同步更新 state.history（K線圖用的每日股價快照）
function syncPriceHistory() {
    const todayStr = getLocalDateStr();
    const idx = state.history.findIndex(h => h.date === todayStr);
    if (idx >= 0) {
        state.history[idx].price = state.stockPrice;
    } else {
        state.history.push({ date: todayStr, price: state.stockPrice });
    }
}

// 【輔助】清理超過 60 天的 actionLog（避免資料無限膨脹）
function cleanupOldActionLogs() {
    if (!state.actionLog) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = getLocalDateStr(cutoff);
    state.actionLog = state.actionLog.filter(entry => entry.actionDate >= cutoffStr);
}

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

        // Enable Offline Persistence
        db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Persistence failed: Multiple tabs open');
                } else if (err.code == 'unimplemented') {
                    console.warn('Persistence not supported by browser');
                }
            });
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


// --- Helper: mapImportance ---
function mapImportance(imp) {
    const map = { critical: '重要', high: '還好', medium: '輕微', low: '不重要', daily: '日常' };
    return map[imp] || imp;
}

// --- Helper: fixDataAnomalies & getProgressColor ---
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

