import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Render the actual page with account/database boundaries replaced. Never reads
// a real user's data, and keeps the section headings and empty states intact.
const state = {
    friends: true,
    history: true,
    profile: { username: "Friend" },
    sectionWait: null,
    onSectionStart: null,
};
const sections = `const section=async(name)=>{globalThis.__dashboardReview.onSectionStart?.(name);await globalThis.__dashboardReview.sectionWait?.(name);return null;};`;
globalThis.__dashboardReview = state;
const source = {
    "server-only": "export {};",
    "next/server": "export const connection=async()=>{};",
    "@clerk/nextjs/server": `export const auth=async()=>({userId:'self'});export const currentUser=async()=>({id:'self'});export const clerkClient=async()=>({users:{getUser:async()=>globalThis.__dashboardReview.profile}});`,
    "@clerk/nextjs": "export const RedirectToSignIn=()=>null;",
    "@/lib/posthog":
        "export const captureServerPageView=async()=>{};export const captureAuthenticatedEvent=async()=>{};",
    "@/server/lib":
        "export const getBaseUrl=()=> 'https://example.com';export const usersAreFriends=async()=>globalThis.__dashboardReview.friends;",
    "@/server/db":
        "const query={from:()=>query,where:()=>query,orderBy:()=>query,limit:async()=>globalThis.__dashboardReview.history?[{playedAt:'2020-01-01'}]:[]};export const db={select:()=>query};",
    "@/components/ui-parts/DateSelector": "export const DateSelector=()=>null;",
    "./check-auth": "export const checkAuth=async()=>true;",
    "./_components/daily-playtime-graph":
        sections + "export const DailyPlaytimeGraph=()=>section('activity');",
    "./_components/totals":
        sections +
        "export const TotalArtists=()=>section('artists');export const TotalMinutes=()=>section('minutes');export const TotalTracks=()=>section('tracks');",
    "./_components/top-music":
        sections +
        "export const TopMusicSkeleton=()=>null;export const TopAlbums=()=>section('top-albums');export const TopArtists=()=>section('top-artists');export const TopTracks=()=>section('top-tracks');",
    "./_components/listening-streaks":
        sections +
        "export const OverallListeningStreak=()=>section('overall-streak');export const OverallListeningStreakSkeleton=()=>null;export const StreakSkeleton=()=>null;export const GenericStreaks=({type})=>section(type+'-streaks');",
};
const hooks = registerHooks({
    resolve(specifier, context, next) {
        if (source[specifier])
            return {
                url: `data:text/javascript,${encodeURIComponent(source[specifier])}`,
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
                    .find((url) => existsSync(new URL(url))) ?? base;
        }
        if (
            specifier.startsWith("./") &&
            context.parentURL?.startsWith("file:")
        ) {
            const base = new URL(specifier, context.parentURL).href;
            specifier =
                [".ts", ".tsx"]
                    .map((ext) => base + ext)
                    .find((url) => existsSync(new URL(url))) ?? specifier;
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
const { default: DashboardPage } =
    await import("../src/app/dashboard/page.tsx");
hooks.deregister();
async function render(user = "friend") {
    return renderToStaticMarkup(
        await DashboardPage({
            searchParams: Promise.resolve({
                user,
                from: "2026-09-01",
                to: "2026-10-17",
            }),
        }),
    );
}
test("friend dashboards reserve viewer wording and imports for the viewer, including unnamed and empty profiles", async () => {
    for (const [profile, name] of [
        [{ firstName: "Named", lastName: "Friend" }, "Named Friend"],
        [{ username: "Friend" }, "Friend"],
        [null, "Listener"],
    ]) {
        state.profile = profile;
        const html = await render();
        assert.ok(html.includes(`${name}’s listening`));
        assert.match(html, /Their heavy rotation/);
        assert.doesNotMatch(
            html,
            /Your sound|Your heavy rotation|rhythm of your days|href="\/import"/,
        );
        assert.match(html, /Streaks as of 17 Oct 2026 · UTC/);
    }
    state.history = false;
    assert.match(await render(), /No listening history yet/);
    assert.doesNotMatch(await render(), /Your listening story|Import your/);
    state.history = true;
});
test("own dashboards retain owner wording and import guidance", async () => {
    const html = await render("self");
    assert.match(html, /Your listening/);
    assert.match(html, /Your heavy rotation/);
    assert.match(html, /href="\/import"/);
});
test("denied dashboards explain privacy and offer both recovery actions", async () => {
    state.friends = false;
    const html = await render();
    assert.match(html, /This listening is private/);
    assert.match(html, /Your dashboard/);
    assert.match(html, /Find friends/);
    assert.doesNotMatch(html, /Their heavy rotation/);
    state.friends = true;
});

test(
    "a period resolves all reporting sections concurrently and reveals no partial dashboard",
    { timeout: 2000 },
    async () => {
        const started = [];
        let releaseActivity, allStarted;
        const activity = new Promise((resolve) => {
            releaseActivity = resolve;
        });
        const startedAll = new Promise((resolve) => {
            allStarted = resolve;
        });
        state.onSectionStart = (name) => {
            started.push(name);
            if (started.length === 11) allStarted();
        };
        state.sectionWait = (name) =>
            name === "activity" ? activity : undefined;
        let resolved = false;
        const page = DashboardPage({
            searchParams: Promise.resolve({
                user: "self",
                from: "2026-09-01",
                to: "2026-10-17",
            }),
        });
        void page.then(() => {
            resolved = true;
        });
        try {
            await startedAll;
            await Promise.resolve();
            assert.equal(new Set(started).size, 11);
            assert.equal(
                resolved,
                false,
                "The page must wait for its slowest reporting section instead of returning partial results",
            );
            releaseActivity();
            await page;
            assert.equal(resolved, true);
        } finally {
            releaseActivity();
            state.onSectionStart = null;
            state.sectionWait = null;
        }
    },
);
