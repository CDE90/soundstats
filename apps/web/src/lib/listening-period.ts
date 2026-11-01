const dayMs = 86_400_000;

export function utcDay(date: Date) {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

/** An entity's active streak cannot start before the listener's overall streak. */
export function activeStreakStart(
    streak: { streakLength: number; isExtendedToday: boolean },
    endDate: Date,
) {
    if (streak.streakLength === 0) return null;
    const daysBack = streak.streakLength - (streak.isExtendedToday ? 1 : 0);
    return new Date(utcDay(endDate).getTime() - daysBack * dayMs);
}

export function calendarListeningRange(days: number, now = new Date()) {
    const today = utcDay(now);
    return {
        from: new Date(today.getTime() - (days - 1) * dayMs),
        to: new Date(today.getTime() + dayMs - 1),
    };
}

export function listeningDatePresets(dataStart: Date, now = new Date()) {
    const today = utcDay(now);
    function monthsAgo(months: number) {
        const result = new Date(today);
        result.setUTCDate(1);
        result.setUTCMonth(result.getUTCMonth() - months);
        const lastDay = new Date(
            Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
        ).getUTCDate();
        result.setUTCDate(Math.min(today.getUTCDate(), lastDay));
        return result;
    }
    return [
        {
            label: "All time",
            dateRange: { from: utcDay(dataStart), to: today },
        },
        { label: "Today", dateRange: calendarListeningRange(1, now) },
        { label: "Last 7 days", dateRange: calendarListeningRange(7, now) },
        { label: "Last 30 days", dateRange: calendarListeningRange(30, now) },
        {
            label: "Last 3 months",
            dateRange: { from: monthsAgo(3), to: today },
        },
        {
            label: "Last 6 months",
            dateRange: { from: monthsAgo(6), to: today },
        },
        {
            label: "Month to date",
            dateRange: {
                from: new Date(
                    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
                ),
                to: today,
            },
        },
        {
            label: "Year to date",
            dateRange: {
                from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
                to: today,
            },
        },
    ];
}

export function streakDayLabel(
    extended: boolean,
    endDate: Date,
    now = new Date(),
) {
    const date = endDate.toISOString().slice(0, 10);
    const when =
        date === now.toISOString().slice(0, 10)
            ? "today"
            : `on ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
    return `${extended ? "Played" : "Not played"} ${when}`;
}

export function formatAverageListen(seconds: number) {
    const total = Math.round(Math.max(0, seconds));
    const minutes = Math.floor(total / 60);
    return `${minutes}m ${total % 60}s`;
}
