import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@soundstats/database";
import ts from "typescript";
import { readReportingSnapshot } from "../src/server/reporting-database.ts";

const url = process.env.TEST_DATABASE_URL;
const client = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
const database = client ? drizzle(client, { schema }) : null;
const fixture = `reporting_queries_${process.pid}`;
globalThis.__reportingQueryDatabase = database;
const boundaries = {
    "server-only": "export {};",
    "next/cache": "export const cacheLife=()=>{};",
    "@clerk/nextjs/server": "export {};",
    "@/server/db": "export const db=globalThis.__reportingQueryDatabase;",
};
const hooks = registerHooks({
    resolve(specifier, context, next) {
        if (boundaries[specifier])
            return {
                url: `data:text/javascript,${encodeURIComponent(boundaries[specifier])}`,
                shortCircuit: true,
            };
        if (specifier.startsWith("@/")) {
            const base = new URL(
                `../src/${specifier.slice(2)}`,
                import.meta.url,
            ).href;
            specifier =
                [".ts", ".tsx"]
                    .map((extension) => base + extension)
                    .find((path) => existsSync(new URL(path))) ?? base;
        }
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url.startsWith("file:") && url.endsWith(".tsx"))
            return {
                format: "module",
                source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
                    compilerOptions: {
                        target: ts.ScriptTarget.ES2022,
                        jsx: ts.JsxEmit.ReactJSX,
                        module: ts.ModuleKind.ESNext,
                    },
                }).outputText,
                shortCircuit: true,
            };
        return next(url, context);
    },
});
const { getUserStreaks, getUsersOverallStreaks, getPrevDateRange } =
    await import("../src/server/lib.ts");
const { TotalMinutes } =
    await import("../src/app/dashboard/_components/totals.tsx");
hooks.deregister();

before(async () => {
    if (!client) return;
    await client.unsafe(`CREATE SCHEMA "${fixture}"`);
    await client.unsafe(`SET search_path TO "${fixture}"`);
    await client`SET TIME ZONE 'America/Los_Angeles'`;
    await client.unsafe(`
        CREATE TABLE artist (id text PRIMARY KEY, name text, image_url text);
        CREATE TABLE album (id text PRIMARY KEY, name text, image_url text);
        CREATE TABLE track (id text PRIMARY KEY, name text, album_id text);
        CREATE TABLE artist_tracks (artist_id text, track_id text);
        CREATE TABLE listening_history (user_id text, track_id text, played_at timestamptz, progress_ms integer);
        INSERT INTO artist VALUES ('artist', 'Artist', NULL);
        INSERT INTO album VALUES ('album', 'Album', NULL);
        INSERT INTO track VALUES ('track', 'Track', 'album');
        INSERT INTO artist_tracks VALUES ('artist', 'track');
        INSERT INTO listening_history VALUES
            ('self', 'track', '2026-03-01T00:00:00Z', 60000),
            ('self', 'track', '2026-03-01T23:00:00Z', 60000),
            ('self', 'track', '2026-03-02T23:00:00Z', 60000),
            ('self', 'track', '2026-03-03T23:00:00Z', 60000),
            ('self', 'track', '2026-03-04T12:00:00Z', 29999),
            ('other', 'track', '2026-03-04T12:00:00Z', 60000),
            ('comparison', 'track', '2026-03-02T00:00:00Z', 120000),
            ('comparison', 'track', '2026-03-03T00:00:00Z', 60000);
    `);
});
after(async () => {
    if (!client) return;
    await client.unsafe(`DROP SCHEMA IF EXISTS "${fixture}" CASCADE`);
    await client.end();
});

test("summary comparisons end before the current period and have exactly equal duration", () => {
    const range = {
        from: new Date("2026-03-03T00:00:00Z"),
        to: new Date("2026-03-03T23:59:59.999Z"),
    };
    const previous = getPrevDateRange(range);
    assert.equal(previous.from.toISOString(), "2026-03-02T00:00:00.000Z");
    assert.equal(previous.to.toISOString(), "2026-03-02T23:59:59.999Z");
    assert.equal(previous.to - previous.from, range.to - range.from);
});

test(
    "the actual summary query counts exact UTC boundaries in the correct comparison period",
    { skip: !url },
    async () => {
        const result = await readReportingSnapshot(database, (snapshot) =>
            TotalMinutes({
                database: snapshot,
                userId: "comparison",
                dateRange: {
                    from: new Date("2026-03-03T00:00:00Z"),
                    to: new Date("2026-03-03T23:59:59.999Z"),
                },
            }),
        );
        const html = renderToStaticMarkup(result);
        assert.match(html, /50\.0% decrease in minutes listened/);
        assert.match(html, /class="ss-metric-value">1<\/p>/);
    },
);

test(
    "overall and artist/track/album streaks use UTC days inside the report snapshot regardless of database timezone",
    { skip: !url },
    async () => {
        for (const [date, extended] of [
            ["2026-03-03", true],
            ["2026-03-04", false],
        ]) {
            const endDate = new Date(`${date}T23:59:59.999Z`);
            await readReportingSnapshot(database, async (snapshot) => {
                const overall = await getUsersOverallStreaks(
                    ["self", "missing"],
                    endDate,
                    snapshot,
                );
                assert.deepEqual(overall.get("self"), {
                    streakLength: 3,
                    isExtendedToday: extended,
                });
                assert.equal(overall.has("missing"), false);
                for (const type of ["artist", "track", "album"]) {
                    const rows = await getUserStreaks(
                        "self",
                        10,
                        type,
                        endDate,
                        snapshot,
                    );
                    assert.equal(rows.length, 1);
                    assert.equal(rows[0].streakLength, 3, type);
                    assert.equal(rows[0].isExtendedToday, extended, type);
                }
            });
        }
    },
);
