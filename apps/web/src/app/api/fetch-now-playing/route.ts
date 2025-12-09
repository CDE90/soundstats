import { getUserPlaying } from "@/server/spotify/spotify";
import { auth } from "@clerk/nextjs/server";
import { cacheLife } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
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
        currentlyPlaying = await getUserPlaying(userId);

        if (!currentlyPlaying?.is_playing) return null;
    } catch (e) {
        console.error(e);
        return null;
    }

    if (!currentlyPlaying.item || currentlyPlaying.item.type === "episode")
        return null;

    return currentlyPlaying;
}
