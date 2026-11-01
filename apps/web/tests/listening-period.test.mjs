import assert from "node:assert/strict";
import { test } from "node:test";
import {
    calendarListeningRange,
    activeStreakStart,
    listeningDatePresets,
    streakDayLabel,
    formatAverageListen,
} from "../src/lib/listening-period.ts";
import { getPublicUserDisplayName } from "../src/lib/user-display.ts";
import { musicDetailParams } from "../src/lib/music-details.ts";

test("active entity streak windows cover the full overall run, including yesterday and long runs", () => {
    const end = new Date("2026-03-04T23:59:59.999Z");
    assert.equal(
        activeStreakStart({ streakLength: 0, isExtendedToday: false }, end),
        null,
    );
    assert.equal(
        activeStreakStart(
            { streakLength: 3, isExtendedToday: true },
            end,
        ).toISOString(),
        "2026-03-02T00:00:00.000Z",
    );
    assert.equal(
        activeStreakStart(
            { streakLength: 3, isExtendedToday: false },
            end,
        ).toISOString(),
        "2026-03-01T00:00:00.000Z",
    );
    assert.equal(
        end -
            activeStreakStart(
                { streakLength: 1100, isExtendedToday: true },
                end,
            ) +
            1,
        1100 * 86_400_000,
    );
});

test("public listener identities are stable without exposing private fallback fields", () => {
    for (const [user, expected] of [
        [
            { firstName: " Ethan ", lastName: " Coward ", username: "ec" },
            "Ethan Coward",
        ],
        [{ firstName: "", lastName: "", username: " username " }, "username"],
        [
            { emailAddress: "private@example.com", spotifyId: "internal-id" },
            "Listener",
        ],
        [null, "Listener"],
    ])
        assert.equal(getPublicUserDisplayName(user), expected);
});

test("calendar periods include exactly their labelled count, including UTC midnight and leap days", () => {
    for (const now of [
        "2026-10-29T23:59:59-07:00",
        "2024-03-01T00:01:00Z",
        "2026-01-01T00:01:00+14:00",
    ]) {
        for (const days of [1, 7, 30]) {
            const range = calendarListeningRange(days, new Date(now));
            assert.equal(range.to - range.from + 1, days * 86_400_000);
            assert.equal(
                range.to.toISOString().slice(0, 10),
                new Date(now).toISOString().slice(0, 10),
            );
            assert.equal(range.from.getUTCHours(), 0);
            assert.equal(range.to.getUTCHours(), 23);
            const link = new URL(
                `/dashboard?${musicDetailParams({ userId: "friend", dateRange: range })}`,
                "https://example.com",
            );
            assert.equal(
                link.searchParams.get("from"),
                range.from.toISOString().slice(0, 10),
            );
            assert.equal(
                link.searchParams.get("to"),
                range.to.toISOString().slice(0, 10),
            );
        }
    }
    assert.equal(
        calendarListeningRange(7, new Date("2026-10-29T12:00:00Z"))
            .from.toISOString()
            .slice(0, 10),
        "2026-10-23",
    );
});

test("calendar presets clamp month ends rather than overflowing into the next month", () => {
    const presets = listeningDatePresets(
        new Date("2020-01-01Z"),
        new Date("2026-05-31T12:00:00Z"),
    );
    assert.equal(
        presets
            .find((x) => x.label === "Last 3 months")
            .dateRange.from.toISOString()
            .slice(0, 10),
        "2026-02-28",
    );
    assert.equal(
        presets
            .find((x) => x.label === "Last 30 days")
            .dateRange.from.toISOString()
            .slice(0, 10),
        "2026-05-02",
    );
});

test("historical streak labels name the reporting date and average listens are unambiguous", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    assert.equal(
        streakDayLabel(true, new Date("2026-10-17Z"), now),
        "Played on 17 Oct 2026",
    );
    assert.equal(streakDayLabel(false, now, now), "Not played today");
    assert.equal(formatAverageListen(233), "3m 53s");
    assert.equal(formatAverageListen(59.8), "1m 0s");
});
