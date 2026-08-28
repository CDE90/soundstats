import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import * as schema from "@soundstats/database";
import { getGlobalAccessToken, getSeveralTracks } from "@soundstats/spotify";
import type { Track } from "@soundstats/spotify";
import {
    and,
    asc,
    eq,
    gte,
    inArray,
    isNull,
    lte,
    or,
    type InferInsertModel,
} from "drizzle-orm";
import { z } from "zod";
import { UTApi } from "uploadthing/server";
import { env } from "../env.js";

type ArtistInsertModel = InferInsertModel<typeof schema.artists>;
type AlbumInsertModel = InferInsertModel<typeof schema.albums>;
type ArtistAlbumInsertModel = InferInsertModel<typeof schema.artistAlbums>;
type TrackInsertModel = InferInsertModel<typeof schema.tracks>;
type ArtistTrackInsertModel = InferInsertModel<typeof schema.artistTracks>;
type ListeningHistoryInsertModel = InferInsertModel<
    typeof schema.listeningHistory
>;
type StreamingUpload = typeof schema.streamingUploads.$inferSelect;

const MAX_FILES_PER_RUN = 10;
const MAX_ATTEMPTS = 5;
const FILE_FETCH_TIMEOUT_MS = 60_000;
const INSERT_BATCH_SIZE = 500;
const TRACK_API_BATCH_SIZE = 50;
const RETRY_BASE_DELAY_MS = 15 * 60 * 1_000;
const RETRY_MAX_DELAY_MS = 24 * 60 * 60 * 1_000;
const SPOTIFY_TRACK_URI_PATTERN = /^spotify:track:([A-Za-z0-9]{22})$/;

const utapi = new UTApi({
    token: env.UPLOADTHING_TOKEN,
    logLevel: "Error",
});

const timestampSchema = z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), "Invalid timestamp");
const baseEntryFields = {
    ts: timestampSchema,
    ms_played: z.number().nonnegative(),
};
const rawEntrySchema = z.object(baseEntryFields).passthrough();
const trackSchema = z.object({
    ...baseEntryFields,
    master_metadata_track_name: z.string(),
    master_metadata_album_artist_name: z.string(),
    master_metadata_album_album_name: z.string(),
    spotify_track_uri: z.string().regex(SPOTIFY_TRACK_URI_PATTERN),
});
const episodeSchema = z.object({
    ...baseEntryFields,
    episode_name: z.string(),
    episode_show_name: z.string(),
    spotify_episode_uri: z.string(),
});
const audiobookSchema = z.object({
    ...baseEntryFields,
    audiobook_chapter_uri: z.string(),
});
const extendedFileSchema = z.array(rawEntrySchema).min(1);

type TrackEntry = z.infer<typeof trackSchema>;

interface ParsedUpload {
    firstImportDate: Date;
    lastImportDate: Date;
    totalEntries: number;
    trackEntries: TrackEntry[];
    episodeCount: number;
    audiobookCount: number;
    unknownCount: number;
    malformedTrackCount: number;
}

class InvalidUploadError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "InvalidUploadError";
    }
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += chunkSize) {
        chunks.push(values.slice(index, index + chunkSize));
    }
    return chunks;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 4_000);
    return String(error).slice(0, 4_000);
}

function logUpload(
    level: "info" | "warn" | "error",
    event: string,
    fields: Record<string, unknown>,
): void {
    console[level](
        JSON.stringify({
            timestamp: new Date().toISOString(),
            component: "upload-processor",
            event,
            ...fields,
        }),
    );
}

export function getTrackId(uri: string): string | null {
    return SPOTIFY_TRACK_URI_PATTERN.exec(uri)?.[1] ?? null;
}

function getStorageKey(upload: StreamingUpload): string | null {
    if (upload.fileKey) return upload.fileKey;
    try {
        return (
            new URL(upload.fileUrl).pathname
                .split("/")
                .filter(Boolean)
                .at(-1) ?? null
        );
    } catch {
        return null;
    }
}

export function retryDelayMs(attempt: number): number {
    return Math.min(
        RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1),
        RETRY_MAX_DELAY_MS,
    );
}

async function insertInBatches<T>(
    values: T[],
    insertBatch: (batch: T[]) => Promise<unknown>,
): Promise<void> {
    for (const batch of chunkArray(values, INSERT_BATCH_SIZE)) {
        await insertBatch(batch);
    }
}

export function parseUpload(text: string): ParsedUpload {
    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(text);
    } catch (error) {
        throw new InvalidUploadError("The upload is not valid JSON", {
            cause: error,
        });
    }

    const parsedFile = extendedFileSchema.safeParse(parsedJson);
    if (!parsedFile.success) {
        const firstIssue = parsedFile.error.issues[0];
        const issuePath = firstIssue?.path.join(".") || "root";
        throw new InvalidUploadError(
            `The upload does not match Spotify history format at ${issuePath}: ${firstIssue?.message ?? "unknown validation error"}`,
        );
    }

    const trackEntries: TrackEntry[] = [];
    let episodeCount = 0;
    let audiobookCount = 0;
    let unknownCount = 0;
    let malformedTrackCount = 0;
    let firstTimestamp = Number.POSITIVE_INFINITY;
    let lastTimestamp = Number.NEGATIVE_INFINITY;

    for (const entry of parsedFile.data) {
        const timestamp = Date.parse(entry.ts);
        firstTimestamp = Math.min(firstTimestamp, timestamp);
        lastTimestamp = Math.max(lastTimestamp, timestamp);

        const trackResult = trackSchema.safeParse(entry);
        if (trackResult.success) {
            trackEntries.push(trackResult.data);
            continue;
        }

        if (
            entry.spotify_track_uri != null ||
            entry.master_metadata_track_name != null
        ) {
            malformedTrackCount++;
        } else if (episodeSchema.safeParse(entry).success) {
            episodeCount++;
        } else if (audiobookSchema.safeParse(entry).success) {
            audiobookCount++;
        } else {
            unknownCount++;
        }
    }

    return {
        firstImportDate: new Date(firstTimestamp),
        lastImportDate: new Date(lastTimestamp),
        totalEntries: parsedFile.data.length,
        trackEntries,
        episodeCount,
        audiobookCount,
        unknownCount,
        malformedTrackCount,
    };
}

async function fetchUpload(upload: StreamingUpload): Promise<string> {
    const response = await fetch(upload.fileUrl, {
        signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Upload download returned HTTP ${response.status}`);
    }
    return response.text();
}

async function getExistingTrackIds(trackIds: string[]): Promise<Set<string>> {
    const existingIds = new Set<string>();
    for (const chunk of chunkArray(trackIds, INSERT_BATCH_SIZE)) {
        const rows = await db
            .select({ id: schema.tracks.id })
            .from(schema.tracks)
            .where(inArray(schema.tracks.id, chunk));
        for (const row of rows) existingIds.add(row.id);
    }
    return existingIds;
}

async function fetchMissingTracks(
    accessToken: string,
    missingTrackIds: string[],
): Promise<Track[]> {
    const trackData: Track[] = [];
    for (const chunk of chunkArray(missingTrackIds, TRACK_API_BATCH_SIZE)) {
        const response = await getSeveralTracks(accessToken, chunk);
        for (const track of response?.tracks ?? []) {
            if (track) trackData.push(track);
        }
    }
    return trackData;
}

function buildTrackInserts(trackData: Track[]) {
    const artists = new Map<string, ArtistInsertModel>();
    const albums = new Map<string, AlbumInsertModel>();
    const artistAlbums = new Map<string, ArtistAlbumInsertModel>();
    const tracks = new Map<string, TrackInsertModel>();
    const artistTracks = new Map<string, ArtistTrackInsertModel>();

    for (const track of trackData) {
        for (const artist of [...track.artists, ...track.album.artists]) {
            artists.set(artist.id, { id: artist.id, name: artist.name });
        }
        albums.set(track.album.id, {
            id: track.album.id,
            name: track.album.name,
            albumType: track.album.album_type,
            releaseDate: new Date(track.album.release_date),
            totalTracks: track.album.total_tracks,
            imageUrl: track.album.images[0]?.url,
        });
        for (const artist of track.album.artists) {
            artistAlbums.set(`${artist.id}:${track.album.id}`, {
                artistId: artist.id,
                albumId: track.album.id,
            });
        }
        tracks.set(track.id, {
            id: track.id,
            name: track.name,
            albumId: track.album.id,
            durationMs: track.duration_ms,
            popularity: track.popularity,
        });
        track.artists.forEach((artist, index) => {
            artistTracks.set(`${artist.id}:${track.id}`, {
                artistId: artist.id,
                trackId: track.id,
                isPrimaryArtist: index === 0,
            });
        });
    }

    return {
        artists: Array.from(artists.values()),
        albums: Array.from(albums.values()),
        artistAlbums: Array.from(artistAlbums.values()),
        tracks: Array.from(tracks.values()),
        artistTracks: Array.from(artistTracks.values()),
    };
}

async function importUpload(
    upload: StreamingUpload,
    accessToken: string,
    parsed: ParsedUpload,
): Promise<{ importedEntries: number; unavailableTracks: number }> {
    const eligibleEntries = parsed.trackEntries.filter(
        (entry) => entry.ms_played >= 20_000,
    );
    const requestedTrackIds = Array.from(
        new Set(
            eligibleEntries.flatMap((entry) => {
                const trackId = getTrackId(entry.spotify_track_uri);
                return trackId ? [trackId] : [];
            }),
        ),
    );

    const existingTrackIds = await getExistingTrackIds(requestedTrackIds);
    const missingTrackIds = requestedTrackIds.filter(
        (trackId) => !existingTrackIds.has(trackId),
    );
    const trackData = await fetchMissingTracks(accessToken, missingTrackIds);
    const fetchedTrackIds = new Set(trackData.map((track) => track.id));
    const availableTrackIds = new Set([
        ...existingTrackIds,
        ...fetchedTrackIds,
    ]);
    const unavailableTracks = missingTrackIds.filter(
        (trackId) => !fetchedTrackIds.has(trackId),
    ).length;

    const listeningHistory: ListeningHistoryInsertModel[] = [];
    for (const entry of eligibleEntries) {
        const trackId = getTrackId(entry.spotify_track_uri);
        if (!trackId || !availableTrackIds.has(trackId)) continue;
        listeningHistory.push({
            userId: upload.userId,
            trackId,
            playedAt: new Date(entry.ts),
            progressMs: entry.ms_played,
            imported: true,
        });
    }

    const inserts = buildTrackInserts(trackData);
    await db.transaction(async (tx) => {
        await insertInBatches(inserts.artists, (batch) =>
            tx.insert(schema.artists).values(batch).onConflictDoNothing(),
        );
        await insertInBatches(inserts.albums, (batch) =>
            tx.insert(schema.albums).values(batch).onConflictDoNothing(),
        );
        await insertInBatches(inserts.artistAlbums, (batch) =>
            tx.insert(schema.artistAlbums).values(batch).onConflictDoNothing(),
        );
        await insertInBatches(inserts.tracks, (batch) =>
            tx.insert(schema.tracks).values(batch).onConflictDoNothing(),
        );
        await insertInBatches(inserts.artistTracks, (batch) =>
            tx.insert(schema.artistTracks).values(batch).onConflictDoNothing(),
        );

        await tx
            .delete(schema.listeningHistory)
            .where(
                and(
                    eq(schema.listeningHistory.userId, upload.userId),
                    gte(
                        schema.listeningHistory.playedAt,
                        parsed.firstImportDate,
                    ),
                    lte(
                        schema.listeningHistory.playedAt,
                        parsed.lastImportDate,
                    ),
                ),
            );
        await insertInBatches(listeningHistory, (batch) =>
            tx.insert(schema.listeningHistory).values(batch),
        );
        await tx
            .update(schema.streamingUploads)
            .set({
                processed: true,
                processedAt: new Date(),
                attemptCount: upload.attemptCount + 1,
                lastError: null,
                nextRetryAt: null,
                failedAt: null,
            })
            .where(eq(schema.streamingUploads.id, upload.id));
    });

    return { importedEntries: listeningHistory.length, unavailableTracks };
}

async function markInvalidUpload(
    upload: StreamingUpload,
    error: InvalidUploadError,
): Promise<void> {
    await db
        .update(schema.streamingUploads)
        .set({
            invalidFile: true,
            attemptCount: upload.attemptCount + 1,
            lastError: getErrorMessage(error),
            nextRetryAt: null,
            failedAt: new Date(),
        })
        .where(eq(schema.streamingUploads.id, upload.id));
}

async function markRetriableFailure(
    upload: StreamingUpload,
    error: unknown,
): Promise<{ terminal: boolean; attempt: number; nextRetryAt: Date | null }> {
    const attempt = upload.attemptCount + 1;
    const terminal = attempt >= MAX_ATTEMPTS;
    const nextRetryAt = terminal
        ? null
        : new Date(Date.now() + retryDelayMs(attempt));

    await db
        .update(schema.streamingUploads)
        .set({
            attemptCount: attempt,
            lastError: getErrorMessage(error),
            nextRetryAt,
            failedAt: terminal ? new Date() : null,
        })
        .where(eq(schema.streamingUploads.id, upload.id));
    return { terminal, attempt, nextRetryAt };
}

async function markStorageDeleteFailure(
    upload: StreamingUpload,
    error: unknown,
): Promise<{ terminal: boolean; attempt: number; nextRetryAt: Date | null }> {
    const attempt = upload.storageDeleteAttemptCount + 1;
    const terminal = attempt >= MAX_ATTEMPTS;
    const nextRetryAt = terminal
        ? null
        : new Date(Date.now() + retryDelayMs(attempt));

    await db
        .update(schema.streamingUploads)
        .set({
            storageDeleteAttemptCount: attempt,
            storageDeleteLastError: getErrorMessage(error),
            storageDeleteNextRetryAt: nextRetryAt,
            storageDeleteFailedAt: terminal ? new Date() : null,
        })
        .where(eq(schema.streamingUploads.id, upload.id));
    return { terminal, attempt, nextRetryAt };
}

async function deleteStoredUpload(
    upload: StreamingUpload,
    runId: string,
): Promise<boolean> {
    const fileKey = getStorageKey(upload);
    if (!fileKey) {
        const error = new Error("Could not determine the UploadThing file key");
        const failure = await markStorageDeleteFailure(upload, error);
        logUpload("error", "storage_cleanup_failed", {
            runId,
            uploadId: upload.id.toString(),
            userId: upload.userId,
            stage: "cleanup",
            outcome: failure.terminal ? "failed" : "retry_scheduled",
            attempt: failure.attempt,
            nextRetryAt: failure.nextRetryAt?.toISOString() ?? null,
            error: error.message,
        });
        return false;
    }

    try {
        const result = await utapi.deleteFiles(fileKey);
        if (!result.success) throw new Error("UploadThing rejected deletion");
        await db
            .update(schema.streamingUploads)
            .set({
                storageDeletedAt: new Date(),
                storageDeleteAttemptCount: upload.storageDeleteAttemptCount + 1,
                storageDeleteLastError: null,
                storageDeleteNextRetryAt: null,
                storageDeleteFailedAt: null,
            })
            .where(eq(schema.streamingUploads.id, upload.id));
        logUpload("info", "storage_cleanup_completed", {
            runId,
            uploadId: upload.id.toString(),
            userId: upload.userId,
            stage: "cleanup",
            outcome: "success",
            deletedCount: result.deletedCount,
        });
        return true;
    } catch (error) {
        const failure = await markStorageDeleteFailure(upload, error);
        logUpload("error", "storage_cleanup_failed", {
            runId,
            uploadId: upload.id.toString(),
            userId: upload.userId,
            stage: "cleanup",
            outcome: failure.terminal ? "failed" : "retry_scheduled",
            attempt: failure.attempt,
            nextRetryAt: failure.nextRetryAt?.toISOString() ?? null,
            error: getErrorMessage(error),
        });
        return false;
    }
}

async function retryStorageCleanup(runId: string): Promise<void> {
    const uploads = await db
        .select()
        .from(schema.streamingUploads)
        .where(
            and(
                isNull(schema.streamingUploads.storageDeletedAt),
                isNull(schema.streamingUploads.storageDeleteFailedAt),
                or(
                    isNull(schema.streamingUploads.storageDeleteNextRetryAt),
                    lte(
                        schema.streamingUploads.storageDeleteNextRetryAt,
                        new Date(),
                    ),
                ),
                or(
                    eq(schema.streamingUploads.processed, true),
                    eq(schema.streamingUploads.invalidFile, true),
                ),
            ),
        )
        .orderBy(asc(schema.streamingUploads.createdAt))
        .limit(20);
    for (const upload of uploads) await deleteStoredUpload(upload, runId);
}

let isProcessingUploads = false;

export async function processUploads(): Promise<void> {
    if (isProcessingUploads) {
        logUpload("warn", "job_skipped", {
            stage: "job",
            outcome: "skipped",
            reason: "overlapping local run",
        });
        return;
    }

    const runId = randomUUID();
    const startedAt = Date.now();
    isProcessingUploads = true;
    try {
        await processUploadsInner(runId, startedAt);
    } catch (error) {
        logUpload("error", "job_failed", {
            runId,
            stage: "job",
            outcome: "failed",
            durationMs: Date.now() - startedAt,
            error: getErrorMessage(error),
        });
    } finally {
        isProcessingUploads = false;
    }
}

async function processUploadsInner(
    runId: string,
    startedAt: number,
): Promise<void> {
    logUpload("info", "job_started", {
        runId,
        stage: "job",
        outcome: "started",
    });
    await retryStorageCleanup(runId);

    const files = await db
        .select()
        .from(schema.streamingUploads)
        .where(
            and(
                eq(schema.streamingUploads.processed, false),
                eq(schema.streamingUploads.invalidFile, false),
                isNull(schema.streamingUploads.failedAt),
                or(
                    isNull(schema.streamingUploads.nextRetryAt),
                    lte(schema.streamingUploads.nextRetryAt, new Date()),
                ),
            ),
        )
        .orderBy(asc(schema.streamingUploads.createdAt))
        .limit(MAX_FILES_PER_RUN);

    if (files.length === 0) {
        logUpload("info", "job_completed", {
            runId,
            stage: "job",
            outcome: "success",
            durationMs: Date.now() - startedAt,
            selected: 0,
            completed: 0,
            invalid: 0,
            retriableFailures: 0,
            terminalFailures: 0,
        });
        return;
    }

    const accessToken = await getGlobalAccessToken(
        env.SPOTIFY_CLIENT_ID,
        env.SPOTIFY_CLIENT_SECRET,
    );
    if (!accessToken) throw new Error("Failed to get Spotify access token");

    let completed = 0;
    let invalid = 0;
    let retriableFailures = 0;
    let terminalFailures = 0;

    for (const upload of files) {
        const fileStartedAt = Date.now();
        const attempt = upload.attemptCount + 1;
        logUpload("info", "file_started", {
            runId,
            uploadId: upload.id.toString(),
            userId: upload.userId,
            fileName: upload.fileName,
            stage: "download",
            outcome: "started",
            attempt,
        });

        try {
            const text = await fetchUpload(upload);
            const parsed = parseUpload(text);
            const result = await importUpload(upload, accessToken, parsed);
            completed++;
            logUpload("info", "file_completed", {
                runId,
                uploadId: upload.id.toString(),
                userId: upload.userId,
                fileName: upload.fileName,
                stage: "import",
                outcome: "success",
                attempt,
                durationMs: Date.now() - fileStartedAt,
                totalEntries: parsed.totalEntries,
                importedEntries: result.importedEntries,
                episodesIgnored: parsed.episodeCount,
                audiobooksIgnored: parsed.audiobookCount,
                unknownEntriesIgnored: parsed.unknownCount,
                malformedTracksIgnored: parsed.malformedTrackCount,
                unavailableTracks: result.unavailableTracks,
            });
            await deleteStoredUpload({ ...upload, processed: true }, runId);
        } catch (error) {
            if (error instanceof InvalidUploadError) {
                invalid++;
                await markInvalidUpload(upload, error);
                logUpload("error", "file_invalid", {
                    runId,
                    uploadId: upload.id.toString(),
                    userId: upload.userId,
                    fileName: upload.fileName,
                    stage: "validation",
                    outcome: "invalid",
                    attempt,
                    durationMs: Date.now() - fileStartedAt,
                    error: getErrorMessage(error),
                });
                await deleteStoredUpload(
                    { ...upload, invalidFile: true },
                    runId,
                );
                continue;
            }

            const failure = await markRetriableFailure(upload, error);
            if (failure.terminal) terminalFailures++;
            else retriableFailures++;
            logUpload("error", "file_failed", {
                runId,
                uploadId: upload.id.toString(),
                userId: upload.userId,
                fileName: upload.fileName,
                stage: "processing",
                outcome: failure.terminal ? "failed" : "retry_scheduled",
                attempt: failure.attempt,
                nextRetryAt: failure.nextRetryAt?.toISOString() ?? null,
                durationMs: Date.now() - fileStartedAt,
                error: getErrorMessage(error),
            });
        }
    }

    await retryStorageCleanup(runId);
    const hasFailures = retriableFailures > 0 || terminalFailures > 0;
    logUpload(hasFailures ? "warn" : "info", "job_completed", {
        runId,
        stage: "job",
        outcome: hasFailures ? "partial_failure" : "success",
        durationMs: Date.now() - startedAt,
        selected: files.length,
        completed,
        invalid,
        retriableFailures,
        terminalFailures,
    });
}
