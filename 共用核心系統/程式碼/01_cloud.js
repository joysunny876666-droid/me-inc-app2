// 模組 01: 雲端同步系統 (Cloud Sync System)

// 【修復】Firebase 連線逾時保護
// 若 10 秒內 Firebase 沒有回應，自動以本機資料啟動，避免卡在「連線中...」
const CLOUD_TIMEOUT_MS = 10000;
let _cloudTimeoutId = null;

function _bootFromLocal(reason) {
    if (isInitialSyncDone) return; // 已啟動，不重複執行
    isInitialSyncDone = true;
    console.warn(`[Cloud] Booting from local storage (${reason})`);
    updateSyncIndicator("Offline");
    checkDailyPenaltiesOnLoad();
    checkImmediatePenalties();
    fixDataAnomalies();
    runAutomaticCleanup();
    renderView(currentView || 'start');
}

function setupCloudSync() {
    // 啟動逾時保護：10 秒後若還沒收到 Firebase 回應，改用本機資料啟動
    _cloudTimeoutId = setTimeout(() => {
        if (!isInitialSyncDone) {
            _bootFromLocal("Firebase timeout after 10s");
        }
    }, CLOUD_TIMEOUT_MS);

    // Listen to changes in 'state' document
    try {
        if (!db) throw new Error("Firebase DB not initialized");

        db.collection('data').doc('state').onSnapshot((doc) => {
            // 收到回應，清除逾時
            if (_cloudTimeoutId) { clearTimeout(_cloudTimeoutId); _cloudTimeoutId = null; }

            try {
                if (doc.exists) {
                    console.log("Cloud data received");
                    const cloudData = doc.data();

                    // --- Manual Sync Mode ---
                    const cloudUpdated = cloudData.updatedAt || 0;
                    const localUpdated = state.updatedAt || 0;
                    
                    if (cloudUpdated > localUpdated) {
                        updateSyncIndicator("CloudNewer");
                    } else {
                        updateSyncIndicator("Synced");
                    }

                    isCloudSyncStarted = true;
                    if (!isInitialSyncDone) {
                        isInitialSyncDone = true;
                        console.log("Initial Cloud Connection Established. Auto-sync disabled. User must manually sync.");
                        checkDailyPenaltiesOnLoad();
                        checkImmediatePenalties();
                        fixDataAnomalies();
                        runAutomaticCleanup();
                        renderView(currentView || 'start');
                    }
                    
                    window.lastCloudData = cloudData;
                } else {
                    console.log("No cloud data, user must manually upload.");
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

                if (isInitialSyncDone) {
                    checkAndPerformDailyBackup().catch(err => {
                        console.error('Daily backup check failed:', err);
                    });
                }
            } catch (innerErr) {
                console.error("Error processing cloud data:", innerErr);
                updateSyncIndicator("Error");
            }
        }, (error) => {
            if (_cloudTimeoutId) { clearTimeout(_cloudTimeoutId); _cloudTimeoutId = null; }
            console.error("Sync error:", error);
            updateSyncIndicator("Offline");
            _bootFromLocal("Firebase onSnapshot error: " + error.code);
        });
    } catch (e) {
        if (_cloudTimeoutId) { clearTimeout(_cloudTimeoutId); _cloudTimeoutId = null; }
        console.warn("Cloud Sync Setup Failed (Offline Mode):", e);
        updateSyncIndicator("Offline");
        _bootFromLocal("Firebase setup exception");
    }
}

let isInitialSyncDone = false;
function updateSyncIndicator(status) {
    const el = document.getElementById('syncStatusIndicator');
    if (!el) return;
    el.classList.remove('sync-synced', 'sync-error', 'sync-offline', 'sync-loading');

    switch (status) {
        case 'Synced':
            el.textContent = '● 已連線 (就緒)';
            el.className = 'sync-indicator sync-synced';
            break;
        case 'CloudNewer':
            el.textContent = '↑ 雲端有新資料';
            el.className = 'sync-indicator' ;
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

    // Also update data view sync status if available
    if (typeof updateDataSyncStatus === 'function') {
        updateDataSyncStatus(status);
    }
}

function saveState(reason = "Unknown") {
    // Save to LocalStorage immediately (Safety First)
    state.updatedAt = Date.now();
    try {
        localStorage.setItem('me-inc-state', JSON.stringify(state));
        console.log(`State cached to LocalStorage (${reason})`);
    } catch (e) {
        console.error("LocalStorage Save Failed:", e);
    }

    if (!isCloudSyncStarted) {
        console.warn(`Cloud Save blocked (${reason}): Sync not yet started.`);
        return;
    }

    console.log(`Saving state to cloud due to: ${reason}`);

    // Save to Firestore
    db.collection('data').doc('state').set(state)
        .then(() => {
            console.log(`State saved to Cloud (${reason}) ` + new Date(state.updatedAt).toLocaleTimeString());
            updateSyncIndicator("Synced");
        })
        .catch((e) => {
            console.error("Cloud Save failed", e);
            updateSyncIndicator("Error");
            // Don't alert on mobile to avoid blocking UI, console is enough
        });
}


