import type { PlaybackState } from "./types";

export async function getCurrentlyPlaying(accessToken: string) {
    const response = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    // Handle invalid status codes
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseJson = (await response.json()) as PlaybackState;

    return responseJson;
}
