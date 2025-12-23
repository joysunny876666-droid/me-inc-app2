
// Mock Task Structure
const createRecurringTask = (id, type, interval, startDate) => ({
    id,
    type: 'recurring',
    recurrence: { type, interval, startDate },
    createdAt: startDate
});

// Logic from app.js (Simplified for testing)
function isTaskOnDate(task, dateStr) {
    const interval = task.recurrence.interval || 1;
    const startStr = task.recurrence.startDate || '1970-01-01';
    const startDate = new Date(startStr);
    const targetDate = new Date(dateStr);

    if (dateStr < startStr) return false;

    // Fix: Ensure we are comparing local dates correctly by clearing time or using UTC if needed.
    // In app.js we used: const diffTime = targetDate - startDate;
    // But basic Date objects default to UTC 00:00 or Local 00:00 depending on parsing 'YYYY-MM-DD'.
    // If both are 'YYYY-MM-DD', they parse consistently.
    const diffTime = targetDate - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const rType = task.recurrence.type;

    if (rType === 'daily') {
        return diffDays % interval === 0;
    } else if (rType === 'weekly') {
        return diffDays % (7 * interval) === 0;
    } else if (rType === 'monthly') {
        const targetDay = targetDate.getDate();
        const startDay = startDate.getDate();
        if (targetDay !== startDay) return false;

        const monthDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
        return monthDiff % interval === 0;
    }
    return false;
}

// Tests
const tests = [
    // 1. Every 3 days starting 2025-12-10
    {
        task: createRecurringTask(1, 'daily', 3, '2025-12-10'),
        check: '2025-12-10', expected: true
    },
    {
        task: createRecurringTask(1, 'daily', 3, '2025-12-10'),
        check: '2025-12-11', expected: false
    },
    {
        task: createRecurringTask(1, 'daily', 3, '2025-12-10'),
        check: '2025-12-13', expected: true
    },
    // 2. Every 2 weeks starting 2025-12-10 (Wednesday)
    {
        task: createRecurringTask(2, 'weekly', 2, '2025-12-10'),
        check: '2025-12-10', expected: true
    },
    {
        task: createRecurringTask(2, 'weekly', 2, '2025-12-10'),
        check: '2025-12-17', expected: false // 1 week later
    },
    {
        task: createRecurringTask(2, 'weekly', 2, '2025-12-10'),
        check: '2025-12-24', expected: true // 2 weeks later
    },
    // 3. Every 1 month starting 2025-12-10
    {
        task: createRecurringTask(3, 'monthly', 1, '2025-12-10'),
        check: '2026-01-10', expected: true
    },
    {
        task: createRecurringTask(3, 'monthly', 1, '2025-12-10'),
        check: '2026-02-10', expected: true
    },
    // 4. Every 2 months starting 2025-12-10
    {
        task: createRecurringTask(4, 'monthly', 2, '2025-12-10'),
        check: '2026-01-10', expected: false
    },
    {
        task: createRecurringTask(4, 'monthly', 2, '2025-12-10'),
        check: '2026-02-10', expected: true
    },
];

let failed = 0;
tests.forEach((t, i) => {
    const result = isTaskOnDate(t.task, t.check);
    if (result !== t.expected) {
        console.error(`Test ${i + 1} Failed: Task ${t.task.recurrence.type}/${t.task.recurrence.interval} start ${t.task.recurrence.startDate} check ${t.check}. Expected ${t.expected}, got ${result}`);
        failed++;
    } else {
        console.log(`Test ${i + 1} Passed`);
    }
});

if (failed === 0) {
    console.log("All tests passed!");
} else {
    process.exit(1);
}
