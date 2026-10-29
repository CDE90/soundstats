import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PgDialect } from "drizzle-orm/pg-core";
import ts from "typescript";

const state = {
    failed: new Set(),
    paused: new Set(),
    calls: [],
    databaseFails: false,
    ids: [],
};
const dialect = new PgDialect();
const query = {
    from: () => query,
    where: (condition) => {
        state.ids = dialect
            .sqlToQuery(condition)
            .params.filter((value) => typeof value === "string");
        return query;
    },
    groupBy: () => query,
    limit: async () => {
        if (state.databaseFails) throw new Error("Unavailable");
        return state.ids
            .filter((id) => ["self", "friend"].includes(id))
            .map((userId) => ({ userId }));
    },
};
globalThis.__liveFeedReview = { state, db: { select: () => query } };
const mocks = {
    "@/server/db": "export const db=globalThis.__liveFeedReview.db;",
    "@/server/lib": "export const getUserFriends=async()=>['friend'];",
    "@/server/music-detail-queries":
        "export const getCataloguedTrackIds=async(db,ids)=>new Set(ids);",
    "@/server/spotify/spotify": `export const getUserPlaying=async(id)=>{const state=globalThis.__liveFeedReview.state;state.calls.push(id);if(state.failed.has(id))throw new Error('Unavailable');return {is_playing:!state.paused.has(id),item:{type:'track',id:'track',name:id+' song',artists:[{name:'Artist'}],album:{images:[]}}};};`,
    "@clerk/nextjs/server":
        "export const auth=async()=>({userId:'self'});export const clerkClient=async()=>({users:{getUserList:async({userId})=>({data:userId.map(id=>({id,username:id}))})}});",
    "./refresh-feed-button": `import {createElement} from ${JSON.stringify(import.meta.resolve("react"))};export const RefreshFeedButton=()=>createElement('button',null,'Try again');`,
};
const hooks = registerHooks({
    resolve(specifier, context, next) {
        if (mocks[specifier])
            return {
                url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
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
        if (
            specifier.startsWith("./") &&
            context.parentURL?.startsWith("file:")
        ) {
            const base = new URL(specifier, context.parentURL).href;
            specifier =
                [".ts", ".tsx"]
                    .map((ext) => base + ext)
                    .find((file) => existsSync(new URL(file))) ?? specifier;
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
const { CurrentListeners } =
    await import("../src/app/feed/current-listening.tsx");
hooks.deregister();
const render = async (selectedUserIds) =>
    renderToStaticMarkup(await CurrentListeners({ selectedUserIds }));

test("live selection uses the same allow-list and empty selection makes no Spotify calls", async () => {
    state.calls = [];
    assert.match(await render([]), /No people selected/);
    assert.deepEqual(state.calls, []);
    const html = await render(["friend", "stranger"]);
    assert.deepEqual(state.calls, ["friend"]);
    assert.match(html, /friend song/);
    assert.doesNotMatch(html, /self song|stranger/);
});
test("partial failures retain available people and never claim a quiet moment", async () => {
    state.failed.add("friend");
    const html = await render(["self", "friend"]);
    assert.match(html, /self song/);
    assert.match(html, /Some live activity couldn’t load/);
    assert.match(html, /Try again/);
    assert.doesNotMatch(html, /A quiet moment/);
    state.failed.clear();
});
test("complete live failures offer recovery without claiming nobody is playing", async () => {
    state.databaseFails = true;
    const html = await render(["self"]);
    assert.match(html, /Live activity couldn’t load/);
    assert.match(html, /doesn’t mean nobody/);
    assert.match(html, /Try again/);
    assert.doesNotMatch(html, /A quiet moment/);
    state.databaseFails = false;
});
test("paused playback is a quiet state and is never presented as currently playing", async () => {
    state.paused.add("self");
    const html = await render(["self"]);
    assert.match(html, /A quiet moment/);
    assert.doesNotMatch(html, /self song/);
    state.paused.clear();
});
