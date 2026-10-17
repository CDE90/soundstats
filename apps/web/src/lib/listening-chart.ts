export type ListeningGranularity = "hour" | "day" | "week" | "month" | "year";

export interface ListeningPoint {
    date: string;
    playtime: number;
}

export function listeningGranularity(
    from: Date,
    to: Date,
): ListeningGranularity {
    const days =
        Math.round(
            (Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) -
                Date.UTC(
                    from.getUTCFullYear(),
                    from.getUTCMonth(),
                    from.getUTCDate(),
                )) /
                86_400_000,
        ) + 1;
    if (days <= 1) return "hour";
    if (days <= 60) return "day";
    if (days <= 366) return "week";
    if (days <= 8 * 366) return "month";
    return "year";
}

export function previousListeningRange(from: Date, to: Date) {
    const duration = to.getTime() - from.getTime() + 1;
    return {
        from: new Date(from.getTime() - duration),
        to: new Date(from.getTime() - 1),
    };
}

export const listeningGranularityLabel: Record<ListeningGranularity, string> = {
    hour: "Hourly",
    day: "Daily",
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
};

export function listeningTickDates(
    points: ListeningPoint[],
    granularity: ListeningGranularity,
) {
    return points
        .filter((point, index) => {
            if (granularity === "hour") return index % 6 === 0;
            if (granularity === "day")
                return (
                    index %
                        (points.length <= 7
                            ? 1
                            : points.length <= 14
                              ? 2
                              : points.length <= 35
                                ? 7
                                : 14) ===
                    0
                );
            if (granularity === "week")
                return index % (points.length <= 20 ? 4 : 13) === 0;
            if (granularity === "month")
                return (
                    new Date(`${point.date}T00:00:00Z`).getUTCMonth() %
                        (points.length <= 8
                            ? 1
                            : points.length <= 24
                              ? 3
                              : 6) ===
                    0
                );
            return true;
        })
        .map((point) => point.date);
}

export function formatListeningDuration(seconds: number) {
    if (seconds > 0 && seconds < 60) return "<1m";
    const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes}m`;
    return minutes
        ? `${hours.toLocaleString("en-GB")}h ${minutes}m`
        : `${hours.toLocaleString("en-GB")}h`;
}

// Choose regular minute/hour intervals, then cap the axis at a whole interval.
export function listeningTimeTicks(maximum: number) {
    const steps = [
        60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400,
    ];
    let step = steps.find((candidate) => candidate >= maximum / 4);
    if (!step) {
        const targetHours = maximum / 4 / 3600;
        const magnitude = 10 ** Math.floor(Math.log10(targetHours));
        step =
            [1, 2, 5, 10].find((factor) => factor * magnitude >= targetHours)! *
            magnitude *
            3600;
    }
    const count = Math.max(1, Math.ceil(maximum / step));
    return Array.from({ length: count + 1 }, (_, i) => i * step);
}

export function listeningDateLabel(
    date: string,
    granularity: ListeningGranularity,
    includeYear = false,
) {
    const value = new Date(date.length === 10 ? `${date}T00:00:00Z` : date);
    if (granularity === "hour")
        return value.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
        });
    return value.toLocaleDateString("en-GB", {
        timeZone: "UTC",
        ...(granularity === "year"
            ? { year: "numeric" }
            : granularity === "month"
              ? { month: "short", year: "numeric" }
              : {
                    day: "numeric",
                    month: "short",
                    ...(includeYear ? { year: "2-digit" } : {}),
                }),
    });
}
