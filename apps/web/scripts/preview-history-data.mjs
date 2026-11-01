const DAY_MS = 86_400_000;

export function utcDayStart(value) {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

/** Build only missing UTC days. Existing preview rows and real history are untouched. */
export function previewHistoryRows({
    userIds,
    catalogue,
    existing,
    marker,
    now,
}) {
    const today = utcDayStart(now);
    const rows = [];
    for (const [person, userId] of userIds.entries()) {
        const lastSeededAt = existing.find(
            (item) => item.user_id === userId,
        )?.last;
        const extending = Boolean(lastSeededAt);
        const firstDay = extending
            ? new Date(utcDayStart(lastSeededAt).getTime() + DAY_MS)
            : new Date(today.getTime() - 57 * DAY_MS);
        const streakDays = [21, 14, 9][person % 3];
        for (
            let day = firstDay.getTime();
            day <= today.getTime();
            day += DAY_MS
        ) {
            const daysAgo = Math.round((today.getTime() - day) / DAY_MS);
            // Retain the initial seed's varied older streaks. Extensions continue
            // each person's existing streak without rewriting its historical days.
            if (
                !extending &&
                (daysAgo === streakDays ||
                    (daysAgo > streakDays && (daysAgo + person) % 4 === 0))
            )
                continue;
            const ordinal = Math.floor(day / DAY_MS);
            const desiredCount = 18 + ((ordinal * 7 + person * 11) % 26);
            const sessionEnd =
                daysAgo === 0
                    ? new Date(now).getTime() - 600_000 - person * 420_000
                    : day + (18 + person) * 3_600_000;
            // One track per 7.5 minutes, including its duration. Reduce the count
            // shortly after midnight rather than placing samples in the future.
            const spacing = 450_000;
            const count = Math.min(
                desiredCount,
                Math.floor((sessionEnd - day) / spacing),
            );
            if (count < 1) continue;
            const start = sessionEnd - count * spacing;
            const anchor = catalogue[(person * 13) % catalogue.length];
            for (let listen = 0; listen < count; listen++) {
                const track =
                    listen % 5 === 0
                        ? anchor
                        : catalogue[
                              (ordinal * 17 + person * 19 + listen * 7) %
                                  catalogue.length
                          ];
                rows.push({
                    user_id: userId,
                    track_id: track.id,
                    played_at: new Date(start + listen * spacing),
                    progress_ms: Math.round(
                        track.duration_ms *
                            (0.8 + ((listen + ordinal) % 5) * 0.04),
                    ),
                    device_name: marker,
                    device_type: "synthetic-preview",
                    imported: true,
                });
            }
        }
    }
    return rows;
}

export function isLocalDatabase(databaseUrl) {
    return ["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(databaseUrl).hostname,
    );
}
