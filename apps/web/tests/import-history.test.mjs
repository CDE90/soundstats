import assert from "node:assert/strict";
import { test } from "node:test";
import {
    importFileError,
    importSelectionError,
    importJobSummary,
    MAX_IMPORT_FILE_BYTES,
} from "../src/lib/import-history.ts";

const file = { name: "Streaming_History_Audio_2024_1.json", size: 1024 };
const now = new Date("2026-10-29T12:00:00Z");
const record = {
    id: 1n,
    fileName: file.name,
    processed: false,
    invalidFile: false,
    failedAt: null,
    processedAt: null,
    processingStartedAt: null,
    nextRetryAt: null,
    importedFrom: null,
    importedTo: null,
    createdAt: new Date("2026-10-28T12:00:00Z"),
    updatedAt: null,
    storageDeletedAt: null,
};

test("selection validates real upload boundaries and tells users what to correct", () => {
    assert.equal(importSelectionError([file]), null);
    assert.equal(
        importSelectionError(Array.from({ length: 20 }, () => file)),
        null,
    );
    assert.match(
        importSelectionError(Array.from({ length: 21 }, () => file)),
        /20 files/,
    );
    assert.match(importSelectionError([]), /at least one/);
    assert.equal(
        importFileError({ ...file, size: MAX_IMPORT_FILE_BYTES }),
        null,
    );
    assert.match(
        importFileError({ ...file, size: MAX_IMPORT_FILE_BYTES + 1 }),
        /64 MB/,
    );
    assert.match(importFileError({ ...file, size: 0 }), /empty/);
    for (const name of [
        "history.json",
        "Streaming_History_Video_1.json",
        "Streaming_History_Audio_1.zip",
    ])
        assert.match(
            importFileError({ ...file, name }),
            /Spotify extended audio/,
        );
    assert.equal(
        importFileError({ ...file, name: "streaming_history_audio_1.JSON" }),
        null,
    );
});

test("durable job states distinguish queue, active processing, retry, invalidity and completion", () => {
    assert.equal(importJobSummary(record, now).state, "queued");
    assert.equal(
        importJobSummary(
            {
                ...record,
                processingStartedAt: new Date("2026-10-29T11:50:00Z"),
            },
            now,
        ).state,
        "processing",
    );
    assert.equal(
        importJobSummary(
            {
                ...record,
                processingStartedAt: new Date("2026-10-29T10:00:00Z"),
            },
            now,
        ).state,
        "queued",
    );
    const scheduled = importJobSummary(
        { ...record, nextRetryAt: new Date("2026-10-29T13:00:00Z") },
        now,
    );
    assert.equal(scheduled.state, "queued");
    assert.equal(scheduled.nextRetryAt, "2026-10-29T13:00:00.000Z");
    assert.equal(scheduled.canRetry, false);
    assert.equal(
        importJobSummary({ ...record, failedAt: now }, now).canRetry,
        true,
    );
    assert.equal(
        importJobSummary(
            { ...record, failedAt: now, processingStartedAt: now },
            now,
        ).canRetry,
        false,
    );
    assert.equal(
        importJobSummary({ ...record, invalidFile: true, failedAt: now }, now)
            .canRetry,
        false,
    );
    assert.equal(
        importJobSummary(
            { ...record, failedAt: now, storageDeletedAt: now },
            now,
        ).canRetry,
        false,
    );
    const complete = importJobSummary(
        {
            ...record,
            processed: true,
            processedAt: now,
            importedFrom: new Date("2024-01-01T23:59:00Z"),
            importedTo: new Date("2024-12-31T12:00:00Z"),
        },
        now,
    );
    assert.equal(complete.state, "completed");
    assert.equal(complete.canRetry, false);
    assert.equal(
        complete.dashboardHref,
        "/dashboard?from=2024-01-01&to=2024-12-31",
    );
    assert.equal(complete.createdAt, "2026-10-28T12:00:00.000Z");
    assert.equal(complete.id, "1");
});
