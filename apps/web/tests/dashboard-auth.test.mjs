import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

const state = {
    userId: "self",
    calls: 0,
    lookup: { provider: "oauth_spotify" },
};
globalThis.__dashboardAuth = state;
const boundaries = {
    "@clerk/nextjs/server":
        "export const auth=async()=>({userId:globalThis.__dashboardAuth.userId});export const clerkClient=async()=>({});",
    "@/server/lib":
        "export const getSpotifyAccount=async()=>{globalThis.__dashboardAuth.calls++;return globalThis.__dashboardAuth.lookup;};",
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
                    .map((ext) => base + ext)
                    .find((path) => existsSync(new URL(path))) ?? base;
        }
        return next(specifier, context);
    },
});
const { checkAuth } = await import("../src/app/dashboard/check-auth.ts");
hooks.deregister();

test("reuse a verified viewer profile without another lookup and still require Spotify", async () => {
    assert.equal(
        await checkAuth({
            id: "self",
            externalAccounts: [{ provider: "oauth_spotify" }],
        }),
        true,
    );
    assert.equal(
        await checkAuth({
            id: "self",
            externalAccounts: [{ provider: "oauth_google" }],
        }),
        false,
    );
    assert.equal(state.calls, 0);
});

test("a missing or mismatched profile uses the authenticated viewer lookup", async () => {
    state.lookup = null;
    assert.equal(
        await checkAuth({
            id: "friend",
            externalAccounts: [{ provider: "oauth_spotify" }],
        }),
        false,
    );
    assert.equal(state.calls, 1);
    state.lookup = { provider: "oauth_spotify" };
    assert.equal(await checkAuth(), true);
    assert.equal(state.calls, 2);
    state.userId = null;
    assert.equal(
        await checkAuth({
            id: "self",
            externalAccounts: [{ provider: "oauth_spotify" }],
        }),
        false,
    );
    assert.equal(state.calls, 2);
});
