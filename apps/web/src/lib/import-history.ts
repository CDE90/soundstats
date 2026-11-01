import { IMPORT_PROCESSING_LEASE_MS } from "@soundstats/database";

export const MAX_IMPORT_FILES = 20;
export const MAX_IMPORT_FILE_BYTES = 64 * 1024 * 1024;
export const IMPORT_FILE_PATTERN = /^Streaming_History_Audio_.+\.json$/i;

export function importFileError(file: { name: string; size: number }) {
    if (!IMPORT_FILE_PATTERN.test(file.name))
        return "Choose a Spotify extended audio history file named Streaming_History_Audio_….json.";
    if (file.name.length > 256)
        return "The filename is too long. Shorten it to 256 characters or fewer.";
    if (file.size === 0)
        return "This file is empty. Choose a JSON file from your Spotify archive.";
    if (file.size > MAX_IMPORT_FILE_BYTES)
        return "This file is larger than 64 MB.";
    return null;
}

export function importSelectionError(
    files: readonly { name: string; size: number }[],
) {
    if (!files.length) return "Choose at least one Spotify audio history file.";
    if (files.length > MAX_IMPORT_FILES)
        return "Upload up to 20 files at a time.";
    return files.map(importFileError).find(Boolean) ?? null;
}

export type ImportJobState = "queued" | "processing" | "completed" | "failed";

export interface ImportJobRecord {
    id: bigint;
    fileName: string;
    processed: boolean;
    invalidFile: boolean;
    failedAt: Date | null;
    processedAt: Date | null;
    processingStartedAt: Date | null;
    nextRetryAt: Date | null;
    importedFrom: Date | null;
    importedTo: Date | null;
    createdAt: Date;
    updatedAt: Date | null;
    storageDeletedAt: Date | null;
}

export interface ImportJob {
    id: string;
    fileName: string;
    state: ImportJobState;
    invalidFile: boolean;
    canRetry: boolean;
    createdAt: string;
    updatedAt: string;
    processingStartedAt: string | null;
    processedAt: string | null;
    nextRetryAt: string | null;
    dashboardHref: string;
}

export function importJobSummary(
    record: ImportJobRecord,
    now = new Date(),
): ImportJob {
    const active =
        record.processingStartedAt !== null &&
        record.processingStartedAt.getTime() >
            now.getTime() - IMPORT_PROCESSING_LEASE_MS;
    const state: ImportJobState = record.processed
        ? "completed"
        : record.invalidFile || record.failedAt
          ? "failed"
          : active
            ? "processing"
            : "queued";
    const params =
        record.importedFrom && record.importedTo
            ? new URLSearchParams({
                  from: record.importedFrom.toISOString().slice(0, 10),
                  to: record.importedTo.toISOString().slice(0, 10),
              })
            : null;
    return {
        id: record.id.toString(),
        fileName: record.fileName,
        state,
        invalidFile: record.invalidFile,
        canRetry:
            state === "failed" &&
            !record.invalidFile &&
            !record.processingStartedAt &&
            !record.storageDeletedAt,
        createdAt: record.createdAt.toISOString(),
        updatedAt: (record.updatedAt ?? record.createdAt).toISOString(),
        processingStartedAt:
            state === "processing"
                ? record.processingStartedAt!.toISOString()
                : null,
        processedAt: record.processedAt?.toISOString() ?? null,
        nextRetryAt:
            state === "queued"
                ? (record.nextRetryAt?.toISOString() ?? null)
                : null,
        dashboardHref: params ? `/dashboard?${params}` : "/dashboard",
    };
}
