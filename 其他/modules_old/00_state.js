// ============================================================
// 模組 00: 全局狀態 & Firebase 設定
// ============================================================
// 這個檔案是整個 APP 的「資料中心」。
// 所有系統共用的變數 (state)、設定 (Firebase)、
// 以及最基本的日期工具函式都放在這裡。
// 必須最先被 HTML 載入，其他模組才能使用裡面的變數。
// ============================================================

// ─────────────────────────────────────────────
// § 1. 預設資料結構 (defaultState)
// ─────────────────────────────────────────────
// 這是 APP 在「全新狀態」下的初始資料模板。
// 如果 LocalStorage 或雲端沒有資料，就用這個來初始化。
const defaultState = {
    stockPrice: 100.00,       // 【股價系統】當前積分/股價，初始值為 100
    history: [],              // 【股價系統】每日收盤股價紀錄陣列 [{date, price}, ...]
    tasks: [],                // 【任務系統】所有任務的陣列
    lastLoginDate: '',        // 【懲罰系統】上次登入日期，用來計算漏做的任務
    updatedAt: 0,             // 【雲端同步】最後更新的時間戳記 (毫秒)，用來判斷雲端和本地哪個比較新

    // 【記帳系統】的子物件
    accounting: {
        transactions: [],     // 所有收支紀錄
        banks: [
            { id: 1, name: '現金', balance: 0 }  // 預設一個「現金」帳戶
        ],
        categories: [
            { id: 1, name: '飲食' },
            { id: 2, name: '交通' },
            { id: 3, name: '娛樂' },
            { id: 4, name: '薪資' },
            { id: 5, name: '獎金' }
        ]
    },

    // 【甘特圖系統】的子物件
    ganttSystem: {
        projects: []          // 所有企劃（project）的陣列
    }
};

// ─────────────────────────────────────────────
// § 2. 全局執行時變數 (Runtime Variables)
// ─────────────────────────────────────────────
// 這些是 APP 在執行期間會動態改變的「工作變數」。

let state = defaultState;           // 當前 APP 狀態（會被 LocalStorage 或雲端資料覆蓋）
let currentView = 'start';          // 目前顯示哪個畫面 (start/schedule/accounting/ganttMain等)
let currentMonth = new Date();      // 月曆目前顯示的月份
let chartInstance = null;           // 主頁 Gantt 條形圖的 Chart.js 實例（避免重複建立）
let kLineChartInstance = null;      // 主頁 K 線圖的 Chart.js 實例
let weeklyStartDay = null;          // 週行程表當前顯示的那一週的週一日期
let movingTask = null;              // 「移動任務」模式下，正在被移動的任務 { task, sourceDate }
let isCloudSyncStarted = false;     // Firebase 連線是否已啟動（防止在連線前就呼叫 saveState）

// ─────────────────────────────────────────────
// § 3. Firebase 設定
// ─────────────────────────────────────────────
// Firebase 是 Google 提供的雲端資料庫服務。
// 這裡的 config 物件包含了連接到這個專案資料庫的必要資訊。
// 注意：apiKey 等金鑰在前端是公開的，Firebase 透過「安全規則」來保護資料。
const firebaseConfig = {
    apiKey: "AIzaSyAa0xcoNbVHc_bzAI53WK2XbU41xJJP4q0",
    authDomain: "me-inc-db.firebaseapp.com",
    projectId: "me-inc-db",
    storageBucket: "me-inc-db.firebasestorage.app",
    messagingSenderId: "598336717364",
    appId: "1:598336717364:web:a56fa398689fedf2fec061",
    measurementId: "G-707RMW9027"
};

// ─────────────────────────────────────────────
// § 4. Firebase 初始化
// ─────────────────────────────────────────────
// 在這裡啟動 Firebase 連線。
// 使用 try/catch 確保即使 Firebase CDN 未載入，APP 也不會直接崩潰，
// 而是以「離線模式」運行。
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        // db = Firebase Firestore 資料庫實例，其他模組都用 db 來讀寫雲端資料
        var db = firebase.firestore();

        // 啟用「離線持久化」：即使沒有網路，Firestore 也會快取最後的資料
        // 讓 APP 在短暫斷線後仍可運作
        db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    // 多個分頁開啟時，只有一個可以啟用離線模式
                    console.warn('離線持久化失敗：有多個分頁開啟');
                } else if (err.code == 'unimplemented') {
                    // 使用舊瀏覽器時不支援此功能
                    console.warn('此瀏覽器不支援離線持久化');
                }
            });
    } else {
        console.warn("Firebase SDK 未從 CDN 載入，APP 將以離線模式運行。");
    }
} catch (e) {
    console.error("Firebase 初始化失敗：", e);
}

// ─────────────────────────────────────────────
// § 5. 共用工具函式 (Utility Functions)
// ─────────────────────────────────────────────
// 這些是各模組都需要使用的「基礎」函式，所以放在 state 檔一起載入。

/**
 * 【getLocalDateStr】取得本地時間的日期字串
 * 作用：將 Date 物件轉換為 "YYYY-MM-DD" 格式的字串，並且考慮當地時區。
 * 為什麼不用 toISOString()？因為 toISOString() 是 UTC 時間，在台灣（UTC+8）的深夜
 * 12點前可能會顯示成前一天的日期！這個函式正確處理了時區偏移。
 * @param {Date} d - 要轉換的 Date 物件，預設為當下時間
 * @returns {string} "YYYY-MM-DD" 格式的日期字串，例如 "2026-03-22"
 */
const getLocalDateStr = (d = new Date()) => {
    try {
        // getTimezoneOffset() 回傳本地時間與 UTC 的差值（分鐘），台灣為 -480
        const offset = d.getTimezoneOffset() * 60000; // 轉換為毫秒
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    } catch (e) {
        console.error("日期工具函式發生錯誤：", e);
        return new Date().toISOString().split('T')[0]; // 容錯：回傳 UTC 日期
    }
};

/**
 * 【getDayName】取得星期幾的中文名稱
 * @param {string} dateStr - "YYYY-MM-DD" 格式的日期字串
 * @returns {string} 例如 "週三"
 */
const getDayName = (dateStr) => {
    return ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][new Date(dateStr).getDay()];
};

/**
 * 【mapImportance】把重要程度的 key 轉換成人類可讀的中文標籤
 * @param {string} importance - 'critical' / 'high' / 'medium' / 'low' 等
 * @returns {string} 對應的中文，例如 "重要"
 */
function mapImportance(importance) {
    const map = {
        'critical': '重要事項',
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return map[importance] || importance || '中';
}
