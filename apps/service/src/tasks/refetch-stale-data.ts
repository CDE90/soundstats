import { db } from "../db.js";
import type { CronResult } from "../metrics.js";
import {
    getGlobalAccessToken,
    getSeveralAlbums,
    getSeveralArtists,
} from "@soundstats/spotify";
import type { Album, Image } from "@soundstats/spotify";
import * as schema from "@soundstats/database";
import { asc, desc, eq, isNull } from "drizzle-orm";
import { env } from "../env.js";

let isRefetchingStaleData = false;

/** The widest image, or null when there are none. */
function largestImage(images: Image[] | null | undefined): Image | null {
    if (!images?.length) {
        return null;
    }
    return images.reduce((prev, curr) =>
        prev.width > curr.width ? prev : curr,
    );
}

/**
 * Spotify's release date ("1999", "1999-05" or "1999-05-21"), or undefined to
 * keep the stored one. Placeholder albums come back as "0000", which parses
 * to year 0 and Postgres rejects.
 */
function releaseDate(value: string | null | undefined) {
    if (!value) {
        return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1
        ? undefined
        : date;
}

/**
 * Runs every update even if some fail, so one bad row can't stall the queue,
 * and logs the failures. Returns how many failed.
 */
async function settleUpdates(kind: string, updates: Promise<unknown>[]) {
    const results = await Promise.allSettled(updates);
    const failures = results.filter(
        (result): result is PromiseRejectedResult =>
            result.status === "rejected",
    );
    if (failures.length) {
        console.error(
            `Could not update ${failures.length} of ${results.length} stale ${kind}; first error:`,
            failures[0]!.reason,
        );
    }
    return failures.length;
}

export async function refetchStaleData(): Promise<CronResult> {
    if (isRefetchingStaleData) {
        console.warn("Skipping overlapping stale data refetch");
        return "skipped";
    }

    isRefetchingStaleData = true;
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

        // Fetch the updated versions of the artists from Spotify. The
        // response is in request order, with null for IDs Spotify no longer
        // knows.
        const artistIds = staleArtists.map((artist) => artist.id);
        const updatedArtists = await getSeveralArtists(accessToken, artistIds);
        // No response at all (not a 200): leave the artists for next time.
        const fetchedArtists = updatedArtists
            ? artistIds.map((_, index) => updatedArtists.artists[index] ?? null)
            : [];

        // Update the artists in the database
        const artistFailures = await settleUpdates(
            "artists",
            fetchedArtists.map(async (artist, index) => {
                const id = artistIds[index]!;
                await db
                    .update(schema.artists)
                    .set(
                        artist
                            ? {
                                  name: artist.name || undefined,
                                  imageUrl: largestImage(artist.images)?.url,
                                  updatedAt: new Date(),
                              }
                            : // Unknown to Spotify: move it to the back of
                              // the queue so it doesn't block the others.
                              { updatedAt: new Date() },
                    )
                    .where(eq(schema.artists.id, id));
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

        const albumIds = staleAlbums.map((album) => album.id);
        // null: unknown to Spotify. undefined: its chunk got no response, so
        // leave it for next time.
        const fetchedAlbums: (Album | null | undefined)[] = [];

        const albumChunkSize = 20;
        for (let i = 0; i < albumIds.length; i += albumChunkSize) {
            const chunkIds = albumIds.slice(i, i + albumChunkSize);
            const chunkUpdatedAlbums = await getSeveralAlbums(
                accessToken,
                chunkIds,
            );
            for (let j = 0; j < chunkIds.length; j++) {
                fetchedAlbums.push(
                    chunkUpdatedAlbums
                        ? (chunkUpdatedAlbums.albums[j] ?? null)
                        : undefined,
                );
            }
        }

        // Update the albums in the database
        const albumFailures = await settleUpdates(
            "albums",
            albumIds.map(async (id, index) => {
                const album = fetchedAlbums[index];
                if (album === undefined) {
                    return;
                }
                await db
                    .update(schema.albums)
                    .set(
                        album
                            ? {
                                  // Placeholders have an empty name.
                                  name: album.name || undefined,
                                  albumType: album.album_type || undefined,
                                  releaseDate: releaseDate(album.release_date),
                                  totalTracks: album.total_tracks,
                                  imageUrl: largestImage(album.images)?.url,
                                  updatedAt: new Date(),
                              }
                            : { updatedAt: new Date() },
                    )
                    .where(eq(schema.albums.id, id));
            }),
        );

        if (artistFailures || albumFailures) {
            return "error";
        }
        console.log("Stale data refetch completed successfully");
        return "ok";
    } catch (error) {
        console.error("Error during stale data refetch:", error);
        return "error";
    } finally {
        isRefetchingStaleData = false;
    }
}
