// POST /api/process-uploads
// This endpoint will trigger the refetching the potentially stale data for artists and albums

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getGlobalAccessToken, search } from "@/server/spotify/spotify";
import type { Track } from "@/server/spotify/types";
import { asc, eq, inArray, sql, type InferInsertModel, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

type ArtistInsertModel = InferInsertModel<typeof schema.artists>;
type AlbumInsertModel = InferInsertModel<typeof schema.albums>;
type ArtistAlbumInsertModel = InferInsertModel<typeof schema.artistAlbums>;
type TrackInsertModel = InferInsertModel<typeof schema.tracks>;
type ArtistTrackInsertModel = InferInsertModel<typeof schema.artistTracks>;
type ListeningHistoryInsertModel = InferInsertModel<
    typeof schema.listeningHistory
>;

export async function GET(request: Request) {
    if (env.NODE_ENV === "production") {
        // Return 404 in production
        return new Response("Not found", { status: 404 });
    }
    // Otherwise, send the response from POST
    return POST(request);
}

/*
To correctly schedule, we need to add the following cron jobs:

    5 *\/6 * * * curl -X POST -H "Authorization: Bearer [token]" https://[domain]/api/process-uploads

*/

const fileSchema = z.array(
    z.object({
        endTime: z.string(),
        artistName: z.string(),
        trackName: z.string(),
        msPlayed: z.number(),
    }),
);
type FileData = z.infer<typeof fileSchema>;

// When the environment is production, this endpoint will be protected by a bearer token
export async function POST(request: Request) {
    const headers = request.headers;
    const token = headers.get("Authorization");

    if (env.NODE_ENV === "production") {
        if (!token) {
            return new Response("Unauthorized", { status: 401 });
        }

        const bearerToken = token.split(" ")[1];

        if (bearerToken !== env.SYNC_ENDPOINT_TOKEN) {
            return new Response("Unauthorized", { status: 401 });
        }
    }

    // Get the app access token
    const accessToken = (await getGlobalAccessToken())!;

    // Get the files that have been uploaded
    const files = await db
        .select()
        .from(schema.streamingUploads)
        .where(eq(schema.streamingUploads.processed, false))
        .orderBy(asc(schema.streamingUploads.createdAt))
        .limit(10);

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

    console.log(`Finished fetching ${files.length} files`);

    if (files.length === 0) {
        return NextResponse.json({ success: true });
    }

    // Iterate through each file to get the full list of artist and track names
    const artistTracks = new Set<string>();
    const artists = new Set<string>();

    const fileDatas = [];

    for (const file of fileContents) {
        let fileData: FileData;
        try {
            fileData = fileSchema.parse(JSON.parse(file.text));
        } catch {
            // Skip the file if it's not valid
            await db
                .update(schema.streamingUploads)
                .set({
                    invalidFile: true,
                    processed: true,
                })
                .where(eq(schema.streamingUploads.id, file.id));
            continue;
        }

        for (const entry of fileData) {
            artistTracks.add(
                `[artist]:${entry.artistName} [track]:${entry.trackName}`,
            );
            artists.add(entry.artistName);
        }

        fileDatas.push({
            id: file.id,
            userId: file.userId,
            data: fileData,
        });
    }

    console.log(`Finished processing ${fileDatas.length} files`);

    // Handle inserting the tracks, albums, and artists

    interface TrackIds {
        trackId: string;
        artistId: string;
        albumId: string;
    }

    const idMapping = new Map<string, TrackIds>();

    const artistInserts: ArtistInsertModel[] = [];
    const albumInserts: AlbumInsertModel[] = [];
    const artistAlbumInserts: ArtistAlbumInsertModel[] = [];
    const trackInserts: TrackInsertModel[] = [];
    const artistTrackInserts: ArtistTrackInsertModel[] = [];

    console.log(`Found ${artistTracks.size} artist-track pairs`);

    // This query is fairly inefficient, however, compared to the length of time
    // to fetch all searches afterwards, it's not a huge deal.
    const dbState = await db
        .select({
            artistTrack:
                sql<string>`'[artist]:'||${schema.artists.name}||' '||'[track]:'||${schema.tracks.name}`.as(
                    "artistTrack",
                ),
            trackId: schema.tracks.id,
            artistId: schema.artists.id,
            albumId: schema.tracks.albumId,
        })
        .from(schema.tracks)
        .leftJoin(
            schema.artistTracks,
            eq(schema.tracks.id, schema.artistTracks.trackId),
        )
        .leftJoin(
            schema.artists,
            eq(schema.artistTracks.artistId, schema.artists.id),
        )
        .where(
            inArray(
                sql<string>`'[artist]:'||${schema.artists.name}||' '||'[track]:'||${schema.tracks.name}`,
                Array.from(artistTracks),
            ),
        );

    // Remove any dbState entries that have null values for any id
    const filteredDbState = dbState.filter(
        (entry) =>
            entry.trackId !== null &&
            entry.artistId !== null &&
            entry.albumId !== null,
    );

    // Remove entries from artistTracks that are in the dbState,
    // but also add the ids to the idMapping
    filteredDbState.forEach((entry) => {
        artistTracks.delete(entry.artistTrack);
        idMapping.set(entry.artistTrack, {
            trackId: entry.trackId,
            artistId: entry.artistId!,
            albumId: entry.albumId!,
        });
    });

    console.log(
        `Removed ${filteredDbState.length} entries from artistTracks, leaving only ${artistTracks.size}`,
    );

    const arrArtistTracks = Array.from(artistTracks);

    // Chunk the artist tracks into groups
    // TODO: using even a chunk size of 2 runs into rate limiting issues
    // can we somehow avoid rate limiting while using a larger chunk size?
    const CHUNK_SIZE = 1;
    const artistTracksChunks = Array.from(
        arrArtistTracks.reduce((acc, artistTrack) => {
            const chunkIndex = Math.floor(acc.length / CHUNK_SIZE);
            if (!acc[chunkIndex]) {
                acc[chunkIndex] = [];
            }
            acc[chunkIndex].push(artistTrack);
            return acc;
        }, [] as string[][]),
    );

    const fetchedData: { artistTrack: string; track: Track }[] = [];

    for (const artistTracksChunk of artistTracksChunks) {
        // Do a promise.all for each chunk
        const chunkPromises = artistTracksChunk.map(async (artistTrack) => {
            // Get the artist and track names:
            // artist follows "[artist]:name", and track follows "[track]:name"
            let trackResult;
            try {
                const artistName = artistTrack
                    .split(" [track]:")[0]!
                    .split("[artist]:")[1];
                const trackName = artistTrack.split(" [track]:")[1];
                trackResult = await search(
                    accessToken,
                    `track:${trackName} artist:${artistName}`,
                    "track",
                );
            } catch (e) {
                console.log("error", e);
                return null;
            }
            const track = trackResult?.tracks.items[0];
            if (!track) return null;

            return {
                artistTrack,
                track,
            };
        });

        const chunkResults = await Promise.all(chunkPromises);

        for (const result of chunkResults) {
            if (!result) continue;
            const { artistTrack, track } = result;
            fetchedData.push({
                artistTrack,
                track,
            });
        }
    }

    for (const entry of fetchedData) {
        const { artistTrack, track } = entry;

        const artist = track.artists[0]!;

        idMapping.set(artistTrack, {
            trackId: track.id,
            artistId: artist.id,
            albumId: track.album.id,
        });

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

    console.log(`Finished compiling tracks, albums, and artists`);
    console.log(
        `Lost: ${idMapping.size - artistTracks.size} entries while processing`,
    );

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

    console.log(
        `Finished inserting albums, artists, artist-album relationships, tracks, and artist-track relationships`,
    );

    // Finally, we can insert the listening history
    for (const fileData of fileDatas) {
        const userId = fileData.userId;

        // Get the first non-imported listening history entry for this user,
        // and only process imports before that date
        const firstListeningHistoryEntry = await db
            .select({
                userId: schema.listeningHistory.userId,
                playedAt: schema.listeningHistory.playedAt,
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    eq(schema.listeningHistory.userId, userId),
                    eq(schema.listeningHistory.imported, false),
                ),
            )
            .orderBy(asc(schema.listeningHistory.playedAt))
            .limit(1);
        const earliestDate = firstListeningHistoryEntry.length
            ? firstListeningHistoryEntry[0]!.playedAt
            : null;

        const listeningHistoryInserts: ListeningHistoryInsertModel[] = [];

        for (const entry of fileData.data) {
            // Ignore entries that are less than 20 seconds
            if (entry.msPlayed < 20 * 1000) continue;

            const ids = idMapping.get(
                `[artist]:${entry.artistName} [track]:${entry.trackName}`,
            );
            if (!ids) continue;
            const playedAt = new Date(
                new Date(entry.endTime).getTime() - entry.msPlayed,
            );
            if (earliestDate && playedAt < earliestDate) continue;

            listeningHistoryInserts.push({
                userId,
                trackId: ids.trackId,
                playedAt,
                progressMs: entry.msPlayed,
                imported: true,
            });
        }

        await db
            .insert(schema.listeningHistory)
            .values(listeningHistoryInserts)
            .onConflictDoNothing();

        // Set the processed flag to true
        await db
            .update(schema.streamingUploads)
            .set({
                processed: true,
            })
            .where(eq(schema.streamingUploads.id, fileData.id));
    }

    console.log(`Finished inserting listening history`);

    return NextResponse.json({ success: true });
}
