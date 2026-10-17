import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@soundstats/database";
import { readMusicDetailRange } from "../src/lib/music-details.ts";
import {
    getMusicDetailStats,
    getMusicEntity,
} from "../src/server/music-detail-queries.ts";

// Use only an explicitly supplied test database. Fixtures live in a disposable schema.
const testUrl = process.env.TEST_DATABASE_URL;
const sql = testUrl ? postgres(testUrl, { max: 1, onnotice: () => {} }) : null;
const db = sql ? drizzle(sql, { schema }) : null;
const fixtureSchema = `music_details_test_${process.pid}`;
const context = {
    userId: "self",
    dateRange: readMusicDetailRange("2026-03-01", "2026-03-03"),
};

before(async () => {
    if (!sql) return;
    await sql.unsafe(`CREATE SCHEMA "${fixtureSchema}"`);
    await sql.unsafe(`SET search_path TO "${fixtureSchema}"`);
    // A non-UTC session catches accidental use of the database's timezone.
    await sql`SET TIME ZONE 'America/Los_Angeles'`;
    await sql.unsafe(`
        CREATE TABLE artist (id text PRIMARY KEY, name text NOT NULL, image_url text, created_at timestamptz DEFAULT now(), updated_at timestamptz);
        CREATE TABLE album (id text PRIMARY KEY, name text, image_url text);
        CREATE TABLE track (id text PRIMARY KEY, name text, album_id text);
        CREATE TABLE artist_tracks (artist_id text, track_id text, is_primary_artist boolean, PRIMARY KEY (artist_id, track_id));
        CREATE TABLE artist_albums (artist_id text, album_id text, PRIMARY KEY (artist_id, album_id));
        CREATE TABLE listening_history (id bigserial PRIMARY KEY, user_id text, track_id text, played_at timestamptz, progress_ms integer, device_name text, imported boolean DEFAULT false);
        INSERT INTO artist (id, name) VALUES ('artist-a', 'Artist A'), ('artist-b', 'Artist B'), ('empty', 'Unheard artist');
        INSERT INTO album VALUES ('album', 'Album', 'https://i.scdn.co/album');
        INSERT INTO album VALUES ('empty-album', 'Unheard album', NULL);
        INSERT INTO track VALUES ('track-a', 'Track A', 'album'), ('track-b', 'Track B', NULL), ('other', 'Unrelated', NULL);
        INSERT INTO track VALUES ('track-c', 'Track C', 'album');
        INSERT INTO artist_tracks VALUES ('artist-a', 'track-a', true), ('artist-b', 'track-a', false), ('artist-a', 'track-b', true);
        INSERT INTO artist_tracks VALUES ('artist-a', 'track-c', true), ('artist-b', 'track-c', false);
        INSERT INTO artist_albums VALUES ('artist-a', 'album'), ('artist-b', 'album');
        INSERT INTO listening_history (user_id, track_id, played_at, progress_ms, imported) VALUES
            ('self', 'track-a', '2026-02-28T23:59:59.999Z', 60000, false),
            ('self', 'track-a', '2026-03-01T00:00:00Z', 30000, false),
            ('self', 'track-a', '2026-03-01T23:59:59Z', 60000, true),
            ('self', 'track-b', '2026-03-03T23:59:59.999Z', 120000, false),
            ('self', 'track-a', '2026-03-04T00:00:00Z', 60000, false),
            ('self', 'track-a', '2026-03-02T12:00:00Z', 29999, false),
            ('self', 'other', '2026-03-02T12:00:00Z', 180000, false),
            ('friend', 'track-a', '2026-03-02T12:00:00Z', 180000, false),
            ('album-user', 'track-a', '2026-03-01T00:00:00Z', 60000, true),
            ('album-user', 'track-c', '2026-03-03T23:59:59.999Z', 120000, false),
            ('album-user', 'track-b', '2026-03-02T12:00:00Z', 180000, false);
    `);
});

after(async () => {
    if (!sql) return;
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${fixtureSchema}" CASCADE`);
    await sql.end();
});

test(
    "artist stats isolate the user, entity, period and 30-second threshold",
    { skip: !testUrl },
    async () => {
        const stats = await getMusicDetailStats(
            db,
            "artist",
            "artist-a",
            context,
        );
        assert.deepEqual(stats.summary, {
            plays: 3,
            minutes: 3.5,
            uniqueTracks: 2,
            listeningDays: 2,
        });
        assert.deepEqual(stats.dailyPlaytime, [
            { date: "2026-03-01", playtime: 90 },
            { date: "2026-03-02", playtime: 0 },
            { date: "2026-03-03", playtime: 120 },
        ]);
        assert.equal(
            stats.lifetime.firstPlayedAt.toISOString(),
            "2026-02-28T23:59:59.999Z",
        );
        assert.equal(
            stats.lifetime.lastPlayedAt.toISOString(),
            "2026-03-04T00:00:00.000Z",
        );
        assert.deepEqual(
            stats.topTracks.map((track) => [track.id, track.plays]),
            [
                ["track-a", 2],
                ["track-b", 1],
            ],
        );
        assert.deepEqual(
            stats.recentPlays.map((play) => play.trackId),
            ["track-b", "track-a", "track-a"],
        );
        assert.equal(stats.recentPlays[1].progressMs, 60000);
    },
);

test(
    "track stats do not multiply plays when several artists are credited",
    { skip: !testUrl },
    async () => {
        const stats = await getMusicDetailStats(
            db,
            "track",
            "track-a",
            context,
        );
        assert.equal(stats.summary.plays, 2);
        assert.equal(stats.summary.minutes, 1.5);
        assert.deepEqual(stats.topTracks, []);
        const featuredArtist = await getMusicDetailStats(
            db,
            "artist",
            "artist-b",
            context,
        );
        assert.equal(featuredArtist.summary.plays, 2);
        const friendStats = await getMusicDetailStats(db, "track", "track-a", {
            ...context,
            userId: "friend",
        });
        assert.equal(friendStats.summary.plays, 1);
        assert.equal(friendStats.summary.minutes, 3);
    },
);

test(
    "missing entities and empty histories have explicit empty results",
    { skip: !testUrl },
    async () => {
        assert.equal(await getMusicEntity(db, "artist", "missing"), null);
        assert.equal(await getMusicEntity(db, "track", "missing"), null);
        assert.equal(await getMusicEntity(db, "album", "missing"), null);
        const track = await getMusicEntity(db, "track", "track-a");
        assert.equal(track.album, "Album");
        assert.equal(track.albumId, "album");
        assert.deepEqual(
            track.artists.map((artist) => artist.id),
            ["artist-a", "artist-b"],
        );
        assert.equal(
            (await getMusicEntity(db, "track", "track-b")).imageUrl,
            null,
        );
        const stats = await getMusicDetailStats(db, "artist", "empty", context);
        assert.deepEqual(stats.summary, {
            plays: 0,
            minutes: 0,
            uniqueTracks: 0,
            listeningDays: 0,
        });
        assert.deepEqual(stats.lifetime, {
            firstPlayedAt: null,
            lastPlayedAt: null,
        });
        assert.deepEqual(stats.recentPlays, []);
        assert.deepEqual(stats.topTracks, []);
        assert.equal(stats.dailyPlaytime.length, 3);
        assert.ok(stats.dailyPlaytime.every((day) => day.playtime === 0));
    },
);

test(
    "album stats combine only the album's tracks without multiplying artist credits",
    { skip: !testUrl },
    async () => {
        const album = await getMusicEntity(db, "album", "album");
        assert.equal(album.name, "Album");
        assert.deepEqual(
            album.artists.map((artist) => artist.id),
            ["artist-a", "artist-b"],
        );
        const stats = await getMusicDetailStats(db, "album", "album", {
            ...context,
            userId: "album-user",
        });
        assert.deepEqual(stats.summary, {
            plays: 2,
            minutes: 3,
            uniqueTracks: 2,
            listeningDays: 2,
        });
        assert.deepEqual(stats.dailyPlaytime, [
            { date: "2026-03-01", playtime: 60 },
            { date: "2026-03-02", playtime: 0 },
            { date: "2026-03-03", playtime: 120 },
        ]);
        assert.deepEqual(
            stats.topTracks.map((track) => track.id),
            ["track-c", "track-a"],
        );
        assert.deepEqual(
            stats.recentPlays.map((play) => play.trackId),
            ["track-c", "track-a"],
        );
        assert.equal(
            stats.lifetime.firstPlayedAt.toISOString(),
            "2026-03-01T00:00:00.000Z",
        );
        const empty = await getMusicDetailStats(
            db,
            "album",
            "empty-album",
            context,
        );
        assert.equal(empty.summary.plays, 0);
        assert.deepEqual(empty.topTracks, []);
        assert.deepEqual(empty.recentPlays, []);
        assert.equal(
            (await getMusicEntity(db, "album", "empty-album")).imageUrl,
            null,
        );
    },
);

test(
    "long histories use monthly buckets and recent history is limited to 25 plays",
    { skip: !testUrl },
    async () => {
        await sql`INSERT INTO listening_history (user_id, track_id, played_at, progress_ms) SELECT 'many', 'track-a', '2026-03-01'::timestamptz + n * interval '1 minute', 30000 FROM generate_series(1, 30) n`;
        const stats = await getMusicDetailStats(db, "track", "track-a", {
            userId: "many",
            dateRange: readMusicDetailRange("2025-01-01", "2026-03-31"),
        });
        assert.equal(stats.monthly, true);
        assert.equal(stats.dailyPlaytime.length, 15);
        assert.equal(stats.dailyPlaytime.at(-1).playtime, 900);
        assert.equal(stats.recentPlays.length, 25);
        assert.ok(
            stats.recentPlays[0].playedAt > stats.recentPlays[24].playedAt,
        );
    },
);
