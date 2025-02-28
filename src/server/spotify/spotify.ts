import { env } from "@/env";
import { clerkClient } from "@clerk/nextjs/server";
import { unstable_cacheLife as cacheLife } from "next/cache";
import { getSpotifyToken } from "../lib";
import type {
    Albums,
    Artists,
    PlaybackState,
    SearchResults,
    Tracks,
    RecentlyPlayedTracksPage,
    PlayHistory,
} from "./types";

export async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryFetch(
    url: string,
    init?: RequestInit,
    maxRetries = 3,
) {
    const response = await fetch(url, init);

    if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") ?? "1";
        const retryAfterSeconds = parseInt(retryAfter);
        console.debug(
            `Retrying fetch after ${retryAfterSeconds} seconds due to 429 Too Many Requests`,
        );
        await delay(retryAfterSeconds * 1000);

        // Retry the request up to a maximum of n times
        if (maxRetries > 0) {
            return retryFetch(url, init, maxRetries - 1);
        }
    }

    return response;
}

export async function getGlobalAccessToken() {
    const response = await retryFetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
                ).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(
            `getGlobalAccessToken: HTTP error! status: ${response.status}`,
        );
    }

    if (response.status !== 200) {
        return null;
    }

    const responseJson = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
    };

    return responseJson.access_token;
}

export async function getCurrentlyPlaying(accessToken: string) {
    "use cache";

    cacheLife({
        stale: 10,
        revalidate: 10,
        expire: 10,
    });

    const response = await retryFetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(
            `getCurrentlyPlaying: HTTP error! status: ${response.status}`,
        );
    }

    if (response.status !== 200) {
        return null;
    }

    const responseJson = (await response.json()) as PlaybackState;

    return responseJson;
}

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

export async function getSeveralArtists(accessToken: string, ids: string[]) {
    // Check if there are more than 50 ids
    if (ids.length > 50) {
        throw new Error("Too many ids");
    }

    const response = await retryFetch(
        `https://api.spotify.com/v1/artists?ids=${ids.join(",")}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(
            `getSeveralArtists: HTTP error! status: ${response.status}`,
        );
    }

    if (response.status !== 200) {
        return null;
    }

    const responseJson = (await response.json()) as Artists;

    return responseJson;
}

export async function getSeveralAlbums(accessToken: string, ids: string[]) {
    // Check if there are more than 20 ids
    if (ids.length > 20) {
        throw new Error("Too many ids");
    }

    const response = await retryFetch(
        `https://api.spotify.com/v1/albums?ids=${ids.join(",")}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(
            `getSeveralAlbums: HTTP error! status: ${response.status}`,
        );
    }

    if (response.status !== 200) {
        return null;
    }

    const responseJson = (await response.json()) as Albums;

    return responseJson;
}

export async function getSeveralTracks(accessToken: string, ids: string[]) {
    // Check if there are more than 50 ids
    if (ids.length > 50) {
        throw new Error("Too many ids");
    }

    const response = await retryFetch(
        `https://api.spotify.com/v1/tracks?ids=${ids.join(",")}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(
            `getSeveralArtists: HTTP error! status: ${response.status}`,
        );
    }

    if (response.status !== 200) {
        return null;
    }

    const responseJson = (await response.json()) as Tracks;

    return responseJson;
}

export async function search<const T extends "album" | "artist" | "track">(
    accessToken: string,
    query: string,
    type: T,
) {
    const response = await retryFetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
            query,
        )}&type=${type}&limit=1`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(`search: HTTP error! status: ${response.status}`);
    }

    if (response.status !== 200) {
        return null;
    }

    const responseJson = (await response.json()) as SearchResults<[T]>;

    return responseJson;
}

// export async function getRecentlyPlayedTracks(
//     accessToken: string,
//     days = 30,
// ): Promise<PlayHistory[]> {
//     // "use cache";

//     // cacheLife({
//     //     stale: 60, // Higher values since this is historical data
//     //     revalidate: 60,
//     //     expire: 60,
//     // });

//     // Calculate timestamp for 30 days ago in milliseconds
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);
//     const timestamp = thirtyDaysAgo.getTime();

//     let allTracks: PlayHistory[] = [];
//     let currentBefore: string | null = null;
//     let hasMoreTracks = true;

//     while (hasMoreTracks) {
//         // Build URL with parameters
//         let url =
//             "https://api.spotify.com/v1/me/player/recently-played?limit=50";

//         // For the first request, use the 'after' timestamp to get tracks after 30 days ago
//         // For subsequent requests, use the 'before' cursor for pagination
//         if (!currentBefore) {
//             url += `&after=${timestamp}`;
//         } else {
//             url += `&before=${currentBefore}`;
//         }

//         console.log(`getRecentlyPlayedTracks: url: ${url}`);

//         const response = await retryFetch(url, {
//             headers: {
//                 Authorization: `Bearer ${accessToken}`,
//             },
//         });

//         // Handle invalid status codes
//         if (!response.ok) {
//             throw new Error(
//                 `getRecentlyPlayedTracks: HTTP error! status: ${response.status}`,
//             );
//         }

//         const data = (await response.json()) as RecentlyPlayedTracksPage;

//         // Add tracks to our collection
//         allTracks = [...allTracks, ...data.items];

//         // If we have a next URL and we still haven't reached tracks from 30 days ago
//         if (data.next && data.cursors?.before) {
//             currentBefore = data.cursors.before;

//             // Check if the oldest track in this batch is still within our 30-day window
//             if (!data.items.length) {
//                 hasMoreTracks = false;
//                 continue;
//             }
//             const oldestTrackTime = new Date(
//                 data.items[data.items.length - 1]!.played_at,
//             ).getTime();
//             if (oldestTrackTime < timestamp) {
//                 hasMoreTracks = false;
//             }
//         } else {
//             hasMoreTracks = false;
//         }
//     }

//     // Filter out any tracks that might be older than our target date
//     return allTracks.filter((item) => {
//         const playedAt = new Date(item.played_at).getTime();
//         return playedAt >= timestamp;
//     });
// }

export async function getRecentlyPlayedTracks(
    accessToken: string,
    days = 30,
): Promise<PlayHistory[]> {
    // "use cache";

    // cacheLife({
    //     stale: 60,
    //     revalidate: 60,
    //     expire: 60,
    // });

    // Calculate timestamp for days ago in milliseconds
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();

    let allTracks: PlayHistory[] = [];
    let beforeCursor: string | null = null;
    let reachedCutoff = false;
    let consecutiveEmptyResponses = 0;
    const maxConsecutiveEmptyResponses = 3; // Safeguard against infinite loops

    // For logging/debugging
    console.log(
        `getRecentlyPlayedTracks: cutoff date: ${cutoffDate.toISOString()}`,
    );

    while (
        !reachedCutoff &&
        consecutiveEmptyResponses < maxConsecutiveEmptyResponses
    ) {
        // Build URL with parameters
        let url =
            "https://api.spotify.com/v1/me/player/recently-played?limit=50";

        if (beforeCursor) {
            url += `&before=${beforeCursor}`;
        }

        // Log URL for debugging
        console.log(`getRecentlyPlayedTracks: url: ${url}`);

        const response = await retryFetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        // Handle invalid status codes
        if (!response.ok) {
            throw new Error(
                `getRecentlyPlayedTracks: HTTP error! status: ${response.status}`,
            );
        }

        const data = (await response.json()) as RecentlyPlayedTracksPage;

        if (data.items.length === 0) {
            consecutiveEmptyResponses++;
            console.log(
                `getRecentlyPlayedTracks: received empty response (${consecutiveEmptyResponses}/${maxConsecutiveEmptyResponses})`,
            );
            continue;
        } else {
            consecutiveEmptyResponses = 0;
        }

        // Add tracks to our collection
        allTracks = [...allTracks, ...data.items];

        // Check if we've reached the cutoff
        const oldestTrackInBatch = data.items[data.items.length - 1]!;
        const oldestTrackTime = new Date(
            oldestTrackInBatch.played_at,
        ).getTime();

        console.log(
            `getRecentlyPlayedTracks: oldest track in batch: ${new Date(oldestTrackTime).toISOString()}`,
        );

        if (oldestTrackTime < cutoffTimestamp) {
            console.log(
                `getRecentlyPlayedTracks: reached cutoff date, stopping pagination`,
            );
            reachedCutoff = true;
        } else if (data.cursors?.before) {
            // Continue pagination using the 'before' cursor
            beforeCursor = data.cursors.before;
            console.log(
                `getRecentlyPlayedTracks: continuing with cursor: ${beforeCursor}`,
            );
        } else {
            // No more 'before' cursor, we've reached the end of available data
            console.log(
                `getRecentlyPlayedTracks: no more cursors available, stopping pagination`,
            );
            reachedCutoff = true;
        }
    }

    console.log(
        `getRecentlyPlayedTracks: total tracks fetched: ${allTracks.length}`,
    );

    // We don't need to filter here - if we've reached the cutoff date, we want to include all tracks
    // that we've retrieved, even if some are older than the cutoff

    return allTracks;
}
