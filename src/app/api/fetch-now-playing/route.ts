import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { unstable_cacheLife as cacheLife } from "next/cache";
import { getCurrentlyPlaying } from "@/server/spotify/spotify";
import { getSpotifyToken } from "@/server/lib";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const givenUserId = searchParams.get("userId");

    let userId;

    if (givenUserId) {
        userId = givenUserId;
    } else {
        const { userId: clerkUserId } = await auth();

        if (!clerkUserId) {
            return new Response("Unauthorized", { status: 401 });
        }
        userId = clerkUserId;
    }

    const currentlyPlaying = await getNowPlaying(userId);

    return NextResponse.json({ userId, currentlyPlaying });
}

async function getNowPlaying(userId: string) {
    "use cache";

    cacheLife({
        stale: 20,
        revalidate: 20,
        expire: 20,
    });

    let currentlyPlaying;

    try {
        // Get Clerk API client
        const apiClient = await clerkClient();

        // Get the user's Spotify access token
        const spotifyAccessToken = await getSpotifyToken(apiClient, userId);

        if (!spotifyAccessToken) return null;

        // Get the currently playing track
        currentlyPlaying = await getCurrentlyPlaying(spotifyAccessToken);

        if (!currentlyPlaying?.is_playing) return null;
    } catch (e) {
        console.error(e);
        return null;
    }

    if (!currentlyPlaying.item || currentlyPlaying.item.type === "episode")
        return null;

    return currentlyPlaying;
}
