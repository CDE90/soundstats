import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// Exercise the real client components and CSS. Only account/network boundaries
// are replaced, so failures/retries never affect a real account or upload store.
const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let browser, server, temp, origin;
const react = 'import React from "react";';
const mocks = {
    "next/link": `${react} export default function Link({href,children,prefetch,...props}) { return React.createElement('a',{...props,href},children); }`,
    "next/image": `${react} export default function Image({priority,fill,unoptimized,...props}) { return React.createElement('img',props); }`,
    "next/navigation": `export const usePathname=()=>'/dashboard'; export const useSearchParams=()=>new URLSearchParams(location.search); export const useRouter=()=>({push:url=>{window.__lastNavigation=url;},refresh:()=>{}});`,
    "@clerk/nextjs": `${react} export const SignedOut=({children})=>children; export const SignedIn=()=>null; export const SignInButton=({children})=>children; export const UserButton=()=>null;`,
    theme: `export const useTheme=()=>({resolvedTheme:'light',setThemeMode:()=>{}});`,
    badge: `export const FriendsNotificationBadge=()=>null;`,
    admin: `export const updateUserStatus=async()=>{throw new Error('Failed')}; export const updateUserPremium=updateUserStatus; export const updateUserAdmin=updateUserStatus;`,
    friends: `export const searchUsers=async(query)=>{await new Promise(r=>setTimeout(r,query==='slow'?700:10));return query==='error'?{error:'Unavailable'}:{users:[{id:query,name:query+' person'}]};};export const sendFriendRequest=async()=>window.__sendSuccess?{success:true}:{error:'Could not send request'};export const removeFriend=async()=>{if(window.__socialReject)throw new Error('Action rejected');return window.__socialSuccess?{success:true}:{error:'Action failed'};};export const acceptFriendRequest=removeFriend;export const rejectFriendRequest=removeFriend;`,
    invites: `export const createInvite=async()=>{window.__inviteCalls=(window.__inviteCalls||0)+1;return {error:'Review fixture did not create an invite'};};export const deleteInvite=async()=>({error:'Failed'});export const toggleInviteStatus=deleteInvite;`,
    upload: `export const useUploadThing=()=>({startUpload:async()=>{window.__uploadCalls=(window.__uploadCalls||0)+1;if(window.__uploadFail||window.__uploadFailAt===window.__uploadCalls)throw new Error('Failed');return [{key:'fixture'}];}});`,
    imports: `export const retryImport=async()=>({error:'This import couldn’t be queued. Try again.'});`,
    feed: `export const getRecentListens=async()=>{await new Promise(r=>setTimeout(r,100));if(!window.__feedSuccess)throw new Error('Unavailable');return [];};`,
    database: `export const IMPORT_PROCESSING_LEASE_MS=1800000;`,
};

before(async () => {
    temp = await mkdtemp(join(tmpdir(), "soundstats-interactions-"));
    await build({
        entryPoints: [join(web, "tests/fixtures/ui-interactions.tsx")],
        outfile: join(temp, "fixture.js"),
        bundle: true,
        platform: "browser",
        format: "esm",
        jsx: "automatic",
        logLevel: "silent",
        plugins: [
            {
                name: "fixture-boundaries",
                setup(builder) {
                    builder.onResolve({ filter: /.*/ }, (args) => {
                        let key = args.path;
                        if (key.includes("colorswitchcn/theme-provider"))
                            key = "theme";
                        else if (key.endsWith("FriendsNotificationBadge"))
                            key = "badge";
                        else if (
                            key === "../actions" &&
                            args.importer.includes("/admin/")
                        )
                            key = "admin";
                        else if (
                            key === "../actions" &&
                            args.importer.includes("/friends/")
                        )
                            key = "friends";
                        else if (
                            key === "../actions" &&
                            args.importer.includes("/invite/")
                        )
                            key = "invites";
                        else if (
                            key === "../actions" &&
                            args.importer.includes("/import/")
                        )
                            key = "imports";
                        else if (
                            key === "./actions" &&
                            args.importer.includes("/feed/")
                        )
                            key = "feed";
                        else if (key === "@/lib/uploadthing") key = "upload";
                        else if (key === "@soundstats/database")
                            key = "database";
                        if (mocks[key])
                            return { path: key, namespace: "fixture-mock" };
                        if (key.startsWith("@/")) {
                            const target = resolve(web, "src", key.slice(2));
                            return {
                                path:
                                    [
                                        target,
                                        `${target}.ts`,
                                        `${target}.tsx`,
                                    ].find(existsSync) ?? target,
                            };
                        }
                    });
                    builder.onLoad(
                        { filter: /.*/, namespace: "fixture-mock" },
                        (args) => ({
                            contents: mocks[args.path],
                            loader: "js",
                            resolveDir: web,
                        }),
                    );
                },
            },
        ],
    });
    const css =
        (await readFile(join(web, "src/styles/globals.css"), "utf8")) +
        "\n" +
        (await readFile(join(web, "src/styles/redesign.css"), "utf8"));
    await writeFile(join(temp, "input.css"), css);
    execFileSync(
        join(web, "node_modules/.bin/tailwindcss"),
        [
            "-c",
            join(web, "tailwind.config.ts"),
            "-i",
            join(temp, "input.css"),
            "-o",
            join(temp, "styles.css"),
        ],
        { cwd: web, stdio: "pipe" },
    );
    server = createServer(async (req, res) => {
        const path = new URL(req.url, "http://localhost").pathname;
        if (["/fixture.js", "/fixture.css", "/styles.css"].includes(path)) {
            res.setHeader(
                "Content-Type",
                path.endsWith("css") ? "text/css" : "text/javascript",
            );
            res.end(await readFile(join(temp, path.slice(1))));
        } else {
            res.setHeader("Content-Type", "text/html");
            res.end(
                '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SoundStats UI tests</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
            );
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    const macChrome =
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    browser = await chromium.launch({
        headless: true,
        executablePath:
            process.env.TEST_BROWSER_EXECUTABLE ||
            (existsSync(macChrome) ? macChrome : undefined),
    });
});
after(async () => {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (temp) await rm(temp, { recursive: true, force: true });
});
async function pageFor(fixture, width = 390, height = 844) {
    const context = await browser.newContext({
        viewport: { width, height },
        timezoneId: "Pacific/Auckland",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.goto(`${origin}/?fixture=${fixture}`);
    await page.locator("#root > div").waitFor();
    return page;
}
async function textVisible(page, text) {
    await page.getByText(text, { exact: true }).waitFor({ state: "visible" });
}

test("mobile date picker shows both navigation directions, applies exactly seven UTC dates and returns focus", async () => {
    for (const width of [320, 390, 1440]) {
        const page = await pageFor("dates", width, width === 320 ? 568 : 844);
        const trigger = page.getByRole("button", {
            name: "Listening period (UTC)",
        });
        await trigger.click();
        await page
            .getByRole("button", { name: "Go to next month" })
            .waitFor({ state: "visible" });
        await page
            .getByRole("button", { name: "Go to previous month" })
            .waitFor({ state: "visible" });
        assert.equal(
            await page.locator(".ss-range-popover table").count(),
            width < 640 ? 1 : 2,
        );
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
        );
        if (width < 640)
            await page
                .getByLabel("Quick date range")
                .selectOption({ label: "Last 7 days" });
        else
            await page
                .getByRole("button", {
                    name: "Select Last 7 days",
                    exact: true,
                })
                .click();
        await page.getByRole("button", { name: "Apply", exact: true }).click();
        const href = await page.evaluate(() => window.__lastNavigation);
        const params = new URL(href).searchParams;
        assert.equal(
            (new Date(params.get("to")) - new Date(params.get("from"))) /
                86400000 +
                1,
            7,
        );
        assert.equal(params.get("to"), new Date().toISOString().slice(0, 10));
        await page.waitForFunction(
            () =>
                document.activeElement?.getAttribute("aria-label") ===
                "Listening period (UTC)",
        );
        await trigger.press("Enter");
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await page.waitForFunction(
            () =>
                document.activeElement?.getAttribute("aria-label") ===
                "Listening period (UTC)",
        );
        assert.equal(await page.evaluate(() => window.__lastNavigation), href);
        await trigger.focus();
        await trigger.press("Enter");
        await page.keyboard.press("Escape");
        await page.waitForFunction(
            () =>
                document.activeElement?.getAttribute("aria-label") ===
                "Listening period (UTC)",
        );
        await page.close();
    }
});

test("Escape closes navigation while its opening toggle still holds keyboard focus", async () => {
    const page = await pageFor("navigation", 320);
    await page.getByRole("button", { name: "Open navigation" }).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    assert.equal(
        await page
            .getByRole("button", { name: "Open navigation" })
            .getAttribute("aria-expanded"),
        "false",
    );
    assert.equal(
        await page.evaluate(() =>
            document.activeElement?.getAttribute("aria-label"),
        ),
        "Open navigation",
    );
    await page.close();
});

test("friend context, dated streaks and chart data are keyboard-readable", async () => {
    const page = await pageFor("context");
    await textVisible(page, "Friend’s listening");
    await textVisible(page, "Played on 17 Oct 2026");
    assert.equal(
        await page
            .getByRole("link", { name: "Back to your listening" })
            .getAttribute("href"),
        "/dashboard",
    );
    await page.goto(`${origin}/?fixture=chart`);
    await page.getByText("Loading chart…").waitFor({ state: "hidden" });
    await page.getByText("View listening data", { exact: true }).focus();
    await page.keyboard.press("Enter");
    await page
        .getByRole("columnheader", { name: "Previous period" })
        .waitFor({ state: "visible" });
    assert.match(
        await page.getByRole("table").innerText(),
        /2026-10-17\s+2m\s+3m/,
    );
    const violations = (
        await new AxeBuilder({ page }).include("main").analyze()
    ).violations;
    assert.deepEqual(
        violations.map((x) => ({
            id: x.id,
            impact: x.impact,
            nodes: x.nodes.map((node) => node.target),
        })),
        [],
    );
    await page.close();
});

test("warnings, inline errors and filled destructive buttons meet text contrast in both default themes", async () => {
    const page = await pageFor("errors");
    for (const theme of ["Light", "Dark"]) {
        await page.getByRole("button", { name: `${theme} theme` }).click();
        const violations = (
            await new AxeBuilder({ page })
                .include("main")
                .withRules(["color-contrast"])
                .analyze()
        ).violations;
        assert.deepEqual(
            violations.map((item) => ({
                id: item.id,
                nodes: item.nodes.map((node) => node.target),
            })),
            [],
            theme,
        );
    }
    await page.close();
});

test("feed selection applies explicitly and failed pagination retains plays until retry succeeds", async () => {
    const page = await pageFor("feed", 320);
    await textVisible(page, "Last 24 hours · From the people selected above.");
    await page.getByRole("button", { name: "Everyone", exact: true }).click();
    await page
        .getByRole("menuitemcheckbox", { name: "Friend", exact: true })
        .click();
    assert.equal(await page.evaluate(() => window.__lastNavigation), undefined);
    await page
        .getByRole("menuitem", { name: "Apply filter", exact: true })
        .click();
    assert.equal(
        await page.evaluate(() => window.__lastNavigation),
        "/feed?fixture=feed&filter=self",
    );
    await page.getByRole("button", { name: "Load more activity" }).click();
    await textVisible(
        page,
        "More activity couldn’t load. Your current plays are still here.",
    );
    assert.equal(await page.locator(".ss-listen-row").count(), 10);
    await page.evaluate(() => (window.__feedSuccess = true));
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page
        .getByText(
            "More activity couldn’t load. Your current plays are still here.",
            { exact: true },
        )
        .waitFor({ state: "hidden" });
    assert.equal(await page.locator(".ss-listen-row").count(), 10);
    await page.close();
});

test("durable import history distinguishes processing states, preserves date context and exposes retry failure", async () => {
    const page = await pageFor("history");
    for (const state of ["queued", "processing", "completed", "failed"])
        await textVisible(page, state);
    assert.equal(
        await page
            .getByRole("link", { name: "View imported listening" })
            .getAttribute("href"),
        "/dashboard?from=2024-01-01&to=2024-12-31",
    );
    await page
        .getByRole("button", { name: "Retry import failed.json" })
        .click();
    await textVisible(page, "This import couldn’t be queued. Try again.");
    assert.equal(
        await page
            .getByRole("button", { name: "Retry import failed.json" })
            .isEnabled(),
        true,
    );
    await page.close();
});

test("admin settings are named, scrollable by keyboard, and recover after rejected updates", async () => {
    const page = await pageFor("admin", 320);
    for (const name of [
        "Listening tracking for Listener",
        "Premium polling for Listener",
        "Admin access for Listener",
    ])
        await page.getByRole("switch", { name }).waitFor();
    await page.getByRole("region", { name: "Scrollable table" }).focus();
    await page.keyboard.press("ArrowRight");
    const control = page.getByRole("switch", {
        name: "Premium polling for Listener",
    });
    await control.click();
    await textVisible(page, "Failed to update user premium status");
    assert.equal(await control.getAttribute("aria-checked"), "false");
    assert.equal(
        await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
    );
    await page.close();
});

test("search errors and resolved action failures remain actionable and stale results are ignored", async () => {
    const page = await pageFor("search");
    const input = page.getByRole("textbox", {
        name: "Search people by name or email",
    });
    await input.fill("error");
    await textVisible(page, "People couldn’t be loaded. Please try again.");
    await input.fill("slow");
    await page.waitForTimeout(550);
    await input.fill("new");
    await textVisible(page, "new person");
    await page.getByRole("button", { name: "Add friend", exact: true }).click();
    await textVisible(page, "Could not send request");
    await textVisible(page, "new person");
    await page.waitForTimeout(800);
    assert.equal(
        await page.getByText("slow person", { exact: true }).count(),
        0,
    );
    await page.evaluate(() => (window.__sendSuccess = true));
    await page.getByRole("button", { name: "Add friend", exact: true }).click();
    await textVisible(page, "Request sent");
    await page.close();
});

test("limited invites cannot submit a blank count", async () => {
    const page = await pageFor("invite");
    await page.getByRole("checkbox", { name: "Unlimited uses" }).click();
    await page
        .getByRole("button", { name: "Create invite", exact: true })
        .click();
    assert.equal(await page.evaluate(() => window.__inviteCalls || 0), 0);
    await page.getByLabel("Maximum number of people").fill("3");
    await page
        .getByRole("button", { name: "Create invite", exact: true })
        .click();
    await textVisible(page, "Review fixture did not create an invite");
    assert.equal(await page.evaluate(() => window.__inviteCalls), 1);
    await page.close();
});

test("accept, decline, cancel and remove retain rows on failure; removal uses a cancel-focused dialog", async () => {
    const page = await pageFor("friends");
    const incoming = page.getByRole("region", { name: "Incoming request" });
    const outgoing = page.getByRole("region", { name: "Outgoing request" });
    for (const [region, name] of [
        [incoming, "Accept"],
        [incoming, "Decline"],
        [outgoing, "Cancel request"],
    ]) {
        await region.getByRole("button", { name, exact: true }).click();
        await page.getByText("Action failed", { exact: true }).last().waitFor();
        assert.equal(
            await region
                .getByRole("heading", { name: "Friend", exact: true })
                .count(),
            1,
        );
    }
    const remove = page.getByRole("button", { name: "Remove", exact: true });
    await remove.click();
    await page.waitForFunction(
        () => document.activeElement?.textContent === "Cancel",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
        () => document.activeElement?.textContent === "Remove",
    );
    await remove.click();
    await page
        .getByRole("button", { name: "Remove friend", exact: true })
        .click();
    await page.getByRole("alertdialog", { name: "Remove Friend?" }).waitFor();
    assert.equal(
        await page
            .getByRole("region", {
                name: "Accepted friend",
                includeHidden: true,
            })
            .getByRole("heading", {
                name: "Friend",
                exact: true,
                includeHidden: true,
            })
            .count(),
        1,
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.evaluate(() => (window.__socialReject = true));
    await incoming.getByRole("button", { name: "Accept", exact: true }).click();
    await textVisible(page, "Action rejected");
    await page.evaluate(() => {
        window.__socialReject = false;
        window.__socialSuccess = true;
    });
    await incoming.getByRole("button", { name: "Accept", exact: true }).click();
    await incoming
        .getByRole("heading", { name: "Friend", exact: true })
        .waitFor({ state: "hidden" });
    await outgoing
        .getByRole("button", { name: "Cancel request", exact: true })
        .click();
    await outgoing
        .getByRole("heading", { name: "Friend", exact: true })
        .waitFor({ state: "hidden" });
    await remove.click();
    await page
        .getByRole("button", { name: "Remove friend", exact: true })
        .click();
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    await page.close();
});

test("clipboard denial shows recovery and can be retried successfully", async () => {
    const page = await pageFor("invite-list");
    await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                writeText: async () => {
                    throw new Error("Denied");
                },
            },
        }),
    );
    await page
        .getByRole("button", { name: "Copy invite link TEST1234" })
        .click();
    await textVisible(
        page,
        "The link couldn’t be copied. Open the invite link below and copy its address.",
    );
    await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: async () => {} },
        }),
    );
    await page
        .getByRole("button", { name: "Copy invite link TEST1234" })
        .click();
    await textVisible(page, "Invite link copied to clipboard!");
    await page.close();
});

test("imports review filenames before upload, retain failed selections, and announce the queue separately", async () => {
    const page = await pageFor("import");
    const input = page.getByLabel("Choose Spotify audio history JSON files");
    const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByRole("button", { name: "Choose JSON files" }).press("Enter"),
    ]);
    await chooser.setFiles({
        name: "wrong.json",
        mimeType: "application/json",
        buffer: Buffer.from("[]"),
    });
    assert.equal(
        await page
            .getByRole("button", { name: "Upload 1 file", exact: true })
            .isDisabled(),
        true,
    );
    await page.getByRole("button", { name: "Remove wrong.json" }).click();
    await input.setInputFiles({
        name: "Streaming_History_Audio_test.json",
        mimeType: "application/json",
        buffer: Buffer.from("[]"),
    });
    await textVisible(page, "Streaming_History_Audio_test.json");
    await page.evaluate(() => (window.__uploadFail = true));
    await page
        .getByRole("button", { name: "Upload 1 file", exact: true })
        .click();
    await page
        .getByRole("heading", { name: "Upload needs attention" })
        .waitFor();
    await textVisible(page, "Streaming_History_Audio_test.json");
    await page.evaluate(() => (window.__uploadFail = false));
    await page
        .getByRole("button", { name: "Upload 1 file", exact: true })
        .click();
    await page.getByText(/1 file uploaded — waiting for processing/).waitFor();
    assert.equal(
        await page
            .getByRole("button", {
                name: "Remove Streaming_History_Audio_test.json",
            })
            .count(),
        0,
    );
    await input.setInputFiles(
        ["first", "second"].map((name) => ({
            name: `Streaming_History_Audio_${name}.json`,
            mimeType: "application/json",
            buffer: Buffer.from("[]"),
        })),
    );
    await page.evaluate(() => {
        window.__uploadCalls = 0;
        window.__uploadFailAt = 2;
    });
    await page
        .getByRole("button", { name: "Upload 2 files", exact: true })
        .click();
    await textVisible(page, "1 file was uploaded and queued.");
    assert.equal(
        await page
            .getByRole("button", {
                name: "Remove Streaming_History_Audio_first.json",
            })
            .count(),
        0,
    );
    await page
        .getByRole("button", {
            name: "Remove Streaming_History_Audio_second.json",
        })
        .waitFor();
    await page
        .getByRole("button", { name: "Upload 1 file", exact: true })
        .click();
    await page.getByText(/1 file uploaded — waiting for processing/).waitFor();
    assert.equal(
        await page
            .getByRole("button", {
                name: "Remove Streaming_History_Audio_second.json",
            })
            .count(),
        0,
    );
    await page.close();
});
