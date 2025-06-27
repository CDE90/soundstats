// POST /api/process-uploads
// This endpoint will trigger the refetching the potentially stale data for artists and albums

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { chunkArray } from "@/server/lib";
import {
    getGlobalAccessToken,
    getSeveralTracks,
} from "@/server/spotify/spotify";
import type { Track } from "@/server/spotify/types";
import { asc, eq, type InferInsertModel, and, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger, withAxiom } from "@/lib/axiom/server";

type ArtistInsertModel = InferInsertModel<typeof schema.artists>;
type AlbumInsertModel = InferInsertModel<typeof schema.albums>;
type ArtistAlbumInsertModel = InferInsertModel<typeof schema.artistAlbums>;
type TrackInsertModel = InferInsertModel<typeof schema.tracks>;
type ArtistTrackInsertModel = InferInsertModel<typeof schema.artistTracks>;
type ListeningHistoryInsertModel = InferInsertModel<
    typeof schema.listeningHistory
>;

export async function GET(request: Request, ctx: unknown) {
    if (env.NODE_ENV === "production") {
        // Return 404 in production
        return new Response("Not found", { status: 404 });
    }
    // Otherwise, send the response from POST
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await POST(request, ctx);
}

/*
To correctly schedule, we need to add the following cron jobs:

    5 *\/6 * * * curl -X POST -H "Authorization: Bearer [token]" https://[domain]/api/process-uploads

*/

// The extended file schema is for the "Extended streaming history" files
// This is a separate export to the spotify account data export
// NOTE: this schema does not list ALL fields, just the ones we use
const trackSchema = z
    .object({
        ts: z.string(),
        ms_played: z.number(),
        master_metadata_track_name: z.string(),
        master_metadata_album_artist_name: z.string(),
        master_metadata_album_album_name: z.string(),
        spotify_track_uri: z.string(),
    })
    .transform((data) => {
        return {
            ...data,
            type: "track",
        } as const;
    });
const episodeSchema = z
    .object({
        ts: z.string(),
        ms_played: z.number(),
        episode_name: z.string(),
        episode_show_name: z.string(),
        spotify_episode_uri: z.string(),
    })
    .transform((data) => {
        return {
            ...data,
            type: "episode",
        } as const;
    });
const unknownSchema = z.object({ ts: z.string() }).transform((data) => {
    return {
        ...data,
        type: "unknown",
    } as const;
});
const extendedFileSchema = z
    .array(z.union([trackSchema, episodeSchema, unknownSchema]))
    .min(1);

// When the environment is production, this endpoint will be protected by a bearer token
export const POST = withAxiom(async (request: Request) => {
    const headers = request.headers;
    const token = headers.get("Authorization");

    logger.info("Starting upload processing", {
        environment: env.NODE_ENV,
    });

    if (env.NODE_ENV === "production") {
        if (!token) {
            logger.warn(
                "Unauthorized upload processing request - missing token",
                {
                    endpoint: "/api/process-uploads",
                },
            );
            return new Response("Unauthorized", { status: 401 });
        }

        const bearerToken = token.split(" ")[1];

        if (bearerToken !== env.SYNC_ENDPOINT_TOKEN) {
            logger.warn(
                "Unauthorized upload processing request - invalid token",
                {
                    endpoint: "/api/process-uploads",
                },
            );
            return new Response("Unauthorized", { status: 401 });
        }
    }

    // Get the app access token
    const accessToken = (await getGlobalAccessToken())!;

    // Get the files that have been uploaded
    const files = await db
        .select()
        .from(schema.streamingUploads)
        .where(
            and(
                eq(schema.streamingUploads.processed, false),
                eq(schema.streamingUploads.invalidFile, false),
            ),
        )
        .orderBy(asc(schema.streamingUploads.createdAt))
        .limit(10);

    logger.info("Found files to process", {
        fileCount: files.length,
    });

    // Fetch the contents of each file
    const fileContents = await Promise.all(
        files.map(async (file) => {
            const response = await fetch(file.fileUrl);
            const text = await response.text();
            return {
                id: file.id,
                userId: file.userId,
                text,
            };
        }),
    );

    logger.info("File contents fetched", {
        fileCount: files.length,
    });

    if (files.length === 0) {
        logger.info("No files to process");
        return NextResponse.json({ success: true });
    }

    // A set of track ids from the extended files
    const trackIds = new Set<string>();

    const extendedFileDatas = [];

    for (const file of fileContents) {
        const extendedFileParsed = extendedFileSchema.safeParse(
            JSON.parse(file.text),
        );
        if (extendedFileParsed.success) {
            const fileData = extendedFileParsed.data;

            for (const entry of fileData) {
                if (entry.type !== "track") continue;
                const trackId =
                    entry.spotify_track_uri.split("spotify:track:")[1]!;
                trackIds.add(trackId);
            }

            let tracks = 0;
            let episodes = 0;
            let unknown = 0;

            for (const entry of fileData) {
                if (entry.type === "track") {
                    tracks++;
                } else if (entry.type === "episode") {
                    episodes++;
                } else {
                    unknown++;
                }
            }

            logger.info("File processed successfully", {
                fileId: file.id,
                userId: file.userId,
                tracksCount: tracks,
                episodesCount: episodes,
                unknownCount: unknown,
                totalEntries: fileData.length,
            });

            extendedFileDatas.push({
                id: file.id,
                userId: file.userId,
                data: fileData,
            });
        } else {
            logger.error("Failed to parse file", {
                fileId: file.id,
                userId: file.userId,
                error: extendedFileParsed.error.message,
                issues: extendedFileParsed.error.issues,
            });
            await db
                .update(schema.streamingUploads)
                .set({
                    invalidFile: true,
                    processed: false,
                })
                .where(eq(schema.streamingUploads.id, file.id));
            continue;
        }
    }

    logger.info("Extended files processed", {
        processedFiles: extendedFileDatas.length,
        uniqueTrackIds: trackIds.size,
    });

    // Handle inserting the tracks, albums, and artists
    const artistInserts: ArtistInsertModel[] = [];
    const albumInserts: AlbumInsertModel[] = [];
    const artistAlbumInserts: ArtistAlbumInsertModel[] = [];
    const trackInserts: TrackInsertModel[] = [];
    const artistTrackInserts: ArtistTrackInsertModel[] = [];

    const trackData: Track[] = [];

    // Chunk the track ids into groups of 50
    const TRACK_CHUNK_SIZE = 50;
    const trackIdsChunks = chunkArray(Array.from(trackIds), TRACK_CHUNK_SIZE);

    for (const trackIdsChunk of trackIdsChunks) {
        // Get the track data for the chunk
        const tracks = await getSeveralTracks(accessToken, trackIdsChunk);
        for (const track of tracks?.tracks ?? []) {
            trackData.push(track);
        }
    }

    logger.info("Track data fetched from Spotify", {
        requestedTracks: trackIds.size,
        fetchedTracks: trackData.length,
        chunksProcessed: trackIdsChunks.length,
    });

    for (const track of trackData) {
        track.artists.forEach((artist) => {
            artistInserts.push({
                id: artist.id,
                name: artist.name,
            });
        });
        track.album.artists.forEach((artist) => {
            artistInserts.push({
                id: artist.id,
                name: artist.name,
            });
        });

        albumInserts.push({
            id: track.album.id,
            name: track.album.name,
            albumType: track.album.album_type,
            releaseDate: new Date(track.album.release_date),
            totalTracks: track.album.total_tracks,
            imageUrl: track.album.images[0]?.url,
        });

        track.album.artists.forEach((artist) => {
            artistAlbumInserts.push({
                artistId: artist.id,
                albumId: track.album.id,
            });
        });

        trackInserts.push({
            id: track.id,
            name: track.name,
            albumId: track.album.id,
            durationMs: track.duration_ms,
            popularity: track.popularity,
        });

        track.artists.forEach((artist, index) => {
            artistTrackInserts.push({
                artistId: artist.id,
                trackId: track.id,
                isPrimaryArtist: index === 0,
            });
        });
    }

    // Insert albums
    await db.insert(schema.albums).values(albumInserts).onConflictDoNothing();

    // Insert artists
    await db.insert(schema.artists).values(artistInserts).onConflictDoNothing();

    // Insert artist-album relationships
    await db
        .insert(schema.artistAlbums)
        .values(artistAlbumInserts)
        .onConflictDoNothing();

    // Insert tracks
    await db.insert(schema.tracks).values(trackInserts).onConflictDoNothing();

    // Insert artist-track relationships
    await db
        .insert(schema.artistTracks)
        .values(artistTrackInserts)
        .onConflictDoNothing();

    logger.info("Music entities inserted into database", {
        albumsInserted: albumInserts.length,
        artistsInserted: artistInserts.length,
        tracksInserted: trackInserts.length,
        artistAlbumRelationships: artistAlbumInserts.length,
        artistTrackRelationships: artistTrackInserts.length,
    });

    // Insert extended listening history
    for (const fileData of extendedFileDatas) {
        const userId = fileData.userId;

        const firstImportDate = new Date(fileData.data[0]!.ts);
        const lastImportDate = new Date(
            fileData.data[fileData.data.length - 1]!.ts,
        );

        // Delete any listening history entries that are between the first and last import dates
        // This is because the import is the "source of truth" straight from Spotify, and we want
        // to keep the most accurate data
        await db
            .delete(schema.listeningHistory)
            .where(
                and(
                    gte(schema.listeningHistory.playedAt, firstImportDate),
                    lte(schema.listeningHistory.playedAt, lastImportDate),
                    eq(schema.listeningHistory.userId, userId),
                    eq(schema.listeningHistory.imported, false),
                ),
            );

        const listeningHistoryInserts: ListeningHistoryInsertModel[] = [];

        for (const entry of fileData.data) {
            if (entry.type === "unknown") {
                logger.warn("Unknown entry type found", {
                    fileId: fileData.id,
                    userId: fileData.userId,
                    entry: entry,
                });
            }
            // Ignore podcast episodes
            if (entry.type !== "track") continue;

            // Ignore entries that are less than 20 seconds
            if (entry.ms_played < 20 * 1000) continue;

            const playedAt = new Date(entry.ts);

            listeningHistoryInserts.push({
                userId,
                trackId: entry.spotify_track_uri.split("spotify:track:")[1]!,
                playedAt,
                progressMs: entry.ms_played,
                imported: true,
            });
        }

        logger.info("Listening history prepared for file", {
            fileId: fileData.id,
            userId: fileData.userId,
            originalEntries: fileData.data.length,
            validEntries: listeningHistoryInserts.length,
            filteredOut: fileData.data.length - listeningHistoryInserts.length,
        });

        if (listeningHistoryInserts.length) {
            await db
                .insert(schema.listeningHistory)
                .values(listeningHistoryInserts)
                .onConflictDoNothing();
        } else {
            logger.warn("No valid listening history entries found", {
                fileId: fileData.id,
                userId: fileData.userId,
            });
        }

        // Set the processed flag to true
        await db
            .update(schema.streamingUploads)
            .set({
                processed: true,
            })
            .where(eq(schema.streamingUploads.id, fileData.id));
    }

    logger.info("Upload processing completed successfully", {
        totalFiles: files.length,
        processedFiles: extendedFileDatas.length,
        totalTracksProcessed: trackData.length,
    });

    return NextResponse.json({ success: true });
});
