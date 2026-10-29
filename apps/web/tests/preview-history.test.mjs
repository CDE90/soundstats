import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import postgres from "postgres";
import {
    isLocalDatabase,
    previewHistoryRows,
    utcDayStart,
} from "../scripts/preview-history-data.mjs";

const catalogue = Array.from({ length: 12 }, (_, index) => ({
    id: `track-${index}`,
    duration_ms: 90_000 + index * 20_000,
}));
const userIds = ["user_owner", "user_friend", "user_other_friend"];
const marker = "SoundStats synthetic preview v1:user_owner";
const now = new Date("2026-10-29T15:00:00Z");
const existing = userIds.map((user_id) => ({
    user_id,
    last: new Date("2026-10-17T18:00:00Z"),
}));

function latestByUser(rows) {
    return userIds.map((user_id) => ({
        user_id,
        last: new Date(
            Math.max(
                ...rows
                    .filter((row) => row.user_id === user_id)
                    .map((row) => row.played_at.getTime()),
            ),
        ),
    }));
}

test("preview extension adds only missing days through runtime UTC today and is idempotent", () => {
    const rows = previewHistoryRows({
        userIds,
        catalogue,
        existing,
        marker,
        now,
    });
    assert.deepEqual([...new Set(rows.map((row) => row.user_id))], userIds);
    for (const id of userIds) {
        const dates = [
            ...new Set(
                rows
                    .filter((row) => row.user_id === id)
                    .map((row) => row.played_at.toISOString().slice(0, 10)),
            ),
        ];
        assert.equal(dates.length, 12);
        assert.equal(dates[0], "2026-10-18");
        assert.equal(dates.at(-1), "2026-10-29");
    }
    for (const row of rows) {
        assert.equal(row.device_name, marker);
        assert.equal(row.device_type, "synthetic-preview");
        assert.equal(row.imported, true);
        assert.ok(row.progress_ms >= 30_000);
        assert.ok(
            row.progress_ms <=
                catalogue.find((track) => track.id === row.track_id)
                    .duration_ms,
        );
        assert.ok(row.played_at.getTime() + row.progress_ms < now.getTime());
    }
    assert.deepEqual(
        previewHistoryRows({
            userIds,
            catalogue,
            existing: latestByUser(rows),
            marker,
            now: new Date("2026-10-29T23:00:00Z"),
        }),
        [],
    );
    const tomorrow = previewHistoryRows({
        userIds,
        catalogue,
        existing: latestByUser(rows),
        marker,
        now: new Date("2026-10-30T15:00:00Z"),
    });
    assert.ok(tomorrow.length > 0);
    assert.ok(
        tomorrow.every((row) =>
            row.played_at.toISOString().startsWith("2026-10-30"),
        ),
    );
});

test("samples respect midnight and never fabricate playback or future sessions", () => {
    const nearMidnight = new Date("2026-10-29T00:05:00Z");
    const rows = previewHistoryRows({
        userIds,
        catalogue,
        existing,
        marker,
        now: nearMidnight,
    });
    assert.ok(rows.every((row) => row.played_at < nearMidnight));
    assert.ok(
        rows.every(
            (row) => row.played_at.toISOString().slice(0, 10) !== "2026-10-29",
        ),
    );
    assert.equal(
        utcDayStart(new Date("2026-10-29T00:30:00+02:00")).toISOString(),
        "2026-10-28T00:00:00.000Z",
    );
    assert.equal(isLocalDatabase("postgres://u:p@127.0.0.1:55432/test"), true);
    assert.equal(isLocalDatabase("postgres://u:p@[::1]/test"), true);
    assert.equal(isLocalDatabase("postgres://u:p@vps/dev"), false);
});

test("remote mutation requires an explicit reviewed target override before connecting", () => {
    const result = spawnSync(
        process.execPath,
        [
            fileURLToPath(
                new URL("../scripts/seed-preview-history.mjs", import.meta.url),
            ),
            "--user",
            "user_owner",
            "--apply",
        ],
        {
            env: {
                ...process.env,
                DATABASE_URL: "postgres://u:p@remote.invalid/dev",
            },
            encoding: "utf8",
        },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not local.*--allow-remote/);
    assert.doesNotMatch(result.stderr, /ENOTFOUND|Connection refused/);
});

const testUrl = process.env.TEST_DATABASE_URL;
const sql = testUrl ? postgres(testUrl, { max: 1, onnotice: () => {} }) : null;
const fixture = `preview_seed_${process.pid}`;
let scopedUrl;

before(async () => {
    if (!sql) return;
    await sql.unsafe(`CREATE SCHEMA "${fixture}"`);
    await sql.unsafe(`SET search_path TO "${fixture}"`);
    await sql.unsafe(`CREATE TABLE "user" (id text PRIMARY KEY);
        CREATE TABLE friends (user_id text, friend_id text, status text);
        CREATE TABLE album (id text PRIMARY KEY, image_url text);
        CREATE TABLE track (id text PRIMARY KEY, album_id text, duration_ms integer);
        CREATE TABLE listening_history (id bigserial PRIMARY KEY, user_id text, track_id text, played_at timestamptz, progress_ms integer, device_name text, device_type text, imported boolean);
        INSERT INTO "user" VALUES ('user_owner'),('user_friend');
        INSERT INTO friends VALUES ('user_owner','user_friend','accepted'),('user_friend','user_owner','accepted'),('user_owner','user_unaccepted','pending');
        INSERT INTO album VALUES ('album','https://example.test/artwork');`);
    for (const track of catalogue)
        await sql`insert into track values (${track.id},'album',${track.duration_ms})`;
    await sql`insert into listening_history (user_id,track_id,played_at,progress_ms,device_name,device_type,imported) values
        ('user_owner','track-1',now()-interval '2 days',60000,'real device','computer',false),
        ('user_owner','track-1',now()-interval '2 days',60000,${marker},'synthetic-preview',true),
        ('user_friend','track-2',now()-interval '2 days',60000,${marker},'synthetic-preview',true)`;
    scopedUrl = new URL(testUrl);
    scopedUrl.searchParams.set("options", `-c search_path=${fixture}`);
});

after(async () => {
    if (!sql) return;
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${fixture}" CASCADE`);
    await sql.end();
});

test(
    "CLI extends only its existing marker, preserves real rows, deduplicates friends and repeats safely",
    { skip: !testUrl },
    async () => {
        const original = await sql`select * from listening_history order by id`;
        function seed() {
            const result = spawnSync(
                process.execPath,
                [
                    fileURLToPath(
                        new URL(
                            "../scripts/seed-preview-history.mjs",
                            import.meta.url,
                        ),
                    ),
                    "--user",
                    "user_owner",
                    "--apply",
                ],
                {
                    env: { ...process.env, DATABASE_URL: scopedUrl.toString() },
                    encoding: "utf8",
                },
            );
            assert.equal(result.status, 0, result.stderr);
            return JSON.parse(result.stdout);
        }
        const first = seed();
        assert.equal(first.accounts, 2);
        assert.ok(first.added > 0);
        const updated = await sql`select * from listening_history order by id`;
        assert.deepEqual(updated.slice(0, original.length), [...original]);
        assert.ok(
            updated
                .slice(original.length)
                .every(
                    (row) =>
                        row.device_name === marker &&
                        row.device_type === "synthetic-preview",
                ),
        );
        assert.equal(seed().added, 0);
        assert.deepEqual(
            await sql`select * from listening_history order by id`,
            updated,
        );
    },
);
