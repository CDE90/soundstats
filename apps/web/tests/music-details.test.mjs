import assert from "node:assert/strict";
import { test } from "node:test";
import {
    canViewMusicDetails,
    musicDetailHref,
    readMusicDetailRange,
} from "../src/lib/music-details.ts";

test("detail links retain the user and calendar range and encode entity IDs", () => {
    const dateRange = readMusicDetailRange("2026-03-01", "2026-03-03");
    const href = musicDetailHref("track", "track/with spaces", {
        userId: "friend&1",
        dateRange,
    });
    const url = new URL(href, "http://localhost");
    assert.equal(url.pathname, "/tracks/track%2Fwith%20spaces");
    assert.equal(url.searchParams.get("user"), "friend&1");
    assert.equal(url.searchParams.get("from"), "2026-03-01");
    assert.equal(url.searchParams.get("to"), "2026-03-03");
    const albumUrl = new URL(
        musicDetailHref("album", "album-id", { userId: "friend&1", dateRange }),
        "http://localhost",
    );
    assert.equal(albumUrl.pathname, "/albums/album-id");
    assert.equal(albumUrl.search, url.search);
});

test("ranges cover whole UTC days and safely handle invalid or reversed input", () => {
    const now = new Date("2026-03-31T10:00:00Z");
    const valid = readMusicDetailRange("2026-03-01", "2026-03-03", now);
    assert.equal(valid.from.toISOString(), "2026-03-01T00:00:00.000Z");
    assert.equal(valid.to.toISOString(), "2026-03-03T23:59:59.999Z");
    for (const [from, to] of [
        [undefined, undefined],
        ["bad", "bad"],
        ["2026-02-30", "2026-02-30"],
        ["2027-01-01", "2026-03-01"],
        ["0001-01-01", "bad"],
    ]) {
        const range = readMusicDetailRange(from, to, now);
        assert.equal(range.from.toISOString(), "2026-03-01T00:00:00.000Z");
        assert.equal(range.to.toISOString(), "2026-03-31T23:59:59.999Z");
    }
});

test("own history skips friend lookup; other users require an accepted friendship", async () => {
    const calls = [];
    const areFriends = async (viewer, target) => {
        calls.push([viewer, target]);
        return target === "friend";
    };
    assert.equal(await canViewMusicDetails("self", "self", areFriends), true);
    assert.equal(calls.length, 0);
    assert.equal(await canViewMusicDetails("self", "friend", areFriends), true);
    assert.equal(
        await canViewMusicDetails("self", "stranger", areFriends),
        false,
    );
    assert.deepEqual(calls, [
        ["self", "friend"],
        ["self", "stranger"],
    ]);
});
