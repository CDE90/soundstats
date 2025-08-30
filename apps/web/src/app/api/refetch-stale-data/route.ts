// POST /api/refetch-stale-data
// This endpoint will trigger the refetching the potentially stale data for artists and albums

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
    getGlobalAccessToken,
    getSeveralAlbums,
    getSeveralArtists,
} from "@/server/spotify/spotify";
import type { Album, Image } from "@/server/spotify/types";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

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

    0 *\/6 * * * curl -X POST -H "Authorization: Bearer [token]" https://[domain]/api/refetch-stale-data

*/

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

    // Fetch artists, prioritizing those without images first, then by update date
    const staleArtists = await db
        .select()
        .from(schema.artists)
        .orderBy(
            // First, order by whether imageUrl is null (nulls first)
            desc(isNull(schema.artists.imageUrl)),
            // Then by last update date
            asc(schema.artists.updatedAt),
        )
        .limit(50);

    // Fetch the updated versions of the artists from Spotify
    const updatedArtists = await getSeveralArtists(
        accessToken,
        staleArtists.map((artist) => artist.id),
    );

    // Update the artists in the database
    await Promise.all(
        (updatedArtists?.artists ?? []).map(async (artist) => {
            // Find the image with the largest width
            let primaryImage = null as Image | null;
            if (artist.images.length) {
                const initialValue = artist.images[0]!;
                primaryImage = artist.images.reduce(
                    (prev, curr) => (prev.width > curr.width ? prev : curr),
                    initialValue,
                );
            }

            await db
                .update(schema.artists)
                .set({
                    name: artist.name,
                    imageUrl: primaryImage?.url,
                })
                .where(eq(schema.artists.id, artist.id));
        }),
    );

    // Fetch albums, prioritizing those without images first, then by update date
    const staleAlbums = await db
        .select()
        .from(schema.albums)
        .orderBy(
            // First, order by whether imageUrl is null (nulls first)
            desc(isNull(schema.albums.imageUrl)),
            // Then by last update date
            asc(schema.albums.updatedAt),
        )
        .limit(50);

    const updatedAlbums: Album[] = [];

    const albumChunkSize = 20;
    for (let i = 0; i < staleAlbums.length; i += albumChunkSize) {
        const chunk = staleAlbums.slice(i, i + albumChunkSize);
        const chunkIds = chunk.map((album) => album.id);
        const chunkUpdatedAlbums = await getSeveralAlbums(
            accessToken,
            chunkIds,
        );
        updatedAlbums.push(...(chunkUpdatedAlbums?.albums ?? []));
    }

    // Update the albums in the database
    await Promise.all(
        updatedAlbums.map(async (album) => {
            // Find the image with the largest width
            let primaryImage = null as Image | null;
            if (album.images.length) {
                const initialValue = album.images[0]!;
                primaryImage = album.images.reduce(
                    (prev, curr) => (prev.width > curr.width ? prev : curr),
                    initialValue,
                );
            }

            await db
                .update(schema.albums)
                .set({
                    name: album.name,
                    albumType: album.album_type,
                    releaseDate: new Date(album.release_date),
                    totalTracks: album.total_tracks,
                    imageUrl: primaryImage?.url,
                })
                .where(eq(schema.albums.id, album.id));
        }),
    );

    return NextResponse.json({ success: true });
}
