import postgres from "postgres";

// Run from apps/web with node --env-file=.env scripts/seed-preview-history.mjs
// --user <Clerk ID> [--apply | --remove]. No account or catalogue data is changed.
const args = process.argv.slice(2);
const userId = args[args.indexOf("--user") + 1];
if (!args.includes("--user") || !userId?.startsWith("user_")) {
    throw new Error("Pass --user <Clerk ID>; default is a read-only preview.");
}
const marker = `SoundStats synthetic preview v1:${userId}`;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is not set.");
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

try {
    await sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${marker + userId}))`;
        const [owner] = await tx`select id from "user" where id = ${userId}`;
        if (!owner) throw new Error("Account not found.");
        const friends = await tx`
            select distinct case when user_id = ${userId} then friend_id else user_id end as id
            from friends where status = 'accepted'
            and (user_id = ${userId} or friend_id = ${userId}) order by id`;
        const userIds = [userId, ...friends.map((friend) => friend.id)];
        const existing = await tx`
            select user_id, count(*)::int as listens from listening_history
            where device_name = ${marker}
            and device_type = 'synthetic-preview' group by user_id`;

        if (args.includes("--remove")) {
            const removed = await tx`
                delete from listening_history where device_name = ${marker} and device_type = 'synthetic-preview'
                returning id`;
            console.log(JSON.stringify({ removed: removed.length, marker }));
            return;
        }
        if (existing.length) {
            console.log(JSON.stringify({ alreadySeeded: existing, marker }));
            return;
        }

        // Reuse the account's actual favourites, with intact existing metadata.
        const catalogue = await tx`
            select t.id, t.duration_ms from track t
            join album a on a.id = t.album_id
            left join listening_history h on h.track_id = t.id and h.user_id = ${userId}
            where t.duration_ms between 90000 and 420000 and a.image_url is not null
            group by t.id order by count(h.id) desc, t.id limit 100`;
        if (catalogue.length < 10)
            throw new Error("Need at least 10 existing tracks.");

        const [{ now }] = await tx`select now() as now`;
        const midnight = new Date(now);
        midnight.setUTCHours(0, 0, 0, 0);
        const rows = [];
        for (const [person, id] of userIds.entries()) {
            const streakDays = [21, 14, 9][person % 3];
            for (let daysAgo = 0; daysAgo < 58; daysAgo++) {
                // Older listening has gaps, so people have different current streaks.
                if (
                    daysAgo === streakDays ||
                    (daysAgo > streakDays && (daysAgo + person) % 4 === 0)
                )
                    continue;
                const dayStart = midnight.getTime() - daysAgo * 86_400_000;
                const count = 18 + ((daysAgo * 7 + person * 11) % 26);
                const anchor = catalogue[(person * 13) % catalogue.length];
                // Today's session ends ten minutes before the database clock.
                const sessionEnd =
                    daysAgo === 0
                        ? new Date(now).getTime() - 600_000 - person * 420_000
                        : dayStart + (18 + person) * 3_600_000;
                const sessionStart = Math.max(
                    dayStart,
                    sessionEnd - count * (360_000 + person * 45_000),
                );
                const spacing = Math.min(
                    360_000 + person * 45_000,
                    (sessionEnd - sessionStart) / count,
                );
                if (spacing < 60_000) continue;
                for (let listen = 0; listen < count; listen++) {
                    const track =
                        listen % 5 === 0
                            ? anchor
                            : catalogue[
                                  (daysAgo * 17 + person * 19 + listen * 7) %
                                      catalogue.length
                              ];
                    rows.push({
                        user_id: id,
                        track_id: track.id,
                        played_at: new Date(sessionStart + listen * spacing),
                        progress_ms: Math.round(
                            track.duration_ms *
                                (0.8 + ((listen + daysAgo) % 5) * 0.04),
                        ),
                        device_name: marker,
                        device_type: "synthetic-preview",
                        imported: true,
                    });
                }
            }
        }
        if (args.includes("--apply")) {
            for (let offset = 0; offset < rows.length; offset += 500) {
                await tx`insert into listening_history ${tx(rows.slice(offset, offset + 500))}`;
            }
        }
        console.log(
            JSON.stringify(
                {
                    applied: args.includes("--apply"),
                    marker,
                    accounts: userIds.length,
                    listens: rows.length,
                    from: rows.reduce(
                        (min, row) =>
                            row.played_at < min ? row.played_at : min,
                        new Date(now),
                    ),
                    to: rows.reduce(
                        (max, row) =>
                            row.played_at > max ? row.played_at : max,
                        new Date(0),
                    ),
                },
                null,
                2,
            ),
        );
    });
} finally {
    await sql.end();
}
