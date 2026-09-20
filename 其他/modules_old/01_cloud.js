// ============================================================
// 模組 01: 雲端同步系統 (Cloud Sync System)
// ============================================================
// 這個檔案負責所有與 Firebase 雲端資料庫的互動。
// 包含：
//   - 監聽雲端資料變動 (setupCloudSync)
//   - 儲存資料到本地和雲端 (saveState)
//   - 更新同步狀態指示器 (updateSyncIndicator)
//   - 手動從雲端下載/上傳資料
// ============================================================

// ─────────────────────────────────────────────
// § 1. 連線狀態指示器
// ─────────────────────────────────────────────
let isInitialSyncDone = false;  // 記錄是否已完成首次雲端連線初始化

/**
 * 【updateSyncIndicator】更新畫面上的同步狀態指示器
 * 指示器會顯示目前的連線狀態：已連線 / 雲端有新資料 / 離線 / 連線異常
 * @param {string} status - 狀態名稱：'Synced' | 'CloudNewer' | 'Offline' | 'Error' | 'Loading'
 */
function updateSyncIndicator(status) {
    const el = document.getElementById('syncStatusIndicator');
    if (!el) return;
    // 先清除所有舊的 CSS class
    el.classList.remove('sync-synced', 'sync-error', 'sync-offline', 'sync-loading');

    switch (status) {
        case 'Synced':
            el.textContent = '● 已連線 (就緒)';
            el.className = 'sync-indicator sync-synced';
            break;
        case 'CloudNewer':
            // 雲端有比本地更新的資料，提示使用者可以下載
            el.textContent = '↑ 雲端有新資料';
            el.className = 'sync-indicator';
            el.style.backgroundColor = 'var(--accent-blue)';
            el.style.color = 'white';
            break;
        case 'Offline':
            el.textContent = '○ 離線模式';
            el.className = 'sync-indicator sync-offline';
            break;
        case 'Error':
            el.textContent = '⚠ 連線異常';
            el.className = 'sync-indicator sync-error';
            break;
        case 'Loading':
            el.textContent = '◌ 連線中...';
            el.className = 'sync-indicator sync-loading';
            break;
    }

    // 如果資料回顧頁面也有同步狀態顯示，一起更新
    if (typeof updateDataSyncStatus === 'function') {
        updateDataSyncStatus(status);
    }
}

// ─────────────────────────────────────────────
// § 2. 儲存狀態 (saveState)
// ─────────────────────────────────────────────
/**
 * 【saveState】將當前 state 儲存到「本地 LocalStorage」和「雲端 Firestore」
 *
 * 執行順序：
 * 1. 更新 state.updatedAt 為當前時間戳記（這樣其他裝置可以知道誰的資料比較新）
 * 2. 立刻儲存到 LocalStorage（速度快，即使沒有網路也有效）
 * 3. 如果雲端已連線，也儲存到 Firestore
 *
 * @param {string} reason - 觸發儲存的原因（用於 debug log）
 */
function saveState(reason = "Unknown") {
    // 步驟1：記錄儲存時間
    state.updatedAt = Date.now();

    // 步驟2：本地儲存（優先，即使雲端失敗也不會遺失資料）
    try {
        localStorage.setItem('me-inc-state', JSON.stringify(state));
        console.log(`狀態已儲存到本機 (${reason})`);
    } catch (e) {
        console.error("本機儲存失敗：", e);
    }

    // 步驟3：如果雲端尚未連線，就先停止，等連線後再同步
    if (!isCloudSyncStarted) {
        console.warn(`雲端儲存暫停 (${reason})：同步尚未啟動`);
        return;
    }

    // 步驟4：儲存到 Firebase Firestore 的 data/state 文件
    console.log(`正在儲存到雲端，原因: ${reason}`);
    db.collection('data').doc('state').set(state)
        .then(() => {
            console.log(`雲端儲存成功 (${reason}) at ${new Date(state.updatedAt).toLocaleTimeString()}`);
            updateSyncIndicator("Synced");
        })
        .catch((e) => {
            console.error("雲端儲存失敗", e);
            updateSyncIndicator("Error");
        });
}

// ─────────────────────────────────────────────
// § 3. 啟動雲端同步監聽 (setupCloudSync)
// ─────────────────────────────────────────────
/**
 * 【setupCloudSync】設定雲端資料的「即時監聽器」
 *
 * 這個函式使用 Firebase 的 onSnapshot，讓 APP 可以「即時偵測」雲端資料是否有更新。
 * 重要設計：本 APP 採用「手動同步」模式。
 * - 當偵測到雲端有新資料時，只顯示提示（'CloudNewer'），不自動覆蓋本地資料。
 * - 使用者必須點擊「下載雲端資料」按鈕才會真正下載。
 * 這樣避免了手機自動同步覆蓋掉電腦上剛輸入的資料。
 */
function setupCloudSync() {
    try {
        if (!db) throw new Error("Firebase 資料庫尚未初始化");

        // onSnapshot 會在每次雲端資料變動時自動呼叫 callback
        db.collection('data').doc('state').onSnapshot((doc) => {
            try {
                if (doc.exists) {
                    console.log("收到雲端資料更新");
                    const cloudData = doc.data();

                    // 比較雲端和本地的更新時間，決定是否提示使用者下載
                    const cloudUpdated = cloudData.updatedAt || 0;
                    const localUpdated = state.updatedAt || 0;

                    if (cloudUpdated > localUpdated) {
                        // 雲端資料比較新，提醒使用者
                        updateSyncIndicator("CloudNewer");
                    } else {
                        // 本地資料已是最新，或與雲端相同
                        updateSyncIndicator("Synced");
                    }

                    isCloudSyncStarted = true;

                    // 初次連線完成後，執行一些只需要在 APP 啟動時跑一次的動作
                    if (!isInitialSyncDone) {
                        isInitialSyncDone = true;
                        console.log("首次雲端連線完成。自動同步已停用，使用者需手動操作。");

                        // 執行啟動時的計算（僅使用本地資料）
                        checkDailyPenaltiesOnLoad();  // 補算昨天的漏做懲罰
                        checkImmediatePenalties();     // 立即檢查今日逾期
                        fixDataAnomalies();             // 修正已知資料異常
                        runAutomaticCleanup();          // 清理 30 天前的舊資料
                        renderView(currentView || 'start');  // 渲染畫面
                    }

                    // 保留最後一次雲端資料的參考，供手動下載使用
                    window.lastCloudData = cloudData;
                } else {
                    // 雲端還沒有資料，表示是新帳號或資料被刪除
                    console.log("雲端沒有資料，使用者需手動上傳。");
                    isCloudSyncStarted = true;
                    if (!isInitialSyncDone) {
                        isInitialSyncDone = true;
                        checkDailyPenaltiesOnLoad();
                        checkImmediatePenalties();
                        fixDataAnomalies();
                        runAutomaticCleanup();
                        renderView(currentView || 'start');
                    }
                    updateSyncIndicator("Synced");
                }

                // 每次連線後，檢查是否需要執行每日備份
                if (isInitialSyncDone) {
                    checkAndPerformDailyBackup().catch(err => {
                        console.error('每日備份檢查失敗：', err);
                    });
                }
            } catch (innerErr) {
                console.error("處理雲端資料時發生錯誤：", innerErr);
                updateSyncIndicator("Error");
            }
        }, (error) => {
            // 監聽本身發生錯誤（例如網路中斷）
            console.error("雲端同步錯誤：", error);
            updateSyncIndicator("Offline");
        });
    } catch (e) {
        // Firebase 未初始化時，APP 進入離線模式運作
        console.warn("無法啟動雲端同步（離線模式）：", e);
        updateSyncIndicator("Offline");
    }
}

// ─────────────────────────────────────────────
// § 4. 手動同步按鈕的事件處理 (由 setupEventListeners 呼叫)
// ─────────────────────────────────────────────
// 這兩個函式在 07_ui.js 的 setupEventListeners() 中被綁定到按鈕。

/**
 * 【manualDownloadFromCloud】手動從雲端下載資料（覆蓋本地）
 * 使用時機：當你在電腦上更新了資料，想要在手機上同步最新內容時，
 *           在手機上點擊「下載雲端紀錄」按鈕。
 */
async function manualDownloadFromCloud(btn) {
    if (!db) return alert("資料庫未連接！");
    if (confirm("【警告】這將會用雲端的資料直接「覆蓋」你現在手機上的資料。確定嗎？")) {
        if (btn) btn.textContent = "下載中...";
        try {
            // 從 Firestore 讀取 data/state 文件
            const doc = await db.collection('data').doc('state').get();
            if (doc.exists) {
                // 用雲端資料覆蓋本地 state（保留 defaultState 作為基底，防止屬性缺失）
                state = { ...defaultState, ...doc.data() };
                validateAndRepairState();
                // 更新本地儲存時間並寫入 LocalStorage
                state.updatedAt = Date.now();
                localStorage.setItem('me-inc-state', JSON.stringify(state));
                alert("✅ 成功從雲端下載！");
                renderStartPage();
            } else {
                alert("雲端沒有任何資料可下載。");
            }
        } catch (err) {
            console.error("手動下載失敗：", err);
            alert("下載失敗：" + err.message);
        } finally {
            // 無論成功或失敗，都恢復按鈕文字
            if (btn) btn.textContent = "📥 下載雲端紀錄";
        }
    }
}

/**
 * 【manualUploadToCloud】手動上傳本地資料到雲端（覆蓋雲端）
 * 使用時機：當你在手機或電腦上新增/修改了任務，想要讓其他裝置也能看到時，
 *           點擊「覆寫至雲端」按鈕。
 */
function manualUploadToCloud(btn) {
    if (!db) return alert("資料庫未連接！");
    if (confirm("這將會把你目前看到的分數和清單「強制備份」到雲端，給其他裝置使用。確定嗎？")) {
        if (btn) btn.textContent = "上傳中...";
        saveState("ManualUserUpload");
        setTimeout(() => {
            if (btn) btn.textContent = "📤 覆寫至雲端";
            alert("✅ 已成功備份至雲端！");
        }, 1000);
    }
}
