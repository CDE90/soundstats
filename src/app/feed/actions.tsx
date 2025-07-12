"use server";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getUserFriends } from "@/server/lib";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { unstable_cacheLife as cacheLife } from "next/cache";

export interface RecentListen {
    id: string;
    user: string;
    avatar?: string;
    song: string;
    artist: string;
    timestamp: number;
    albumImage?: string;
    trackId?: string;
}

async function getRecentListensInner(
    offset: number,
    limit: number,
    allowedUserIds: string[],
) {
    "use cache";

    cacheLife("minutes");

    const recentListens = await db
        .select({
            id: schema.listeningHistory.id,
            userId: schema.listeningHistory.userId,
            trackName: schema.tracks.name,
            artistName: schema.artists.name,
            playedAt: schema.listeningHistory.playedAt,
            albumImage: schema.albums.imageUrl,
            trackId: schema.tracks.id,
        })
        .from(schema.listeningHistory)
        .leftJoin(
            schema.tracks,
            eq(schema.listeningHistory.trackId, schema.tracks.id),
        )
        .leftJoin(
            schema.artistTracks,
            eq(schema.tracks.id, schema.artistTracks.trackId),
        )
        .leftJoin(
            schema.artists,
            eq(schema.artistTracks.artistId, schema.artists.id),
        )
        .leftJoin(schema.albums, eq(schema.tracks.albumId, schema.albums.id))
        .where(
            and(
                eq(schema.artistTracks.isPrimaryArtist, true),
                // Only include listens from the last 24 hours
                sql`date_part('day', now() - ${schema.listeningHistory.playedAt}) = 0`,
                gte(
                    // Only include listens that are at least 30 seconds long
                    schema.listeningHistory.progressMs,
                    30 * 1000,
                ),
                // Only include the current user and their friends
                inArray(schema.listeningHistory.userId, allowedUserIds),
            ),
        )
        .orderBy(desc(schema.listeningHistory.playedAt))
        .limit(limit)
        .offset(offset);

    const userIds = recentListens.map((listen) => listen.userId);

    // Get the Clerk client
    const apiClient = await clerkClient();

    const { data: users } = await apiClient.users.getUserList({
        userId: userIds,
        limit: limit,
    });

    return recentListens.map((listen) => {
        const user = users.find((user) => user.id === listen.userId);

        return {
            id: listen.id.toString(),
            user: user?.firstName ?? "Unknown",
            avatar: user?.imageUrl,
            song: listen.trackName ?? "Unknown",
            artist: listen.artistName ?? "Unknown",
            timestamp: listen.playedAt.getTime(),
            albumImage: listen.albumImage ?? undefined,
            trackId: listen.trackId ?? undefined,
        };
    });
}

export async function getRecentListens(
    offset: number,
    limit: number,
    filteredUserIds?: string[],
): Promise<RecentListen[]> {
    // Get the current user ID
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
        return [];
    }

    let allowedUserIds: string[];

    if (filteredUserIds && filteredUserIds.length > 0) {
        // Check for special "none selected" case
        if (filteredUserIds.length === 1 && filteredUserIds[0] === "__none__") {
            // Return empty array to show no results
            allowedUserIds = [];
        } else {
            // Use the filtered user IDs, but ensure current user and their friends are valid
            const friendIds = await getUserFriends(currentUserId);
            const validUserIds = [currentUserId, ...friendIds];

            // Only allow filtered IDs that are valid (current user or friends)
            allowedUserIds = filteredUserIds.filter((id) =>
                validUserIds.includes(id),
            );

            // If no valid filtered IDs, fall back to all valid users
            if (allowedUserIds.length === 0) {
                allowedUserIds = validUserIds;
            }
        }
    } else {
        // Get the user's friends
        const friendIds = await getUserFriends(currentUserId);
        // Include the current user and their friends
        allowedUserIds = [currentUserId, ...friendIds];
    }

    return getRecentListensInner(offset, limit, allowedUserIds);
}
