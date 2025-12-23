
// Mock Dependencies
const state = {
    stockPrice: 100.00,
    lastLoginDate: '2025-12-22', // Yesterday
    tasks: [],
    history: []
};

// Mock Helper
function getLocalDateStr(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Mock getTasksForDate (Simplified for our test cases)
function getTasksForDate(dateStr) {
    return state.tasks.filter(t => {
        if (t.type === 'recurring') {
            // Simplified: Always return recurring tasks for now unless exceptions
            return true;
        }
        return t.date === dateStr;
    });
}

const saveState = () => { };
const renderStartPage = () => { };

// --- Logic to Test (Copied from app.js) ---

function checkDailyPenaltiesOnLoad() {
    if (!state.lastLoginDate) {
        state.lastLoginDate = getLocalDateStr();
        saveState();
        return;
    }
    const todayStr = getLocalDateStr();
    const lastLogin = state.lastLoginDate;

    let curr = new Date(lastLogin);
    const end = new Date(todayStr);

    while (curr < end) {
        const dStr = curr.toISOString().split('T')[0];
        const tasks = getTasksForDate(dStr);
        tasks.forEach(task => {
            // Apply penalty if ANY Task is not completed and has score
            if (task.score > 0) {
                if (!task.penaltyHistory) task.penaltyHistory = {};
                const isCompleted = task.completedHistory && task.completedHistory[dStr];

                if (!isCompleted && !task.penaltyHistory[dStr]) {
                    state.stockPrice -= task.score;
                    task.penaltyHistory[dStr] = true;
                    console.log(`[Overnight] Penalized task ${task.id} for date ${dStr}. New Price: ${state.stockPrice}`);
                }
            }
        });
        curr.setDate(curr.getDate() + 1);
    }
    state.lastLoginDate = todayStr;
    saveState();
}

function checkImmediatePenalties() {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const currentTimeStr = now.toTimeString().slice(0, 5);

    state.tasks.forEach(task => {
        // Critical Overdue Logic
        if (task.importance === 'critical' && task.time && task.score > 0) {
            let targetDate = null;
            if (task.type === 'recurring') {
                const tasksToday = getTasksForDate(todayStr);
                if (tasksToday.find(t => t.id === task.id)) targetDate = todayStr;
            } else if (task.date <= todayStr) {
                targetDate = task.date; // Scheduled
            }

            if (targetDate) {
                const isToday = targetDate === todayStr;
                const isPastDate = targetDate < todayStr;
                // Use EndTime if available, else StartTime
                const timeThreshold = task.endTime || task.time;
                const isTimeUp = isToday && currentTimeStr > timeThreshold;

                if (isPastDate || isTimeUp) {
                    if (!task.completedHistory) task.completedHistory = {};
                    if (!task.penaltyHistory) task.penaltyHistory = {};

                    const isCompleted = task.completedHistory[targetDate];
                    const isPenalized = task.penaltyHistory[targetDate];

                    if (!isCompleted && !isPenalized) {
                        state.stockPrice -= task.score;
                        task.penaltyHistory[targetDate] = true;
                        console.log(`[Immediate] Penalized task ${task.id} for date ${targetDate}. New Price: ${state.stockPrice}`);
                        renderStartPage();
                    }
                }
            }
        }
    });
    saveState();
}

// --- Test Suite ---

function runTests() {
    console.log('--- Starting Verification ---');

    // Setup Data
    const yesterday = '2025-12-22';
    const today = '2025-12-23'; // Assuming mock today is 23rd based on prompt time

    // We override Date objects for the test execution to match the "today" we want
    // But checkDailyPenaltiesOnLoad uses new Date() internally so verify_penalties.js should run with 
    // the machine time OR we mock getLocalDateStr logic.
    // The prompt says current time is 2025-12-23T08...
    // So getLocalDateStr() will return 2025-12-23. Correct.

    // 1. Test Overnight Penalty
    console.log('\nTest 1: Overnight Penalty (Single Scheduled Task yesterday, not done)');
    state.tasks = [
        {
            id: 1, name: 'Task Yesterday', type: 'scheduled', date: yesterday,
            score: 10, importance: 'medium', completedHistory: {}, penaltyHistory: {}
        }
    ];
    state.stockPrice = 100;
    state.lastLoginDate = yesterday;

    checkDailyPenaltiesOnLoad();

    if (state.stockPrice === 90 && state.tasks[0].penaltyHistory[yesterday]) {
        console.log('PASS: Task penalized correctly.');
    } else {
        console.error('FAIL: Expected price 90, got ' + state.stockPrice);
    }

    // 2. Test Overnight Penalty (Recurring Task yesterday, not done)
    console.log('\nTest 2: Overnight Penalty (Recurring Task yesterday, not done)');
    state.tasks = [
        {
            id: 2, name: 'Recurring Task', type: 'recurring',
            recurrence: { type: 'daily' },
            score: 5, importance: 'high', completedHistory: {}, penaltyHistory: {}
        }
    ];
    state.stockPrice = 100;
    state.lastLoginDate = yesterday;

    checkDailyPenaltiesOnLoad();

    if (state.stockPrice === 95 && state.tasks[0].penaltyHistory[yesterday]) {
        console.log('PASS: Recurring task penalized correctly.');
    } else {
        console.error('FAIL: Expected price 95, got ' + state.stockPrice);
    }

    // 3. Test Immediate Penalty (Critical, Time Range)
    // Current time is 08:xx.
    // Case A: EndTime 07:00 (Passed) -> Penalize
    // Case B: EndTime 09:00 (Future) -> No Penalize

    console.log('\nTest 3: Immediate Penalty (Critical with Range)');

    // Note: checkImmediatePenalties uses new Date() which is 08:xx.
    const nowTimeStr = new Date().toTimeString().slice(0, 5);
    console.log('Current Mock Time:', nowTimeStr);

    state.tasks = [
        {
            id: 3, name: 'Critical Past', type: 'scheduled', date: today,
            time: '06:00', endTime: '07:00', // Ended
            score: 20, importance: 'critical', completedHistory: {}, penaltyHistory: {}
        },
        {
            id: 4, name: 'Critical Future', type: 'scheduled', date: today,
            time: '08:00', endTime: '23:00', // Not ended
            score: 20, importance: 'critical', completedHistory: {}, penaltyHistory: {}
        }
    ];
    state.stockPrice = 100;

    checkImmediatePenalties();

    if (state.stockPrice === 80) { // Only task 3 penalized
        console.log('PASS: Only past task penalized.');
    } else {
        console.error('FAIL: Expected price 80, got ' + state.stockPrice);
        if (state.tasks[1].penaltyHistory[today]) console.error('Task 4 was incorrectly penalized.');
    }

    // 4. Test Immediate Penalty (Critical, No Range, Just Time)
    // Time 07:00 (Passed) -> Penalize
    console.log('\nTest 4: Immediate Penalty (Critical, Point Time)');
    state.tasks = [
        {
            id: 5, name: 'Critical Point Past', type: 'scheduled', date: today,
            time: '07:00',  // Passed
            score: 10, importance: 'critical', completedHistory: {}, penaltyHistory: {}
        }
    ];
    state.stockPrice = 100;
    checkImmediatePenalties();

    if (state.stockPrice === 90) {
        console.log('PASS: Past point task penalized.');
    } else {
        console.error('FAIL: Expected price 90, got ' + state.stockPrice);
    }
}

runTests();
