// 模組 01: 雲端同步系統 (Cloud Sync System)

function setupCloudSync() {
    // Listen to changes in 'state' document
    try {
        if (!db) throw new Error("Firebase DB not initialized");

        db.collection('data').doc('state').onSnapshot((doc) => {
            try {
                if (doc.exists) {
                    console.log("Cloud data received");
                    const cloudData = doc.data();

                    // --- NEW: Manual Sync Mode ---
                    // We DO NOT automatically merge or save anything anymore.
                    // We just listen to know if cloud data is connected and updated.
                    const cloudUpdated = cloudData.updatedAt || 0;
                    const localUpdated = state.updatedAt || 0;
                    
                    if (cloudUpdated > localUpdated) {
                        updateSyncIndicator("CloudNewer"); // Inform user they should probably download
                    } else {
                        updateSyncIndicator("Synced");
                    }

                    isCloudSyncStarted = true;
                    if (!isInitialSyncDone) {
                        isInitialSyncDone = true;
                        console.log("Initial Cloud Connection Established. Auto-sync disabled. User must manually sync.");
                        
                        // Initial Boot: Only do local calculations, don't touch cloud
                        checkDailyPenaltiesOnLoad();
                        checkImmediatePenalties();
                        fixDataAnomalies();
                        runAutomaticCleanup();
                        renderView(currentView || 'start');
                    }
                    
                    // We keep a reference to be able to manually fetch later if needed
                    window.lastCloudData = cloudData;
                } else {
                    console.log("No cloud data, user must manually upload.");
                    isCloudSyncStarted = true;
                    if (!isInitialSyncDone) {
                        isInitialSyncDone = true;
                        
                        // Just boot local
                        checkDailyPenaltiesOnLoad();
                        checkImmediatePenalties();
                        fixDataAnomalies();
                        runAutomaticCleanup();
                        renderView(currentView || 'start');
                    }
                    updateSyncIndicator("Synced");
                }

                // Check and perform daily backup after initial sync
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
            console.error("Sync error:", error);
            updateSyncIndicator("Offline");
        });
    } catch (e) {
        console.warn("Cloud Sync Setup Failed (Offline Mode):", e);
        updateSyncIndicator("Offline");
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


