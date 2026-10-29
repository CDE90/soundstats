import assert from "node:assert/strict";
import { test } from "node:test";
import {
    createFeedPageState,
    feedPageReducer,
    getFeedEmptyState,
    getFeedScope,
} from "../src/app/feed/feed-state.ts";

const people = ["viewer", "friend-a", "friend-b"];
const play = (id) => ({ id, song: `Track ${id}` });

test("one allow-listed scope covers everyone, none, and partial selections", () => {
    assert.deepEqual(getFeedScope(undefined, people).userIds, people);
    assert.deepEqual(getFeedScope("__none__", people).userIds, []);
    assert.deepEqual(
        getFeedScope("friend-b,stranger,friend-b", people).userIds,
        ["friend-b"],
    );
    // Invalid/stale IDs must not unexpectedly show everybody's activity.
    assert.deepEqual(getFeedScope("stranger", people).userIds, []);
    assert.equal(getFeedScope("stranger", people).isFiltered, true);
    assert.equal(
        getFeedScope("friend-a,friend-b", people).key,
        getFeedScope("friend-b,friend-a", people).key,
    );
});

test("empty states explain selection, new circles, and the actual 24-hour window", () => {
    assert.equal(getFeedEmptyState(0, 2).action, "Show everyone");
    assert.equal(getFeedEmptyState(0, 2).href, "/feed");
    assert.equal(getFeedEmptyState(1, 0).action, "Find friends");
    assert.match(getFeedEmptyState(1, 0).title, /24 hours/);
    assert.match(getFeedEmptyState(3, 2).description, /earlier history/);
    assert.doesNotMatch(getFeedEmptyState(3, 2).title, /first track/);
});

test("a failed next page preserves existing plays and retries the same offset", () => {
    const items = Array.from({ length: 10 }, (_, index) => play(String(index)));
    let state = createFeedPageState(items);
    state = feedPageReducer(state, { type: "start", requestId: 1 });
    state = feedPageReducer(state, {
        type: "error",
        requestId: 1,
        message: "Could not load more",
    });
    assert.deepEqual(state.items, items);
    assert.equal(state.offset, 10);
    assert.equal(state.hasMore, true);
    assert.equal(state.requestId, null);
    assert.equal(state.error, "Could not load more");

    state = feedPageReducer(state, { type: "start", requestId: 2 });
    state = feedPageReducer(state, {
        type: "success",
        requestId: 2,
        items: [play("10")],
    });
    assert.equal(state.items.length, 11);
    assert.equal(state.offset, 11);
    assert.equal(state.hasMore, false);
    assert.equal(state.error, null);
});

test("duplicate starts and outdated responses cannot corrupt the active page", () => {
    let state = createFeedPageState([], "Initial fetch failed");
    assert.equal(state.hasMore, true);
    state = feedPageReducer(state, { type: "start", requestId: 2 });
    assert.equal(
        feedPageReducer(state, { type: "start", requestId: 3 }),
        state,
    );
    assert.equal(
        feedPageReducer(state, {
            type: "success",
            requestId: 1,
            items: [play("outdated")],
        }),
        state,
    );
    assert.equal(
        feedPageReducer(state, {
            type: "error",
            requestId: 1,
            message: "Outdated failure",
        }),
        state,
    );
    state = feedPageReducer(state, {
        type: "success",
        requestId: 2,
        items: [play("current"), play("current")],
    });
    assert.deepEqual(
        state.items.map((item) => item.id),
        ["current"],
    );
    assert.equal(state.hasMore, false);
});
