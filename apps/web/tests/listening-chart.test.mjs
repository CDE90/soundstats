import assert from "node:assert/strict";
import { test } from "node:test";
import {
    listeningGranularity,
    previousListeningRange,
    formatListeningDuration,
    listeningTimeTicks,
    listeningDateLabel,
    listeningTickDates,
} from "../src/lib/listening-chart.ts";

const from = new Date("2026-01-01T00:00:00Z");
function endOfDay(days) {
    return new Date(from.getTime() + days * 86_400_000 - 1);
}

test("aggregation stays detailed for short ranges and bounded for long histories", () => {
    for (const [days, expected] of [
        [1, "hour"],
        [2, "day"],
        [60, "day"],
        [61, "week"],
        [366, "week"],
        [367, "month"],
        [2928, "month"],
        [2929, "year"],
    ]) {
        assert.equal(listeningGranularity(from, endOfDay(days)), expected);
    }
});

test("comparison periods have identical duration, no shared boundary and no missing millisecond", () => {
    for (const days of [1, 7, 31, 366, 1200]) {
        const to = endOfDay(days);
        const previous = previousListeningRange(from, to);
        assert.equal(previous.to.getTime() + 1, from.getTime());
        assert.equal(previous.to - previous.from, to - from);
        assert.equal(
            previous.from.getTime() + days * 86_400_000,
            from.getTime(),
        );
    }
});

test("duration labels use hours and minutes, without seconds or rounding up", () => {
    for (const [value, expected] of [
        [0, "0m"],
        [34, "<1m"],
        [60, "1m"],
        [365 * 60 + 59, "6h 5m"],
        [7200, "2h"],
        [-5, "0m"],
    ]) {
        assert.equal(formatListeningDuration(value), expected);
    }
});

test("ticks are evenly spaced whole minutes, cover the data, and have useful density", () => {
    for (const maximum of [0, 29, 60, 900, 5100, 50_000, 500_000, 20_000_000]) {
        const ticks = listeningTimeTicks(maximum);
        assert.equal(ticks[0], 0);
        assert.ok(ticks.at(-1) >= maximum);
        assert.ok(ticks.length >= 2 && ticks.length <= 5);
        const step = ticks[1];
        assert.equal(step % 60, 0);
        ticks.forEach((tick, index) => assert.equal(tick, index * step));
    }
    assert.deepEqual(listeningTimeTicks(50_000), [0, 21600, 43200, 64800]);
});

test("date labels identify hours, months, years and cross-year daily ranges in UTC", () => {
    assert.equal(listeningDateLabel("2026-01-01T08:00:00Z", "hour"), "08:00");
    assert.equal(listeningDateLabel("2026-01-01", "month"), "Jan 2026");
    assert.equal(listeningDateLabel("2026-01-01", "year"), "2026");
    assert.match(listeningDateLabel("2026-01-01", "week", true), /1 Jan 26/);
});

test("date ticks use six-hour, weekly and calendar quarter/half-year boundaries", () => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
        date: `2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`,
        playtime: 0,
    }));
    assert.deepEqual(listeningTickDates(hours, "hour"), [
        hours[0].date,
        hours[6].date,
        hours[12].date,
        hours[18].date,
    ]);
    const days = Array.from({ length: 31 }, (_, day) => ({
        date: `2026-01-${String(day + 1).padStart(2, "0")}`,
        playtime: 0,
    }));
    assert.deepEqual(listeningTickDates(days, "day"), [
        days[0].date,
        days[7].date,
        days[14].date,
        days[21].date,
        days[28].date,
    ]);
    const months = Array.from({ length: 36 }, (_, month) => ({
        date: new Date(Date.UTC(2024, month, 1)).toISOString().slice(0, 10),
        playtime: 0,
    }));
    assert.deepEqual(listeningTickDates(months, "month"), [
        "2024-01-01",
        "2024-07-01",
        "2025-01-01",
        "2025-07-01",
        "2026-01-01",
        "2026-07-01",
    ]);
    assert.deepEqual(listeningTickDates(months.slice(0, 12), "month"), [
        "2024-01-01",
        "2024-04-01",
        "2024-07-01",
        "2024-10-01",
    ]);
});
