import { db } from "../db";
import { getUserPlaying } from "@soundstats/spotify";
import type { Image, Artist, SimplifiedArtist } from "@soundstats/spotify";
import type { InferInsertModel } from "drizzle-orm";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "@soundstats/database";
import { clerkClient } from "../clerk";

type ArtistInsertModel = InferInsertModel<typeof schema.artists>;
type AlbumInsertModel = InferInsertModel<typeof schema.albums>;
type ArtistAlbumInsertModel = InferInsertModel<typeof schema.artistAlbums>;
type TrackInsertModel = InferInsertModel<typeof schema.tracks>;
type ArtistTrackInsertModel = InferInsertModel<typeof schema.artistTracks>;
type ListeningHistoryInsertModel = InferInsertModel<
    typeof schema.listeningHistory
>;

export async function updateNowPlaying(premiumOnly: boolean = false) {
    try {
        console.log(
            `Starting now-playing update (premiumOnly: ${premiumOnly})...`,
        );

        // Get all enabled users
        const filters = [eq(schema.users.enabled, true)];

        if (premiumOnly) {
            filters.push(eq(schema.users.premiumUser, true));
        }

        const users = await db
            .select()
            .from(schema.users)
            .where(and(...filters));

        console.log(`Processing ${users.length} users...`);

        for (const user of users) {
            let currentlyPlaying;
            try {
                currentlyPlaying = await getUserPlaying(clerkClient, user.id);

                if (!currentlyPlaying?.is_playing) {
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.log(
                    `Error getting currently playing for user ${user.id}: ${e}`,
                );
                continue;
            }

            // If the item is an Episode, we skip
            // TODO: do we still want to ignore podcasts?
            if (
                !currentlyPlaying.item ||
                currentlyPlaying.item?.type === "episode"
            ) {
                continue;
            }

            const track = currentlyPlaying.item;

            const dbTracks = await db
                .select()
                .from(schema.tracks)
                .where(eq(schema.tracks.id, track.id));

            if (!dbTracks.length) {
                // First insert the artists
                const trackArtists: ArtistInsertModel[] = track.artists.map(
                    (artist: Artist) => ({
                        id: artist.id,
                        name: artist.name,
                    }),
                );
                const albumArtists: ArtistInsertModel[] =
                    track.album.artists.map((artist: SimplifiedArtist) => ({
                        id: artist.id,
                        name: artist.name,
                    }));

                // Combine the artists (removing duplicates)
                const artists = [
                    ...new Set([...trackArtists, ...albumArtists]),
                ];

                await db
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

                await db
                    .insert(schema.albums)
                    .values(album)
                    .onConflictDoNothing();

                // Then insert the artist-album relationship
                const artistAlbums: ArtistAlbumInsertModel[] =
                    track.album.artists.map((artist: SimplifiedArtist) => ({
                        artistId: artist.id,
                        albumId: track.album.id,
                    }));

                await db
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

                await db
                    .insert(schema.tracks)
                    .values(dbTrack)
                    .onConflictDoNothing();

                // Then insert the artist-track relationship
                const artistTracks: ArtistTrackInsertModel[] =
                    track.artists.map((artist: Artist, index: number) => ({
                        artistId: artist.id,
                        trackId: track.id,
                        isPrimaryArtist: index === 0,
                    }));

                await db
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

            const previousListenings = await db
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
                    progressMs: currentlyPlaying.progress_ms,
                    deviceName: currentlyPlaying.device?.name,
                    deviceType: currentlyPlaying.device?.type,
                };

                await db
                    .insert(schema.listeningHistory)
                    .values(listeningHistory)
                    .onConflictDoNothing();

                continue;
            }

            const previousListening = previousListenings[0]!.listening_history;
            const previousTrack = previousListenings[0]!.track;

            // (A)
            if (track.id === previousListening.trackId) {
                // Update the progress_ms column
                await db
                    .update(schema.listeningHistory)
                    .set({
                        progressMs: currentlyPlaying.progress_ms,
                    })
                    .where(
                        eq(schema.listeningHistory.id, previousListening.id),
                    );
            }

            // (B)
            else {
                // (D)
                if (previousListening.progressMs < 20000) {
                    // Remove the previous row (as they haven't listened enough to count)
                    await db
                        .delete(schema.listeningHistory)
                        .where(
                            eq(
                                schema.listeningHistory.id,
                                previousListening.id,
                            ),
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
                    await db
                        .update(schema.listeningHistory)
                        .set({ progressMs: previousTrack.durationMs })
                        .where(
                            eq(
                                schema.listeningHistory.id,
                                previousListening.id,
                            ),
                        );
                }
                // Generic (B) - insert a new row
                const playedAt = new Date(currentlyPlaying.timestamp);
                const newListeningHistory: ListeningHistoryInsertModel = {
                    userId: user.id,
                    trackId: track.id,
                    playedAt,
                    progressMs: currentlyPlaying.progress_ms,
                    deviceName: currentlyPlaying.device?.name,
                    deviceType: currentlyPlaying.device?.type,
                };
                await db
                    .insert(schema.listeningHistory)
                    .values(newListeningHistory)
                    .onConflictDoNothing();
            }
        }

        console.log(
            `Now-playing update completed (premiumOnly: ${premiumOnly})`,
        );
    } catch (error) {
        console.error(
            `Error during now-playing update (premiumOnly: ${premiumOnly}):`,
            error,
        );
    }
}
