import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, gte, lte } from "drizzle-orm";
import * as schema from "@soundstats/database";
import {
    totalArtistsQuery,
    totalTracksQuery,
    topArtistsQuery,
    topTracksQuery,
    topAlbumsQuery,
} from "../src/server/dashboard-music-queries.ts";

const url = process.env.TEST_DATABASE_URL;
const client = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
const database = client ? drizzle(client, { schema }) : null;
const namespace = `dashboard_music_${process.pid}`;
const ranges = [
    ["2026-10-01T00:00:00Z", "2026-10-30T23:59:59.999Z"],
    ["2026-09-01T00:00:00Z", "2026-09-30T23:59:59.999Z"],
    ["2000-01-01T00:00:00Z", "2026-10-30T23:59:59.999Z"],
    ["2000-01-01T00:00:00Z", "2000-01-02T23:59:59.999Z"],
];
const filters = ([from, to]) =>
    and(
        gte(schema.listeningHistory.playedAt, new Date(from)),
        lte(schema.listeningHistory.playedAt, new Date(to)),
    );

before(async () => {
    if (!client) return;
    await client.unsafe(`CREATE SCHEMA "${namespace}"`);
    await client.unsafe(`SET search_path TO "${namespace}"`);
    await client.unsafe(`
        CREATE TABLE artist (id text PRIMARY KEY, name text NOT NULL, image_url text);
        CREATE TABLE album (id text PRIMARY KEY, name text NOT NULL, image_url text);
        CREATE TABLE track (id text PRIMARY KEY, name text NOT NULL, album_id text REFERENCES album);
        CREATE TABLE artist_tracks (artist_id text REFERENCES artist, track_id text REFERENCES track,
            is_primary_artist boolean NOT NULL, PRIMARY KEY (artist_id, track_id));
        CREATE INDEX at_track_id_idx ON artist_tracks(track_id);
        CREATE TABLE listening_history (user_id text NOT NULL, track_id text NOT NULL REFERENCES track,
            played_at timestamptz NOT NULL, progress_ms integer NOT NULL);
        CREATE INDEX lh_user_played_at_idx ON listening_history(user_id, played_at);
        INSERT INTO artist SELECT 'artist-' || n, 'Artist ' || n, 'artist-image-' || n FROM generate_series(1, 30000) n;
        INSERT INTO album SELECT 'album-' || n, 'Album ' || n, 'album-image-' || n FROM generate_series(1, 15000) n;
        INSERT INTO track SELECT 'track-' || n, 'Track ' || n,
            CASE WHEN n = 8 THEN NULL ELSE 'album-' || ((n + 1) / 2) END FROM generate_series(1, 30000) n;
        INSERT INTO artist_tracks SELECT 'artist-' || ((n + 1) / 2), 'track-' || n, true FROM generate_series(1, 30000) n;
        INSERT INTO artist_tracks SELECT 'artist-' || (n + 1), 'track-' || n, false FROM generate_series(1, 29999) n;
        -- Short plays never enter rankings/counts, even if numerous; minutes
        -- remain handled by the separate, unchanged history-only query.
        INSERT INTO listening_history SELECT 'owner', 'track-1', '2026-10-01Z', 29999 FROM generate_series(1, 80);
        INSERT INTO listening_history VALUES
            ('owner','track-1','2026-10-01Z',30000),
            ('owner','track-1','2026-10-30T23:59:59.999Z',60000),
            ('owner','track-2','2026-10-10Z',60000),
            ('owner','track-2','2026-10-10Z',60000),
            ('owner','track-3','2026-10-10Z',60000),
            ('owner','track-4','2026-10-10Z',60000),
            ('owner','track-5','2026-10-10Z',60000),
            ('owner','track-8','2026-10-10Z',300000),
            ('owner','track-8','2026-10-10Z',300000),
            ('owner','track-8','2026-10-10Z',300000),
            ('owner','track-9','2026-10-31Z',60000),
            ('owner','track-10','2026-09-30T23:59:59.999Z',60000),
            ('owner','track-11','2026-09-01Z',60000),
            ('owner','track-11','2026-09-01Z',60000),
            ('owner','track-1','2026-09-10Z',60000),
            ('owner','track-2','2020-01-01Z',60000),
            ('other','track-12','2026-10-10Z',60000);
        ANALYZE artist; ANALYZE album; ANALYZE track; ANALYZE artist_tracks; ANALYZE listening_history;
    `);
});
after(async () => {
    if (!client) return;
    await client.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);
    await client.end();
});

async function baseline(kind, userId, range, limit, current = true) {
    const [from, to] = range;
    const where = client`h.user_id=${userId} AND h.played_at >= ${from}::timestamptz AND h.played_at <= ${to}::timestamptz AND h.progress_ms >= 30000`;
    if (kind === "totalTracks") {
        const [row] =
            await client`SELECT count(distinct h.track_id)::integer AS "countTracks" FROM listening_history h WHERE ${where}`;
        return [row];
    }
    if (kind === "totalArtists") {
        const [row] =
            await client`SELECT count(distinct a.artist_id)::integer AS "countArtists"
            FROM listening_history h JOIN artist_tracks a ON a.track_id=h.track_id WHERE ${where}`;
        return [row];
    }
    const joins =
        kind === "artists"
            ? client`JOIN artist_tracks a ON a.track_id=t.id JOIN artist m ON m.id=a.artist_id`
            : kind === "albums" || current
              ? client`JOIN album m ON m.id=t.album_id`
              : client``;
    const id = kind === "tracks" ? client`t.id` : client`m.id`;
    const name = kind === "tracks" ? client`t.name` : client`m.name`;
    const image =
        kind === "tracks" && !current ? client`NULL` : client`m.image_url`;
    const rows =
        await client`SELECT ${id} AS id, ${name} AS name, ${image} AS image,
        count(*)::integer AS count FROM listening_history h JOIN track t ON t.id=h.track_id ${joins}
        WHERE ${where} ${kind === "artists" ? client`AND a.is_primary_artist=true` : client``}
        GROUP BY ${id}, ${name}, ${kind === "tracks" && !current ? id : image}
        ORDER BY count(*) DESC, sum(h.progress_ms) DESC, ${name} ASC LIMIT ${limit}`;
    return rows.map(({ id, name, image, count }) => ({
        count,
        [kind === "artists"
            ? "artistId"
            : kind === "tracks"
              ? "trackId"
              : "albumId"]: id,
        [kind === "artists" ? "artist" : kind === "tracks" ? "track" : "album"]:
            name,
        imageUrl: image,
    }));
}

test(
    "preaggregated dashboard queries preserve qualification, collaboration counts, tie order, limits, images, period boundaries and owner isolation",
    { skip: !url },
    async () => {
        for (const owner of ["owner", "other", "empty"]) {
            for (const range of ranges) {
                assert.deepEqual(
                    await totalTracksQuery(database, owner, filters(range)),
                    await baseline("totalTracks", owner, range),
                );
                assert.deepEqual(
                    await totalArtistsQuery(database, owner, filters(range)),
                    await baseline("totalArtists", owner, range),
                );
                for (const limit of [2, 4, 20]) {
                    for (const [kind, query] of [
                        ["artists", topArtistsQuery],
                        ["albums", topAlbumsQuery],
                    ])
                        assert.deepEqual(
                            await query(database, owner, filters(range), limit),
                            await baseline(kind, owner, range, limit),
                        );
                    for (const current of [true, false]) {
                        const rows = await topTracksQuery(
                            database,
                            owner,
                            filters(range),
                            limit,
                            current,
                        );
                        const expected = await baseline(
                            "tracks",
                            owner,
                            range,
                            limit,
                            current,
                        );
                        // Previous ranks never exposed artwork, though the shared
                        // helper can return it without changing those comparisons.
                        if (!current)
                            for (const row of rows) row.imageUrl = null;
                        assert.deepEqual(rows, expected);
                    }
                }
            }
        }
        assert.equal(
            (await totalArtistsQuery(database, "owner", filters(ranges[0])))[0]
                .countArtists,
            7,
        );
        assert.equal(
            (
                await topTracksQuery(
                    database,
                    "owner",
                    filters(ranges[0]),
                    20,
                    false,
                )
            )[0].trackId,
            "track-8",
        );
        assert.equal(
            (
                await topTracksQuery(
                    database,
                    "owner",
                    filters(ranges[0]),
                    20,
                    true,
                )
            )[0].trackId,
            "track-2",
        );
    },
);

function nodes(plan) {
    return [plan, ...(plan.Plans ?? []).flatMap(nodes)];
}
test(
    "dashboard catalogue joins retain indexed correlated lookups rather than scanning unrelated tracks or artist links",
    { skip: !url },
    async () => {
        for (const query of [
            totalArtistsQuery(database, "owner", filters(ranges[0])),
            topArtistsQuery(database, "owner", filters(ranges[0]), 10),
            topTracksQuery(database, "owner", filters(ranges[0]), 10, true),
            topAlbumsQuery(database, "owner", filters(ranges[0]), 10),
        ]) {
            const { sql, params } = query.toSQL();
            const [result] = await client.unsafe(
                `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`,
                params,
            );
            const planNodes = nodes(result["QUERY PLAN"][0].Plan);
            for (const node of planNodes.filter((node) =>
                ["track", "artist_tracks"].includes(node["Relation Name"]),
            )) {
                assert.match(node["Node Type"], /Index|Bitmap Heap Scan/);
                assert.ok(
                    node["Index Cond"] ||
                        nodes(node).some(
                            (child) =>
                                child["Node Type"] === "Bitmap Index Scan" &&
                                child["Index Cond"],
                        ),
                    "lookup must use the correlated track ID as an index condition",
                );
                assert.ok(
                    node["Actual Rows"] <= 2,
                    "lookup should visit only the selected track's metadata/credits",
                );
            }
            assert.match(sql, /offset 0/i);
        }
    },
);
