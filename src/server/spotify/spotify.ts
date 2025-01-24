import { env } from "@/env";
import type {
    Albums,
    Artists,
    PlaybackState,
    SearchResults,
    Tracks,
} from "./types";
import { unstable_cacheLife as cacheLife } from "next/cache";

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
