import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
    mkdir,
    realpath,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { chromium } from "playwright";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function run(command, args, cwd, env) {
    return new Promise((resolveRun, reject) => {
        const child = spawn(command, args, {
            cwd,
            env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        for (const stream of [child.stdout, child.stderr])
            stream.on("data", (data) => {
                output = (output + data).slice(-20000);
            });
        child.on("error", reject);
        child.on("exit", (code) =>
            code === 0 ? resolveRun(output) : reject(new Error(output)),
        );
    });
}

// Production Next routing with the actual dashboard and date picker. Only the
// account/database boundaries and reporting queries use deterministic fixtures.
// Opt in because this builds a separate production app (about 30 seconds).
test(
    "date changes keep one complete dashboard visible until the new period is ready",
    {
        skip: process.env.RUN_NEXT_TRANSITION_TEST !== "1",
        timeout: 180000,
    },
    async () => {
        const temp = await mkdtemp(
            join(tmpdir(), "soundstats-dashboard-transition-"),
        );
        let server, browser;
        try {
            await mkdir(join(temp, "app/dashboard"), { recursive: true });
            await mkdir(join(temp, "mocks"));
            // Individual package links keep Next's dependency checks isolated;
            // never link the complete node_modules directory, which an automatic
            // dependency install could otherwise mutate through the symlink.
            await mkdir(join(temp, "node_modules"));
            const webPackage = JSON.parse(
                await readFile(join(web, "package.json"), "utf8"),
            );
            const repo = resolve(web, "../..");
            const rootPackage = JSON.parse(
                await readFile(join(repo, "package.json"), "utf8"),
            );
            for (const name of [
                ...Object.keys(webPackage.dependencies),
                "typescript",
                "@types/node",
                "@types/react",
                "@types/react-dom",
            ]) {
                let target;
                for (const base of [repo, web]) {
                    try {
                        target = await realpath(
                            join(base, "node_modules", name),
                        );
                        break;
                    } catch {}
                }
                if (!target)
                    throw new Error(`Fixture dependency missing: ${name}`);
                await mkdir(dirname(join(temp, "node_modules", name)), {
                    recursive: true,
                });
                await symlink(target, join(temp, "node_modules", name), "dir");
            }
            await writeFile(
                join(temp, "package.json"),
                JSON.stringify({
                    name: "soundstats-transition-fixture",
                    private: true,
                    type: "module",
                    dependencies: {
                        next: webPackage.dependencies.next,
                        react: webPackage.dependencies.react,
                        "react-dom": webPackage.dependencies["react-dom"],
                    },
                    devDependencies: {
                        typescript: rootPackage.devDependencies.typescript,
                        "@types/node":
                            rootPackage.devDependencies["@types/node"],
                        "@types/react":
                            webPackage.devDependencies["@types/react"],
                        "@types/react-dom":
                            webPackage.devDependencies["@types/react-dom"],
                    },
                }),
            );
            await writeFile(
                join(temp, "tsconfig.json"),
                JSON.stringify({
                    compilerOptions: {
                        target: "ES2022",
                        module: "ESNext",
                        moduleResolution: "bundler",
                        jsx: "preserve",
                        strict: true,
                        esModuleInterop: true,
                        skipLibCheck: true,
                        baseUrl: ".",
                        paths: { "@/*": [join(web, "src/*")] },
                    },
                }),
            );
            await writeFile(
                join(temp, "next.config.mjs"),
                `export default {cacheComponents:true,typescript:{ignoreBuildErrors:true},experimental:{externalDir:true},webpack(config){config.resolve.alias['@clerk/nextjs/server$']=${JSON.stringify(join(temp, "mocks/clerk.ts"))};config.resolve.alias['@clerk/nextjs$']=${JSON.stringify(join(temp, "mocks/clerk-client.tsx"))};config.resolve.alias['@/lib/posthog$']=${JSON.stringify(join(temp, "mocks/posthog.ts"))};config.resolve.alias['@/server/lib$']=${JSON.stringify(join(temp, "mocks/lib.ts"))};config.resolve.alias['@/server/db$']=${JSON.stringify(join(temp, "mocks/db.ts"))};config.resolve.alias['@']=${JSON.stringify(join(web, "src"))};return config;}};`,
            );
            await writeFile(
                join(temp, "mocks/clerk.ts"),
                `export const auth=async()=>({userId:'self'});export const currentUser=async()=>({id:'self'});export const clerkClient=async()=>({users:{getUser:async()=>({username:'Fixture listener'})}});`,
            );
            await writeFile(
                join(temp, "mocks/clerk-client.tsx"),
                `export const RedirectToSignIn=()=>null;`,
            );
            await writeFile(
                join(temp, "mocks/posthog.ts"),
                `export const captureServerPageView=async()=>{};export const captureAuthenticatedEvent=async()=>{};`,
            );
            await writeFile(
                join(temp, "mocks/lib.ts"),
                `export const getBaseUrl=()=> 'http://127.0.0.1:'+process.env.PORT;export const usersAreFriends=async()=>true;`,
            );
            await writeFile(
                join(temp, "mocks/db.ts"),
                `const query={from:()=>query,where:()=>query,orderBy:()=>query,limit:async()=>[{playedAt:'2020-01-01'}]};export const db={select:()=>query};`,
            );
            await writeFile(
                join(temp, "mocks/auth.ts"),
                `export const checkAuth=async()=>true;`,
            );
            await writeFile(
                join(temp, "mocks/sections.tsx"),
                `
import { PlaytimeChart } from ${JSON.stringify(join(web, "src/components/ui-parts/PlaytimeChart"))};
async function metric(name, props, delay=150){const day=props.dateRange?.from??props.startDate??props.endDate;const key=day?.toISOString().slice(0,10);await new Promise(r=>setTimeout(r,key==='2026-09-01'?15:delay));return <span data-dashboard-section={name} data-range={key}>{name+' '+key}</span>;}
export const TotalMinutes=(props)=>metric('minutes',props,500);
export const TotalArtists=(props)=>metric('artists',props);
export const TotalTracks=(props)=>metric('tracks',props);
export const OverallListeningStreak=(props)=>metric('streak',props);
export const TopArtists=(props)=>metric('top-artists',props,350);
export const TopTracks=(props)=>metric('top-tracks',props);
export const TopAlbums=(props)=>metric('top-albums',props);
export const GenericStreaks=(props)=>metric(props.type+'-streaks',props);
export const TopMusicSkeleton=()=> <div data-dashboard-skeleton>Loading music</div>;
export const DailyPlaytimeGraph=async(props)=>{await metric('activity',props,1000);return <div data-dashboard-section="activity" data-range={props.startDate.toISOString().slice(0,10)}><PlaytimeChart dailyPlaytime={[{date:props.startDate.toISOString(),playtime:120},{date:props.endDate.toISOString(),playtime:60}]} granularity="day"/></div>;};`,
            );
            let page = await readFile(
                join(web, "src/app/dashboard/page.tsx"),
                "utf8",
            );
            for (const name of [
                "totals",
                "top-music",
                "listening-streaks",
                "daily-playtime-graph",
            ])
                page = page.replaceAll(
                    `"./_components/${name}"`,
                    JSON.stringify(join(temp, "mocks/sections")),
                );
            page = page.replaceAll(
                '"./check-auth"',
                JSON.stringify(join(temp, "mocks/auth")),
            );
            page = page.replaceAll(
                '"./_components/music-section"',
                JSON.stringify(
                    join(web, "src/app/dashboard/_components/music-section"),
                ),
            );
            await writeFile(join(temp, "app/dashboard/page.tsx"), page);
            let loading = await readFile(
                join(web, "src/app/dashboard/loading.tsx"),
                "utf8",
            );
            loading = loading.replaceAll(
                '"./_components/top-music"',
                JSON.stringify(join(temp, "mocks/sections")),
            );
            await writeFile(join(temp, "app/dashboard/loading.tsx"), loading);
            await writeFile(
                join(temp, "input.css"),
                (await readFile(join(web, "src/styles/globals.css"), "utf8")) +
                    "\n" +
                    (await readFile(
                        join(web, "src/styles/redesign.css"),
                        "utf8",
                    )),
            );
            await run(
                process.execPath,
                [
                    join(web, "node_modules/tailwindcss/lib/cli.js"),
                    "-c",
                    join(web, "tailwind.config.ts"),
                    "-i",
                    join(temp, "input.css"),
                    "-o",
                    join(temp, "app/styles.css"),
                ],
                web,
                process.env,
            );
            await writeFile(
                join(temp, "app/layout.tsx"),
                `import './styles.css';export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}`,
            );
            const next = join(web, "node_modules/next/dist/bin/next");
            const env = {
                ...process.env,
                NEXT_TELEMETRY_DISABLED: "1",
                NODE_ENV: "production",
            };
            await run(
                process.execPath,
                [next, "build", "--webpack"],
                temp,
                env,
            );
            const reservation = createServer();
            await new Promise((resolvePort) =>
                reservation.listen(0, "127.0.0.1", resolvePort),
            );
            const port = reservation.address().port;
            await new Promise((resolveClose) =>
                reservation.close(resolveClose),
            );
            let output = "";
            server = spawn(
                process.execPath,
                [next, "start", "-p", String(port)],
                {
                    cwd: temp,
                    env: { ...env, PORT: String(port) },
                    stdio: ["ignore", "pipe", "pipe"],
                },
            );
            for (const stream of [server.stdout, server.stderr])
                stream.on("data", (data) => {
                    output = (output + data).slice(-20000);
                });
            await new Promise((resolveReady, reject) => {
                const timeout = setTimeout(
                    () => reject(new Error(output)),
                    15000,
                );
                server.stdout.on("data", () => {
                    if (output.includes("Ready in")) {
                        clearTimeout(timeout);
                        resolveReady();
                    }
                });
                server.on("exit", () => {
                    clearTimeout(timeout);
                    reject(new Error(output));
                });
            });
            const macChrome =
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
            browser = await chromium.launch({
                headless: true,
                executablePath:
                    process.env.TEST_BROWSER_EXECUTABLE ||
                    (existsSync(macChrome) ? macChrome : undefined),
            });
            const context = await browser.newContext({
                viewport: { width: 390, height: 844 },
            });
            const tab = await context.newPage();
            await tab.goto(
                `http://127.0.0.1:${port}/dashboard?from=2026-09-01&to=2026-09-07&user=self`,
            );
            await tab.locator('[data-dashboard-section="minutes"]').waitFor();
            await tab
                .getByLabel("Loading listening chart")
                .waitFor({ state: "hidden" });
            // Keep a frame-by-frame record, including transient fallback flashes.
            await tab.evaluate(() => {
                window.__dashboardFrames = [];
                window.__sampleDashboard = true;
                const sample = () => {
                    if (!window.__sampleDashboard) return;
                    const section = document.querySelector(".ss-dashboard");
                    window.__dashboardFrames.push({
                        loading:
                            !!section?.matches('[aria-busy="true"]') ||
                            !!document.querySelector(
                                '[data-dashboard-skeleton], [aria-label="Loading listening chart"]',
                            ),
                        ranges: [
                            ...document.querySelectorAll(
                                "[data-dashboard-section]",
                            ),
                        ].map((x) => x.getAttribute("data-range")),
                        pending:
                            document.querySelector('[role="status"]')
                                ?.textContent,
                    });
                    requestAnimationFrame(sample);
                };
                sample();
            });
            const picker = tab.getByRole("button", {
                name: "Listening period (UTC)",
            });
            await picker.click();
            await tab
                .getByLabel("Quick date range")
                .selectOption({ label: "Last 7 days" });
            await tab
                .getByRole("button", { name: "Apply", exact: true })
                .focus();
            await tab.keyboard.press("Enter");
            await tab
                .getByText("Updating listening period…", { exact: true })
                .waitFor();
            assert.equal(await picker.isDisabled(), true);
            await tab.waitForFunction(
                () =>
                    new URL(location.href).searchParams.get("from") !==
                    "2026-09-01",
            );
            await tab
                .getByText("Updating listening period…", { exact: true })
                .waitFor({ state: "hidden" });
            await tab.waitForFunction(() =>
                [
                    ...document.querySelectorAll("[data-dashboard-section]"),
                ].every((x) => x.getAttribute("data-range") !== "2026-09-01"),
            );
            const result = await tab.evaluate(() => {
                window.__sampleDashboard = false;
                return { frames: window.__dashboardFrames, url: location.href };
            });
            assert.ok(
                result.frames.some((frame) =>
                    frame.pending?.includes("Updating listening period"),
                ),
            );
            assert.ok(result.frames.length > 5);
            assert.equal(
                result.frames.some((frame) => frame.loading),
                false,
                "A revealed dashboard should not return to route/section/chart loading during a period change",
            );
            assert.equal(
                result.frames.some(
                    (frame) =>
                        frame.ranges.includes("2026-09-01") &&
                        frame.ranges.some(
                            (range) =>
                                range !== "2026-09-01" &&
                                range !== "2026-09-07",
                        ),
                ),
                false,
                "Do not mix old and new reporting periods",
            );
            assert.equal(new URL(result.url).searchParams.get("user"), "self");
            assert.equal(await picker.isEnabled(), true);
            assert.equal(
                await picker.evaluate(
                    (element) => element === document.activeElement,
                ),
                true,
            );
            await context.close();
        } finally {
            await browser?.close();
            server?.kill("SIGTERM");
            if (server && server.exitCode === null)
                await new Promise((resolveExit) =>
                    server.once("exit", resolveExit),
                );
            await rm(temp, { recursive: true, force: true });
        }
    },
);
