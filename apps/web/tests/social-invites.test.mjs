import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import { requireActionSuccess } from "../src/app/friends/action-result.ts";
import {
    validateInviteLimit,
    inviteRelationship,
} from "../src/app/invite/invite-validation.ts";

test("resolved social failures never reach the successful action path", async () => {
    for (const result of [
        { error: "Not authenticated" },
        { error: "Request already exists" },
        {},
        { success: false },
    ]) {
        let updated = false;
        await assert.rejects(async () => {
            requireActionSuccess(await Promise.resolve(result));
            updated = true;
        });
        assert.equal(updated, false);
    }
    assert.doesNotThrow(() => requireActionSuccess({ success: true }));
});

test("limited invites reject blank, fractional and out-of-range limits", () => {
    for (const value of [undefined, null, 0, -1, 1.5, NaN, Infinity, 1001]) {
        assert.equal(
            validateInviteLimit(value, false),
            "Enter a whole number from 1 to 1,000.",
        );
    }
    for (const value of [1, 10, 1000])
        assert.equal(validateInviteLimit(value, false), undefined);
    assert.equal(validateInviteLimit(undefined, true), undefined);
});

test("invite relationship states distinguish anonymous, owner, existing and pending friends", () => {
    assert.equal(inviteRelationship(null, "owner", []), "anonymous");
    assert.equal(inviteRelationship("owner", "owner", []), "owner");
    assert.equal(
        inviteRelationship("viewer", "owner", ["accepted", "pending"]),
        "friends",
    );
    assert.equal(inviteRelationship("viewer", "owner", ["pending"]), "pending");
    assert.equal(inviteRelationship("viewer", "owner", ["rejected"]), "new");
    assert.equal(inviteRelationship("viewer", "owner", []), "new");
});

// Exercise real server validation with in-memory auth/DB adapters. No environment,
// network, real user, or database is involved in these action-contract checks.
let reads = 0;
let inserted;
let rows = [];
let queuedRows;
let updates = 0;
globalThis.__socialReviewDb = {
    select() {
        reads++;
        const selectedRows = queuedRows?.shift() ?? rows;
        const query = {
            from() {
                return query;
            },
            where() {
                return query;
            },
            limit() {
                return Promise.resolve(selectedRows);
            },
            then(resolve, reject) {
                return Promise.resolve(selectedRows).then(resolve, reject);
            },
        };
        return query;
    },
    update() {
        updates++;
        return {
            set() {
                return { where: async () => {} };
            },
        };
    },
    insert() {
        return {
            values(value) {
                inserted = value;
                return { returning: async () => [{ ...value, id: 1n }] };
            },
        };
    },
};
const virtual = (source) => ({
    url: `data:text/javascript,${encodeURIComponent(source)}`,
    shortCircuit: true,
});
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.endsWith("/invite/actions.ts")) {
            if (specifier === "@/server/db")
                return virtual("export const db = globalThis.__socialReviewDb");
            if (specifier === "@/server/db/schema")
                return virtual(
                    "export const friends = {}; export const invites = {};",
                );
            if (specifier === "@clerk/nextjs/server")
                return virtual(
                    "export async function auth(){return {userId:'viewer'}}; export const clerkClient = () => ({users:{async getUser(){return {firstName:'Sam',imageUrl:''}}}});",
                );
            if (specifier === "@/lib/posthog")
                return virtual(
                    "export async function captureAuthenticatedEvent(){}",
                );
            if (specifier === "@/lib/user-display")
                return virtual(
                    "export const getPublicUserDisplayName = () => 'Listener';",
                );
            if (specifier === "next/cache")
                return virtual("export function revalidatePath(){}");
            if (specifier === "drizzle-orm")
                return virtual(
                    "export const and = (...v) => v; export const or = and; export const eq = and;",
                );
            if (specifier === "./invite-validation")
                return nextResolve("./invite-validation.ts", context);
        }
        return nextResolve(specifier, context);
    },
});
const { createInvite, getInviteViewerState, acceptInvite } =
    await import("../src/app/invite/actions.ts");
hooks.deregister();

test("server rejects an omitted limited count before any DB read or write", async () => {
    reads = 0;
    inserted = undefined;
    const result = await createInvite("Friends", undefined, undefined, false);
    assert.equal(result.error, "Enter a whole number from 1 to 1,000.");
    assert.equal(reads, 0);
    assert.equal(inserted, undefined);
    for (const value of [0, 2.5, 1001, NaN]) {
        assert.ok(
            (await createInvite("Friends", undefined, value, false)).error,
        );
    }
    assert.equal(reads, 0);
});

test("valid finite and explicit unlimited invite limits stay distinct on persistence", async () => {
    rows = [];
    assert.equal((await createInvite(" Friends ", 7, 3, false)).success, true);
    assert.equal(inserted.name, "Friends");
    assert.equal(inserted.maxUses, 3);
    assert.ok(inserted.expiresAt instanceof Date);
    assert.equal(
        (await createInvite(undefined, undefined, undefined, true)).success,
        true,
    );
    assert.equal(inserted.maxUses, null);
    assert.equal(inserted.expiresAt, null);
});

test("server validates invite name and expiry before persistence", async () => {
    reads = 0;
    assert.ok((await createInvite("x".repeat(101))).error);
    assert.ok((await createInvite(undefined, 2)).error);
    assert.equal(reads, 0);
});

test("landing relationship lookup prioritizes accepted relationships and skips owner reads", async () => {
    reads = 0;
    assert.equal(await getInviteViewerState("viewer"), "owner");
    assert.equal(reads, 0);
    rows = [{ status: "pending" }];
    assert.equal(await getInviteViewerState("owner"), "pending");
    rows = [{ status: "accepted" }, { status: "pending" }];
    assert.equal(await getInviteViewerState("owner"), "friends");
});

test("accepting an existing friendship is idempotent and pending requests do not consume invites", async () => {
    const invite = {
        id: 1n,
        code: "HELLO123",
        createdBy: "owner",
        status: "active",
        maxUses: 2,
        currentUses: 1,
        expiresAt: null,
    };
    updates = 0;
    inserted = undefined;
    queuedRows = [[invite], [{ status: "accepted" }]];
    assert.equal((await acceptInvite("HELLO123")).success, true);
    assert.equal(updates, 0);
    assert.equal(inserted, undefined);
    queuedRows = [[invite], [{ status: "pending" }]];
    assert.match((await acceptInvite("HELLO123")).error, /already pending/);
    assert.equal(updates, 0);
    assert.equal(inserted, undefined);
    queuedRows = [[{ ...invite, createdBy: "viewer" }]];
    assert.match((await acceptInvite("HELLO123")).error, /own invite/);
    assert.equal(updates, 0);
    queuedRows = undefined;
});

const { existsSync, readFileSync } = await import("node:fs");
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { default: ts } = await import("typescript");
const renderingHooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === "next/navigation")
            return virtual("export const useRouter = () => ({push(){}});");
        if (specifier === "@clerk/nextjs")
            return virtual(
                "export const SignInButton = ({children}) => children;",
            );
        if (specifier.startsWith("@/")) {
            const base = new URL(
                `../src/${specifier.slice(2)}`,
                import.meta.url,
            );
            specifier =
                [".ts", ".tsx"]
                    .map((extension) => base.href + extension)
                    .find((url) => existsSync(new URL(url))) ?? base.href;
        }
        if (
            specifier.startsWith(".") &&
            context.parentURL?.startsWith("file:")
        ) {
            const base = new URL(specifier, context.parentURL);
            specifier =
                [".ts", ".tsx"]
                    .map((extension) => base.href + extension)
                    .find((url) => existsSync(new URL(url))) ?? specifier;
        }
        if (specifier === "next/link") {
            const resolved = nextResolve(`${specifier}.js`, context);
            return virtual(
                `import value from ${JSON.stringify(resolved.url)}; export default value.default ?? value;`,
            );
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.startsWith("file:") && url.endsWith(".tsx")) {
            const { outputText } = ts.transpileModule(
                readFileSync(new URL(url), "utf8"),
                {
                    compilerOptions: {
                        jsx: ts.JsxEmit.ReactJSX,
                        module: ts.ModuleKind.ESNext,
                    },
                },
            );
            return { format: "module", source: outputText, shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});
const { AcceptInviteButton } =
    await import("../src/app/invite/[code]/_components/accept-invite-button.tsx");
renderingHooks.deregister();

test("real invite controls render the correct next step for every relationship", () => {
    const render = (relationship) =>
        renderToStaticMarkup(
            createElement(AcceptInviteButton, {
                inviteCode: "HELLO123",
                inviterName: "Sam",
                inviterId: "friend&1",
                relationship,
                isAuthenticated: relationship !== "anonymous",
            }),
        );
    assert.match(render("owner"), /Manage your invites/);
    assert.doesNotMatch(render("owner"), /Accept invite and become friends/);
    assert.match(render("friends"), /View their listening/);
    assert.match(render("friends"), /user=friend%261/);
    assert.match(render("pending"), /Review friend requests/);
    assert.doesNotMatch(render("pending"), /Accept invite and become friends/);
    assert.match(render("anonymous"), /Sign in to accept invite/);
    assert.match(render("new"), /Accept invite and become friends/);
});
