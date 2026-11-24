import { unstable_rethrow } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getSpotifyReconnectState } from "@/server/spotify-connection";
import { SpotifyReconnectBanner } from "./spotify-reconnect-banner";

/**
 * Shown under the navigation to signed-in users whose Spotify access has
 * expired, so their listening is no longer being recorded.
 */
export async function SpotifyReconnectNotice() {
    let userId;
    try {
        ({ userId } = await auth());
    } catch (error) {
        // Requests for file-like paths skip Clerk's middleware, so auth()
        // throws on their 404 pages. Nobody there needs the notice.
        unstable_rethrow(error);
        return null;
    }
    if (!userId) {
        return null;
    }

    let state;
    try {
        state = await getSpotifyReconnectState(userId);
    } catch (error) {
        // Never break the page over the notice.
        console.error("Could not check the Spotify connection:", error);
        return null;
    }
    if (!state) {
        return null;
    }

    return <SpotifyReconnectBanner since={formatSince(state.lastListenAt)} />;
}

function formatSince(date: Date | null) {
    if (!date) {
        return null;
    }
    const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: sameYear ? undefined : "numeric",
        timeZone: "UTC",
    }).format(date);
}
