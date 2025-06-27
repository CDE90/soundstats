import { getUserPlaying } from "@/server/spotify/spotify";
import { auth } from "@clerk/nextjs/server";
import { unstable_cacheLife as cacheLife } from "next/cache";
import { NextResponse } from "next/server";
import { logger, withAxiom } from "@/lib/axiom/server";

export const GET = withAxiom(async () => {
    const { userId } = await auth();

    if (!userId) {
        logger.warn("Unauthorized fetch now playing request", {
            endpoint: "/api/fetch-now-playing",
            reason: "no_user_id",
        });
        return new Response("Unauthorized", { status: 401 });
    }

    const currentlyPlaying = await getNowPlaying(userId);

    logger.info("Now playing data fetched", {
        userId: userId,
        hasData: !!currentlyPlaying,
        isPlaying: currentlyPlaying?.is_playing ?? false,
        trackType: currentlyPlaying?.item?.type,
    });

    return NextResponse.json({ userId, currentlyPlaying });
});

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
        logger.error("Failed to fetch Spotify now playing data", {
            userId,
            error: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined,
        });
        return null;
    }

    if (!currentlyPlaying.item || currentlyPlaying.item.type === "episode")
        return null;

    return currentlyPlaying;
}
