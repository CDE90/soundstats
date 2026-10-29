import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@soundstats/database";
import ts from "typescript";
import { calendarListeningRange, utcDay } from "../src/lib/listening-period.ts";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
const db = sql ? drizzle(sql, { schema }) : null;
globalThis.__leaderboardReviewDb = db;
const fixture = `leaderboard_review_${process.pid}`;
const now = new Date();
const range = calendarListeningRange(7, now);
const today = utcDay(now);
const sources = {
    "server-only": "export {};",
    "@/server/db": "export const db=globalThis.__leaderboardReviewDb;",
    "@/server/lib":
        "export const getUserFriends=async()=>['friend','short','inactive'];export const getUsersOverallStreaks=async(ids)=>new Map(ids.map((id,i)=>[id,{streakLength:10-i,isExtendedToday:true}]));",
    "@clerk/nextjs/server":
        "export const clerkClient=async()=>({users:{getUserList:async({userId})=>({data:userId.map(id=>({id,username:id}))})}});",
};
const hooks = registerHooks({
    resolve(specifier, context, next) {
        if (sources[specifier])
            return {
                url: `data:text/javascript,${encodeURIComponent(sources[specifier])}`,
                shortCircuit: true,
            };
        if (specifier.endsWith(".module.css"))
            return {
                url: "data:text/javascript,export default {}",
                shortCircuit: true,
            };
        if (specifier.startsWith("@/")) {
            const base = new URL(
                `../src/${specifier.slice(2)}`,
                import.meta.url,
            ).href;
            specifier =
                [".ts", ".tsx"]
                    .map((ext) => base + ext)
                    .find((file) => existsSync(new URL(file))) ?? base;
        }
        if (specifier === "next/link" || specifier === "next/image") {
            const resolved = next(`${specifier}.js`, context);
            return {
                url: `data:text/javascript,${encodeURIComponent(`import value from ${JSON.stringify(resolved.url)};export default value.default??value;`)}`,
                shortCircuit: true,
            };
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
const { getLeaderboardData } =
    await import("../src/app/leaderboard/_components/leaderboard-data-fetcher.tsx");
const { LeaderboardList } =
    await import("../src/app/leaderboard/_components/leaderboard-list.tsx");
hooks.deregister();

before(async () => {
    if (!sql) return;
    await sql.unsafe(`CREATE SCHEMA "${fixture}"`);
    await sql.unsafe(`SET search_path TO "${fixture}"`);
    await sql`SET TIME ZONE 'America/Los_Angeles'`;
    await sql.unsafe(
        "CREATE TABLE listening_history (id bigserial PRIMARY KEY,user_id text,track_id text,played_at timestamptz,progress_ms integer,device_name text,device_type text,imported boolean DEFAULT false)",
    );
    await db.insert(schema.listeningHistory).values([
        {
            userId: "self",
            trackId: "track",
            playedAt: today,
            progressMs: 60000,
        },
        {
            userId: "self",
            trackId: "track",
            playedAt: range.from,
            progressMs: 30000,
        },
        {
            userId: "self",
            trackId: "track",
            playedAt: new Date(range.from.getTime() - 1),
            progressMs: 240000,
        },
        {
            userId: "friend",
            trackId: "track",
            playedAt: new Date(today.getTime() - 1),
            progressMs: 120000,
        },
        {
            userId: "friend",
            trackId: "track",
            playedAt: new Date(range.from.getTime() - 1),
            progressMs: 6000,
        },
        {
            userId: "short",
            trackId: "track",
            playedAt: today,
            progressMs: 1000,
        },
        {
            userId: "inactive",
            trackId: "track",
            playedAt: new Date("2020-01-01Z"),
            progressMs: 3600000,
        },
        {
            userId: "stranger",
            trackId: "track",
            playedAt: today,
            progressMs: 9999999,
        },
    ]);
});
after(async () => {
    if (!sql) return;
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${fixture}" CASCADE`);
    await sql.end();
});

test("leaderboard links retain listener and UTC date context for every period", async () => {
    for (const dateRange of [
        calendarListeningRange(1, now),
        range,
        calendarListeningRange(30, now),
        { from: new Date("2020-01-01Z"), to: range.to },
    ]) {
        const html = renderToStaticMarkup(
            await LeaderboardList({
                userComparisons: [
                    {
                        userId: "friend",
                        metric: 60,
                        playtime: 60,
                        streakIsExtendedToday: true,
                        percentChange: null,
                        rankChange: null,
                        previousRank: null,
                    },
                ],
                sortBy: "Playtime",
                viewerId: "self",
                dateRange,
            }),
        );
        const href = html
            .match(/href="([^\"]*\/dashboard\?[^\"]+)"/)[1]
            .replaceAll("&amp;", "&");
        const params = new URL(href, "https://example.com").searchParams;
        assert.equal(params.get("user"), "friend");
        assert.equal(
            params.get("from"),
            dateRange.from.toISOString().slice(0, 10),
        );
        assert.equal(params.get("to"), dateRange.to.toISOString().slice(0, 10));
    }
});
test(
    "leaderboard queries use UTC calendar bounds, exclude strangers and retain global ranks on later pages",
    { skip: !url },
    async () => {
        const result = await getLeaderboardData(
            "self",
            "Playtime",
            "desc",
            "Last 7 days",
            2,
            1,
        );
        assert.deepEqual(result.dateRange, range);
        assert.equal(result.totalPages, 3);
        assert.equal(result.userComparisons[0].userId, "self");
        assert.equal(result.userComparisons[0].playtime, 90);
        assert.equal(result.userComparisons[0].previousRank, 1);
        assert.equal(result.userComparisons[0].rankChange, -1);
        const current = await getLeaderboardData(
            "self",
            "Playtime",
            "desc",
            "Today",
            1,
            10,
        );
        assert.equal(
            current.userComparisons.find((user) => user.userId === "self")
                .playtime,
            60,
        );
        assert.equal(
            current.userComparisons.some(
                (user) =>
                    user.userId === "friend" || user.userId === "stranger",
            ),
            false,
        );
        const all = await getLeaderboardData(
            "self",
            "Playtime",
            "desc",
            "All time",
            1,
            10,
        );
        assert.equal(
            all.dateRange.from.toISOString(),
            "2020-01-01T00:00:00.000Z",
        );
    },
);
test(
    "plays and streak pagination count the same people that their rows contain",
    { skip: !url },
    async () => {
        const plays = await getLeaderboardData(
            "self",
            "Plays",
            "desc",
            "Today",
            1,
            1,
        );
        assert.equal(plays.totalPages, 1);
        assert.equal(plays.userComparisons[0].count, 1);
        const streaks = await getLeaderboardData(
            "self",
            "Streak",
            "desc",
            "Today",
            4,
            1,
        );
        assert.equal(streaks.totalPages, 4);
        assert.equal(streaks.currentPage, 4);
        assert.equal(streaks.userComparisons[0].userId, "inactive");
    },
);
