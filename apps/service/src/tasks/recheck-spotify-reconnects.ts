import { getSpotifyToken } from "@soundstats/spotify";
import * as schema from "@soundstats/database";
import { and, eq, isNotNull } from "drizzle-orm";
import { clerkClient } from "../clerk.js";
import { db } from "../db.js";
import type { CronResult } from "../metrics.js";

let isRechecking = false;

/**
 * Safety net for users waiting to reconnect Spotify. The web app clears the
 * flag when a flagged user visits with a working token, but that check can
 * fail (Clerk unavailable) or never run (the user signed in again somewhere
 * the notice didn't render). Here every flagged user's token is tried again,
 * one at a time to stay gentle on Clerk, and polling resumes for any that
 * work.
 */
export async function recheckSpotifyReconnects(): Promise<CronResult> {
    if (isRechecking) {
        return "skipped";
    }

    isRechecking = true;
    try {
        const flagged = await db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(
                and(
                    eq(schema.users.enabled, true),
                    isNotNull(schema.users.spotifyReconnectRequiredAt),
                ),
            );

        let recovered = 0;
        for (const user of flagged) {
            if (!(await hasWorkingToken(user.id))) {
                continue;
            }
            await db
                .update(schema.users)
                .set({ spotifyReconnectRequiredAt: null })
                .where(eq(schema.users.id, user.id));
            recovered++;
        }

        console.log(
            `Spotify reconnect check: ${recovered} of ${flagged.length} waiting users can be polled again`,
        );
        return "ok";
    } catch (error) {
        console.error("Error during Spotify reconnect check:", error);
        return "error";
    } finally {
        isRechecking = false;
    }
}

async function hasWorkingToken(userId: string) {
    try {
        return Boolean(await getSpotifyToken(clerkClient, userId));
    } catch {
        return false;
    }
}
