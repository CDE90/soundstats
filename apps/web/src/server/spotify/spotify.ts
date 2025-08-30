import { env } from "@/env";
import { clerkClient } from "@clerk/nextjs/server";
import { unstable_cacheLife as cacheLife } from "next/cache";
import "server-only";
import { getSpotifyToken } from "../lib";
import {
    delay,
    retryFetch,
    getGlobalAccessToken as getGlobalAccessTokenShared,
    getCurrentlyPlaying,
    getSeveralArtists,
    getSeveralAlbums,
    getSeveralTracks,
    search,
} from "@soundstats/spotify";

// Wrapper function that uses environment variables
export async function getGlobalAccessToken() {
    return getGlobalAccessTokenShared(
        env.SPOTIFY_CLIENT_ID,
        env.SPOTIFY_CLIENT_SECRET,
    );
}

// Re-export the shared functions for backward compatibility
export { delay, retryFetch, getCurrentlyPlaying };

export async function getUserPlaying(userId: string) {
    "use cache";

    cacheLife({
        stale: 10,
        revalidate: 10,
        expire: 10,
    });

    // Get Clerk API client
    const apiClient = await clerkClient();

    // Get the user's Spotify access token
    const spotifyAccessToken = await getSpotifyToken(apiClient, userId);

    if (!spotifyAccessToken) return null;

    // Get the currently playing track
    const currentlyPlaying = await getCurrentlyPlaying(spotifyAccessToken);

    return currentlyPlaying;
}

// Re-export the other functions
export { getSeveralArtists, getSeveralAlbums, getSeveralTracks, search };
