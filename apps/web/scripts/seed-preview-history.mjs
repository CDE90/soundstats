import postgres from "postgres";
import {
    isLocalDatabase,
    previewHistoryRows,
} from "./preview-history-data.mjs";

// Run from apps/web with node --env-file=.env scripts/seed-preview-history.mjs
// --user <Clerk ID> [--apply | --remove] [--allow-remote]. Default is read-only.
const args = process.argv.slice(2);
const userId = args[args.indexOf("--user") + 1];
if (!args.includes("--user") || !userId?.startsWith("user_")) {
    throw new Error("Pass --user <Clerk ID>; default is a read-only preview.");
}
const marker = `SoundStats synthetic preview v1:${userId}`;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is not set.");
const apply = args.includes("--apply");
const remove = args.includes("--remove");
if (apply && remove) throw new Error("Choose --apply or --remove, not both.");
if (
    (apply || remove) &&
    !isLocalDatabase(databaseUrl) &&
    !args.includes("--allow-remote")
) {
    throw new Error(
        "This database is not local. Verify the development target, then explicitly pass --allow-remote for an authorized preview dataset.",
    );
}
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
            select user_id, count(*)::int as listens, max(played_at) as last from listening_history
            where device_name = ${marker}
            and device_type = 'synthetic-preview' group by user_id`;

        if (remove) {
            const removed = await tx`
                delete from listening_history where device_name = ${marker} and device_type = 'synthetic-preview'
                returning id`;
            console.log(JSON.stringify({ removed: removed.length, marker }));
            return;
        }

        // Rank real listening only, so the samples do not influence future seeds.
        const catalogue = await tx`
            select t.id, t.duration_ms from track t
            join album a on a.id = t.album_id
            left join listening_history h on h.track_id = t.id and h.user_id = ${userId}
                and h.device_type is distinct from 'synthetic-preview'
            where t.duration_ms between 90000 and 420000 and a.image_url is not null
            group by t.id order by count(h.id) desc, t.id limit 100`;
        if (catalogue.length < 10)
            throw new Error("Need at least 10 existing tracks.");

        const [{ now }] = await tx`select now() as now`;
        const rows = previewHistoryRows({
            userIds,
            catalogue,
            existing,
            marker,
            now,
        });
        if (apply) {
            for (let offset = 0; offset < rows.length; offset += 500) {
                await tx`insert into listening_history ${tx(rows.slice(offset, offset + 500))}`;
            }
        }
        console.log(
            JSON.stringify(
                {
                    applied: apply,
                    marker,
                    accounts: userIds.length,
                    existing,
                    added: rows.length,
                    from: rows.length
                        ? new Date(
                              Math.min(
                                  ...rows.map((row) => row.played_at.getTime()),
                              ),
                          )
                        : null,
                    to: rows.length
                        ? new Date(
                              Math.max(
                                  ...rows.map((row) => row.played_at.getTime()),
                              ),
                          )
                        : null,
                    clock: now,
                },
                null,
                2,
            ),
        );
    });
} finally {
    await sql.end();
}
