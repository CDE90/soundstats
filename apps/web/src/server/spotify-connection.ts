import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { listeningHistory, users } from "@/server/db/schema";

export interface SpotifyReconnectState {
    /** The last listen recorded by polling, if any. */
    lastListenAt: Date | null;
}

/**
 * Returns what the reconnect notice needs when the worker has stopped polling
 * this user because Spotify rejected their grant, or null when tracking is
 * fine. A flagged user who has since signed in again (or reconnected) has a
 * working token; the flag is cleared then, and polling resumes on the next
 * run.
 */
export async function getSpotifyReconnectState(
    userId: string,
): Promise<SpotifyReconnectState | null> {
    const [user] = await db
        .select({
            enabled: users.enabled,
            reconnectRequiredAt: users.spotifyReconnectRequiredAt,
        })
        .from(users)
        .where(eq(users.id, userId));

    if (!user?.enabled || !user.reconnectRequiredAt) {
        return null;
    }

    if (await hasWorkingSpotifyToken(userId)) {
        await db
            .update(users)
            .set({ spotifyReconnectRequiredAt: null })
            .where(eq(users.id, userId));
        return null;
    }

    const [lastListen] = await db
        .select({ playedAt: listeningHistory.playedAt })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                eq(listeningHistory.imported, false),
            ),
        )
        .orderBy(desc(listeningHistory.playedAt))
        .limit(1);

    return { lastListenAt: lastListen?.playedAt ?? null };
}

async function hasWorkingSpotifyToken(userId: string) {
    try {
        const apiClient = await clerkClient();
        const response = await apiClient.users.getUserOauthAccessToken(
            userId,
            "spotify",
        );
        return Boolean(response.data[0]?.token);
    } catch {
        // Still expired, or Clerk is unavailable: keep showing the notice.
        return false;
    }
}
