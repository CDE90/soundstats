import { db } from "../db";
import {
    getGlobalAccessToken,
    getSeveralAlbums,
    getSeveralArtists,
} from "@soundstats/spotify";
import type { SimplifiedAlbum, Image } from "@soundstats/spotify";
import * as schema from "@soundstats/database";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { env } from "../env";

export async function refetchStaleData() {
    try {
        console.log("Starting stale data refetch...");

        // Get the app access token
        const accessToken = await getGlobalAccessToken(
            env.SPOTIFY_CLIENT_ID,
            env.SPOTIFY_CLIENT_SECRET,
        );
        if (!accessToken) {
            throw new Error("Failed to get global access token");
        }

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

        console.log(`Processing ${staleArtists.length} stale artists...`);

        // Fetch the updated versions of the artists from Spotify
        const updatedArtists = await getSeveralArtists(
            accessToken,
            staleArtists.map((artist) => artist.id),
        );

        // Update the artists in the database
        await Promise.all(
            (updatedArtists?.artists ?? []).map(async (artist) => {
                // Find the image with the largest width
                let primaryImage: Image | null = null;
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
                        updatedAt: new Date(),
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

        console.log(`Processing ${staleAlbums.length} stale albums...`);

        const updatedAlbums: SimplifiedAlbum[] = [];

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
                let primaryImage: Image | null = null;
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
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.albums.id, album.id));
            }),
        );

        console.log("Stale data refetch completed successfully");
    } catch (error) {
        console.error("Error during stale data refetch:", error);
    }
}
