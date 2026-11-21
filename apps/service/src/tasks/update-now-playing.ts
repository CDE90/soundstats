import {
    SpanStatusCode,
    trace,
    type Span,
    type SpanContext,
} from "@opentelemetry/api";
import { db } from "../db.js";
import {
    getUserPlaying,
    isSpotifyAuthorizationError,
    isSpotifyRateLimitError,
    isSpotifyUserNotFoundError,
} from "@soundstats/spotify";
import type { Image, SimplifiedArtist } from "@soundstats/spotify";
import type { InferInsertModel } from "drizzle-orm";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "@soundstats/database";
import { clerkClient } from "../clerk.js";
import {
    listensRecorded,
    observeUsersInBackoff,
    pollRunDuration,
    pollRunsSkipped,
    pollSlotWait,
    pollUsers,
    recordPollSuccess,
    tracer,
    type CronResult,
    type PollGroup,
    type PollOutcome,
} from "../metrics.js";
import { POLL_USER_SPAN } from "../telemetry.js";

type ArtistInsertModel = InferInsertModel<typeof schema.artists>;
type AlbumInsertModel = InferInsertModel<typeof schema.albums>;
type ArtistAlbumInsertModel = InferInsertModel<typeof schema.artistAlbums>;
type TrackInsertModel = InferInsertModel<typeof schema.tracks>;
type ArtistTrackInsertModel = InferInsertModel<typeof schema.artistTracks>;
type ListeningHistoryInsertModel = InferInsertModel<
    typeof schema.listeningHistory
>;

const MAX_CONCURRENT_USERS = 10;
const AUTHORIZATION_RETRY_DELAY_MS = 60 * 60 * 1000;
type UpdateGroup = PollGroup;
const runningUpdates = new Set<UpdateGroup>();
const skippedUpdateCounts = new Map<UpdateGroup, number>();
const usersBeingProcessed = new Set<string>();
const authorizationRetryAfter = new Map<string, number>();
let activeUserCount = 0;
const concurrencyWaiters: Array<() => void> = [];

observeUsersInBackoff(() => {
    const now = Date.now();
    let count = 0;
    for (const retryAfter of authorizationRetryAfter.values()) {
        if (retryAfter > now) count++;
    }
    return count;
});

async function acquireUserSlot() {
    if (activeUserCount < MAX_CONCURRENT_USERS) {
        activeUserCount++;
        return;
    }

    await new Promise<void>((resolve) => concurrencyWaiters.push(resolve));
}

function releaseUserSlot() {
    const nextWaiter = concurrencyWaiters.shift();
    if (nextWaiter) {
        nextWaiter();
        return;
    }

    activeUserCount--;
}

async function processWithConcurrency<T>(
    items: T[],
    concurrency: number,
    processItem: (item: T) => Promise<void>,
) {
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const item = items[nextIndex++];
            if (item !== undefined) {
                try {
                    await processItem(item);
                } catch (error) {
                    console.error("Could not process now-playing user:", error);
                }
            }
        }
    }

    const workerCount = Math.min(concurrency, items.length);
    await Promise.allSettled(
        Array.from({ length: workerCount }, () => worker()),
    );
}

export async function updateNowPlaying(
    premiumOnly: boolean = false,
): Promise<CronResult> {
    const updateGroup: UpdateGroup = premiumOnly ? "premium" : "standard";
    if (runningUpdates.has(updateGroup)) {
        skippedUpdateCounts.set(
            updateGroup,
            (skippedUpdateCounts.get(updateGroup) ?? 0) + 1,
        );
        pollRunsSkipped.add(1, { group: updateGroup });
        return "skipped";
    }

    runningUpdates.add(updateGroup);
    return tracer.startActiveSpan(
        `poll.run ${updateGroup}`,
        async (runSpan) => {
            const startedAt = performance.now();
            let result: CronResult = "ok";
            try {
                await runUpdate(updateGroup, premiumOnly, runSpan);
                recordPollSuccess(updateGroup);
            } catch (error) {
                result = "error";
                runSpan.recordException(error as Error);
                runSpan.setStatus({ code: SpanStatusCode.ERROR });
                console.error(
                    `Error during ${updateGroup} now-playing update:`,
                    error,
                );
            } finally {
                pollRunDuration.record(
                    (performance.now() - startedAt) / 1_000,
                    {
                        group: updateGroup,
                        result,
                    },
                );
                runSpan.end();
                const skippedUpdateCount =
                    skippedUpdateCounts.get(updateGroup) ?? 0;
                if (skippedUpdateCount > 0) {
                    console.log(
                        `Skipped ${skippedUpdateCount} overlapping ${updateGroup} now-playing update${skippedUpdateCount === 1 ? "" : "s"}`,
                    );
                    skippedUpdateCounts.delete(updateGroup);
                }
                runningUpdates.delete(updateGroup);
            }
            return result;
        },
    );
}

async function runUpdate(
    updateGroup: UpdateGroup,
    premiumOnly: boolean,
    runSpan: Span,
) {
    console.log(`Starting ${updateGroup} now-playing update...`);

    const filters = [
        eq(schema.users.enabled, true),
        eq(schema.users.premiumUser, premiumOnly),
    ];

    const users = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(...filters));

    console.log(
        `Processing ${users.length} users with up to ${MAX_CONCURRENT_USERS} concurrent requests...`,
    );

    const outcomes = new Map<PollOutcome, number>();
    await processWithConcurrency(users, MAX_CONCURRENT_USERS, async (user) => {
        const outcome = await pollUser(
            user,
            updateGroup,
            runSpan.spanContext(),
        );
        outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
    });

    runSpan.setAttribute("soundstats.poll.users", users.length);
    for (const [outcome, count] of outcomes) {
        runSpan.setAttribute(`soundstats.poll.outcome.${outcome}`, count);
    }

    console.log(`${updateGroup} now-playing update completed`);
}

/** Polls one user in its own trace, linked to the run that scheduled it. */
async function pollUser(
    user: { id: string },
    group: UpdateGroup,
    runContext: SpanContext,
): Promise<PollOutcome> {
    return tracer.startActiveSpan(
        POLL_USER_SPAN,
        {
            root: true,
            links: [{ context: runContext }],
            attributes: {
                "enduser.id": user.id,
                "soundstats.poll.group": group,
            },
        },
        async (span) => {
            let outcome: PollOutcome = "error";
            try {
                outcome = await processUser(user);
                return outcome;
            } finally {
                span.setAttribute("soundstats.poll.outcome", outcome);
                if (outcome === "error") {
                    span.setStatus({ code: SpanStatusCode.ERROR });
                }
                pollUsers.add(1, { group, outcome });
                span.end();
            }
        },
    );
}

async function processUser(user: { id: string }): Promise<PollOutcome> {
    const retryAfter = authorizationRetryAfter.get(user.id);
    if (retryAfter && retryAfter > Date.now()) {
        return "auth_backoff";
    }
    authorizationRetryAfter.delete(user.id);

    const slotWaitStartedAt = performance.now();
    await acquireUserSlot();
    pollSlotWait.record((performance.now() - slotWaitStartedAt) / 1_000);

    if (usersBeingProcessed.has(user.id)) {
        releaseUserSlot();
        return "already_processing";
    }

    usersBeingProcessed.add(user.id);
    try {
        let currentlyPlaying;
        try {
            currentlyPlaying = await getUserPlaying(clerkClient, user.id);

            if (!currentlyPlaying?.is_playing) {
                return "not_playing";
            }
        } catch (error) {
            if (isSpotifyUserNotFoundError(error)) {
                await db
                    .update(schema.users)
                    .set({ enabled: false, premiumUser: false })
                    .where(eq(schema.users.id, user.id));
                authorizationRetryAfter.delete(user.id);
                console.warn(
                    `Disabled now-playing polling for missing Clerk user ${user.id}`,
                );
                return "user_missing";
            }

            if (isSpotifyAuthorizationError(error)) {
                authorizationRetryAfter.set(
                    user.id,
                    Date.now() + AUTHORIZATION_RETRY_DELAY_MS,
                );
                console.warn(
                    `Spotify authorization is unavailable for user ${user.id}; polling paused for one hour`,
                );
                return "auth_unavailable";
            }

            if (isSpotifyRateLimitError(error)) {
                return "rate_limited";
            }

            console.error(
                `Could not get the current Spotify playback for user ${user.id}:`,
                error,
            );
            trace.getActiveSpan()?.recordException(error as Error);
            return "error";
        }

        // If the item is an Episode, we skip
        // TODO: do we still want to ignore podcasts?
        if (
            !currentlyPlaying.item ||
            currentlyPlaying.item?.type === "episode"
        ) {
            return "episode";
        }

        const track = currentlyPlaying.item;

        // Local files have no Spotify IDs for the track, album or artists,
        // so there is nothing to link a listen to.
        if (track.is_local || !track.id) {
            return "local_file";
        }

        // Wrap all database operations for this user in a transaction
        const written = await tracer.startActiveSpan(
            "poll.user.record",
            async (recordSpan) => {
                try {
                    return await recordListen(user.id, track, currentlyPlaying);
                } catch (error) {
                    recordSpan.recordException(error as Error);
                    recordSpan.setStatus({ code: SpanStatusCode.ERROR });
                    throw error;
                } finally {
                    recordSpan.end();
                }
            },
        );
        listensRecorded.add(1, { source: "poll", kind: written });
        return "recorded";
    } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        trace.getActiveSpan()?.recordException(error as Error);
        // Continue processing other users - don't let one failure abort the entire job
        return "error";
    } finally {
        usersBeingProcessed.delete(user.id);
        releaseUserSlot();
    }
}

type PlaybackState = NonNullable<Awaited<ReturnType<typeof getUserPlaying>>>;
type PlayingTrack = Extract<
    NonNullable<PlaybackState["item"]>,
    { type: "track" }
>;

/**
 * Records the current track in one transaction. Returns whether a new
 * listen was inserted or the previous listen's progress was updated.
 */
async function recordListen(
    userId: string,
    track: PlayingTrack,
    currentlyPlaying: PlaybackState,
): Promise<"new" | "progress"> {
    const user = { id: userId };
    return await db.transaction(async (tx) => {
        const dbTracks = await tx
            .select()
            .from(schema.tracks)
            .where(eq(schema.tracks.id, track.id));

        if (!dbTracks.length) {
            // First insert the artists
            const trackArtists: ArtistInsertModel[] = track.artists.map(
                (artist) => ({
                    id: artist.id,
                    name: artist.name,
                }),
            );
            const albumArtists: ArtistInsertModel[] = track.album.artists.map(
                (artist: SimplifiedArtist) => ({
                    id: artist.id,
                    name: artist.name,
                }),
            );

            // Combine the artists (removing duplicates)
            const artistsMap = new Map<string, ArtistInsertModel>();
            for (const a of [...trackArtists, ...albumArtists]) {
                artistsMap.set(a.id, a);
            }
            const artists = Array.from(artistsMap.values());

            await tx
                .insert(schema.artists)
                .values(artists)
                .onConflictDoNothing();

            // Then insert the album
            const albumReleaseDate = new Date(track.album.release_date);
            let primaryImage = null as Image | null;
            if (track.album.images.length) {
                const initialValue = track.album.images[0]!;
                primaryImage = track.album.images.reduce(
                    (prev: Image, curr: Image) =>
                        prev.width > curr.width ? prev : curr,
                    initialValue,
                );
            }

            const album: AlbumInsertModel = {
                id: track.album.id,
                name: track.album.name,
                albumType: track.album.album_type,
                releaseDate: albumReleaseDate,
                totalTracks: track.album.total_tracks,
                imageUrl: primaryImage?.url,
            };

            await tx.insert(schema.albums).values(album).onConflictDoNothing();

            // Then insert the artist-album relationship
            const artistAlbums: ArtistAlbumInsertModel[] =
                track.album.artists.map((artist: SimplifiedArtist) => ({
                    artistId: artist.id,
                    albumId: track.album.id,
                }));

            await tx
                .insert(schema.artistAlbums)
                .values(artistAlbums)
                .onConflictDoNothing();

            // Then insert the track
            const dbTrack: TrackInsertModel = {
                id: track.id,
                name: track.name,
                albumId: track.album.id,
                durationMs: track.duration_ms,
                popularity: track.popularity,
            };

            await tx
                .insert(schema.tracks)
                .values(dbTrack)
                .onConflictDoNothing();

            // Then insert the artist-track relationship
            const artistTracks: ArtistTrackInsertModel[] = track.artists.map(
                (artist, index: number) => ({
                    artistId: artist.id,
                    trackId: track.id,
                    isPrimaryArtist: index === 0,
                }),
            );

            await tx
                .insert(schema.artistTracks)
                .values(artistTracks)
                .onConflictDoNothing();
        }

        // Finally, insert the listening history

        // rules:
        // - (A) if the current track is the same as the previous track, don't insert a new row, but update the progress_ms column
        // - (B) if the current and previous tracks are different ( (C) or no previous track exists), insert a new row
        //     - (D) additionally, if the previous track progress_ms is less than 20 seconds, remove the previous row (as they haven't listened enough to count)
        //     - (E) additionally, if the previous track progress_ms is greater than 80% of that track's duration, set the progress_ms to equal that track's duration

        const previousListenings = await tx
            .select()
            .from(schema.listeningHistory)
            .leftJoin(
                schema.tracks,
                eq(schema.listeningHistory.trackId, schema.tracks.id),
            )
            .where(eq(schema.listeningHistory.userId, user.id))
            .orderBy(desc(schema.listeningHistory.playedAt))
            .limit(1);

        // (C)
        if (!previousListenings.length) {
            // No previous track, so we can just insert a new row
            const playedAt = new Date(currentlyPlaying.timestamp);
            const listeningHistory: ListeningHistoryInsertModel = {
                userId: user.id,
                trackId: track.id,
                playedAt,
                progressMs: currentlyPlaying.progress_ms ?? 0,
                deviceName: currentlyPlaying.device?.name,
                deviceType: currentlyPlaying.device?.type,
            };

            await tx
                .insert(schema.listeningHistory)
                .values(listeningHistory)
                .onConflictDoNothing();

            return "new" as const;
        }

        const previousListening = previousListenings[0]!.listening_history;
        const previousTrack = previousListenings[0]!.track;

        // (A)
        if (track.id === previousListening.trackId) {
            // Update the progress_ms column
            await tx
                .update(schema.listeningHistory)
                .set({
                    progressMs: currentlyPlaying.progress_ms ?? 0,
                })
                .where(eq(schema.listeningHistory.id, previousListening.id));
            return "progress" as const;
        }

        // (B)
        else {
            // (D)
            if (previousListening.progressMs < 20000) {
                // Remove the previous row (as they haven't listened enough to count)
                await tx
                    .delete(schema.listeningHistory)
                    .where(
                        eq(schema.listeningHistory.id, previousListening.id),
                    );
            }
            // (E)
            else if (
                previousTrack?.durationMs &&
                (previousListening.progressMs >
                    0.8 * previousTrack.durationMs ||
                    previousTrack.durationMs < 60000)
            ) {
                // Update the previous row to set the progress to 100%
                await tx
                    .update(schema.listeningHistory)
                    .set({ progressMs: previousTrack.durationMs })
                    .where(
                        eq(schema.listeningHistory.id, previousListening.id),
                    );
            }
            // Generic (B) - insert a new row
            const playedAt = new Date(currentlyPlaying.timestamp);
            const newListeningHistory: ListeningHistoryInsertModel = {
                userId: user.id,
                trackId: track.id,
                playedAt,
                progressMs: currentlyPlaying.progress_ms ?? 0,
                deviceName: currentlyPlaying.device?.name,
                deviceType: currentlyPlaying.device?.type,
            };
            await tx
                .insert(schema.listeningHistory)
                .values(newListeningHistory)
                .onConflictDoNothing();
            return "new" as const;
        }
    });
}
