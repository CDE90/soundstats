import type { ClerkClient } from "@clerk/backend";
import type {
    Albums,
    Artists,
    PlaybackState,
    SearchResults,
    Tracks,
} from "./types.js";

export async function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryFetch(
    url: string,
    init?: RequestInit,
    maxRetries = 3,
) {
    const timeoutMs = 10_000;

    for (let attempt = 0; ; attempt++) {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = init?.signal
            ? AbortSignal.any([init.signal, timeoutSignal])
            : timeoutSignal;

        try {
            const response = await fetch(url, { ...init, signal });
            const canRetry = response.status === 429 || response.status >= 500;

            if (!canRetry || attempt >= maxRetries) {
                return response;
            }

            const retryAfterHeader = response.headers.get("Retry-After");
            const retryAfter = retryAfterHeader
                ? Number(retryAfterHeader)
                : Number.NaN;
            const backoffMs = Math.min(1_000 * 2 ** attempt, 10_000);
            const waitMs =
                Number.isFinite(retryAfter) && retryAfter >= 0
                    ? Math.min(retryAfter * 1_000, 30_000)
                    : backoffMs;

            console.debug(
                `Retrying Spotify request in ${waitMs}ms after HTTP ${response.status}`,
            );
            await delay(waitMs);
        } catch (error) {
            if (init?.signal?.aborted || attempt >= maxRetries) {
                throw error;
            }

            const waitMs = Math.min(1_000 * 2 ** attempt, 10_000);
            console.debug(
                `Retrying Spotify request in ${waitMs}ms after a network error`,
            );
            await delay(waitMs);
        }
    }
}

export async function getGlobalAccessToken(
    clientId: string,
    clientSecret: string,
) {
    const response = await retryFetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${clientId}:${clientSecret}`,
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

export async function getSpotifyToken(
    clerkClientInstance: ClerkClient,
    userId: string,
) {
    try {
        const clerkTokenResponse =
            await clerkClientInstance.users.getUserOauthAccessToken(
                userId,
                "spotify",
            );

        if (!clerkTokenResponse.data) {
            return null;
        }

        const data = clerkTokenResponse.data[0];

        if (!data?.token) {
            return null;
        }

        const accessToken = data.token;

        return accessToken;
    } catch (error) {
        console.error(`Error getting Spotify token for user ${userId}:`, error);
        return null;
    }
}

export async function getUserPlaying(
    clerkClientInstance: ClerkClient,
    userId: string,
) {
    // Get the user's Spotify access token
    const spotifyAccessToken = await getSpotifyToken(
        clerkClientInstance,
        userId,
    );

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
            `getSeveralTracks: HTTP error! status: ${response.status}`,
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
