"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
    users,
    invites,
    friends,
    listeningHistory,
    tracks,
    artists,
    albums,
    artistTracks,
} from "@/server/db/schema";
import { eq, inArray, desc, count, sum, sql, and, gte } from "drizzle-orm";
import { checkAdminAccess } from "./check-admin";
import { clerkClient } from "@clerk/nextjs/server";

export async function updateUserStatus(userId: string, enabled: boolean) {
    await checkAdminAccess();

    await db.update(users).set({ enabled }).where(eq(users.id, userId));

    revalidatePath("/admin");
}

export async function updateUserPremium(userId: string, premiumUser: boolean) {
    await checkAdminAccess();

    await db.update(users).set({ premiumUser }).where(eq(users.id, userId));

    revalidatePath("/admin");
}

export async function updateUserAdmin(userId: string, isAdmin: boolean) {
    const currentUserId = await checkAdminAccess();

    // Prevent admin from removing their own admin status
    if (userId === currentUserId && !isAdmin) {
        throw new Error("Cannot remove your own admin privileges");
    }

    await db.update(users).set({ isAdmin }).where(eq(users.id, userId));

    revalidatePath("/admin");
}

export async function getUsers() {
    await checkAdminAccess();

    const dbUsers = await db
        .select({
            id: users.id,
            spotifyId: users.spotifyId,
            premiumUser: users.premiumUser,
            enabled: users.enabled,
            isAdmin: users.isAdmin,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(users.createdAt);

    // Get Clerk user details
    const apiClient = await clerkClient();
    const userIds = dbUsers.map((user) => user.id);

    // Fetch in batches of 500 (Clerk limit)
    const clerkUsers = [];
    for (let i = 0; i < userIds.length; i += 500) {
        const batch = userIds.slice(i, i + 500);
        const { data } = await apiClient.users.getUserList({
            userId: batch,
            limit: 500,
        });
        clerkUsers.push(...data);
    }

    const clerkUserMap = new Map(clerkUsers.map((user) => [user.id, user]));

    return dbUsers.map((user) => {
        const clerkUser = clerkUserMap.get(user.id);
        return {
            ...user,
            firstName: clerkUser?.firstName,
            lastName: clerkUser?.lastName,
            emailAddress: clerkUser?.emailAddresses?.[0]?.emailAddress,
            imageUrl: clerkUser?.imageUrl,
        };
    });
}

export async function getInvites() {
    await checkAdminAccess();

    const rawInvites = await db
        .select({
            id: invites.id,
            code: invites.code,
            name: invites.name,
            status: invites.status,
            maxUses: invites.maxUses,
            currentUses: invites.currentUses,
            expiresAt: invites.expiresAt,
            createdAt: invites.createdAt,
            createdBy: invites.createdBy,
            createdByUser: {
                spotifyId: users.spotifyId,
            },
        })
        .from(invites)
        .leftJoin(users, eq(invites.createdBy, users.id))
        .orderBy(invites.createdAt);

    // Get Clerk user details for invite creators
    const apiClient = await clerkClient();
    const creatorIds = rawInvites
        .map((invite) => invite.createdBy)
        .filter(Boolean);

    const clerkUsers = [];
    if (creatorIds.length > 0) {
        for (let i = 0; i < creatorIds.length; i += 500) {
            const batch = creatorIds.slice(i, i + 500);
            const { data } = await apiClient.users.getUserList({
                userId: batch,
                limit: 500,
            });
            clerkUsers.push(...data);
        }
    }

    const clerkUserMap = new Map(clerkUsers.map((user) => [user.id, user]));

    return rawInvites.map((invite) => {
        const clerkUser = clerkUserMap.get(invite.createdBy);
        return {
            ...invite,
            id: invite.id.toString(),
            createdByUser: invite.createdByUser
                ? {
                      ...invite.createdByUser,
                      firstName: clerkUser?.firstName,
                      lastName: clerkUser?.lastName,
                      emailAddress:
                          clerkUser?.emailAddresses?.[0]?.emailAddress,
                  }
                : null,
        };
    });
}

export async function updateInviteStatus(
    inviteId: string,
    status: "active" | "disabled" | "expired",
) {
    await checkAdminAccess();

    await db
        .update(invites)
        .set({ status })
        .where(eq(invites.id, BigInt(inviteId)));

    revalidatePath("/admin");
}

export async function getFriendships() {
    await checkAdminAccess();

    const rawFriendships = await db
        .select({
            id: friends.id,
            status: friends.status,
            createdAt: friends.createdAt,
            userId: friends.userId,
            friendId: friends.friendId,
        })
        .from(friends)
        .orderBy(friends.createdAt);

    return rawFriendships.map((friendship) => ({
        ...friendship,
        id: friendship.id.toString(),
    }));
}

export async function getFriendshipsWithUsers() {
    await checkAdminAccess();

    const friendshipsData = await db
        .select({
            id: friends.id,
            status: friends.status,
            createdAt: friends.createdAt,
            userId: friends.userId,
            friendId: friends.friendId,
        })
        .from(friends)
        .orderBy(friends.createdAt);

    // For accepted friendships, deduplicate by keeping only one per unique pair
    // For pending/rejected, keep all (they're meaningful one-way relationships)
    const processedFriendships = [];
    const seenAcceptedPairs = new Set<string>();

    for (const friendship of friendshipsData) {
        if (friendship.status === "accepted") {
            // Create a consistent pair key (smaller ID first)
            const pairKey =
                friendship.userId < friendship.friendId
                    ? `${friendship.userId}-${friendship.friendId}`
                    : `${friendship.friendId}-${friendship.userId}`;

            if (!seenAcceptedPairs.has(pairKey)) {
                seenAcceptedPairs.add(pairKey);
                processedFriendships.push(friendship);
            }
        } else {
            // Show all pending/rejected requests (they're one-way and meaningful)
            processedFriendships.push(friendship);
        }
    }

    // Get user data separately to avoid join complexity
    const userIds = [
        ...new Set([
            ...processedFriendships.map((f) => f.userId),
            ...processedFriendships.map((f) => f.friendId),
        ]),
    ];

    const usersData = await db
        .select({
            id: users.id,
            spotifyId: users.spotifyId,
        })
        .from(users)
        .where(inArray(users.id, userIds));

    // Get Clerk user details
    const apiClient = await clerkClient();
    const clerkUsers = [];
    for (let i = 0; i < userIds.length; i += 500) {
        const batch = userIds.slice(i, i + 500);
        const { data } = await apiClient.users.getUserList({
            userId: batch,
            limit: 500,
        });
        clerkUsers.push(...data);
    }

    const clerkUserMap = new Map(clerkUsers.map((user) => [user.id, user]));
    const userMap = new Map(usersData.map((u) => [u.id, u]));

    return processedFriendships.map((friendship) => {
        const user = userMap.get(friendship.userId);
        const friend = userMap.get(friendship.friendId);
        const clerkUser = clerkUserMap.get(friendship.userId);
        const clerkFriend = clerkUserMap.get(friendship.friendId);

        return {
            ...friendship,
            id: friendship.id.toString(),
            user: user
                ? {
                      ...user,
                      firstName: clerkUser?.firstName,
                      lastName: clerkUser?.lastName,
                      emailAddress:
                          clerkUser?.emailAddresses?.[0]?.emailAddress,
                  }
                : undefined,
            friend: friend
                ? {
                      ...friend,
                      firstName: clerkFriend?.firstName,
                      lastName: clerkFriend?.lastName,
                      emailAddress:
                          clerkFriend?.emailAddresses?.[0]?.emailAddress,
                  }
                : undefined,
        };
    });
}

// Analytics Functions

export async function getListeningActivityStats() {
    await checkAdminAccess();

    try {
        const [
            totalListensResult,
            totalListeningTimeResult,
            avgSessionResult,
            activeUsersResult,
            dailyActivityResult,
        ] = await Promise.all([
            // Total number of listens
            db.select({ count: count() }).from(listeningHistory),

            // Total listening time in milliseconds
            db
                .select({
                    totalMs: sum(listeningHistory.progressMs).mapWith(Number),
                })
                .from(listeningHistory),

            // Average session duration
            db
                .select({
                    avgMs: sql<number>`AVG(${listeningHistory.progressMs})::INTEGER`,
                })
                .from(listeningHistory),

            // Active users in last 7 days
            db
                .select({
                    count: sql<number>`COUNT(DISTINCT ${listeningHistory.userId})`,
                })
                .from(listeningHistory)
                .where(
                    gte(
                        listeningHistory.playedAt,
                        sql`NOW() - INTERVAL '7 days'`,
                    ),
                ),

            // Daily activity for last 30 days
            db
                .select({
                    date: sql<string>`DATE(${listeningHistory.playedAt})`,
                    count: count(),
                    totalMs: sum(listeningHistory.progressMs).mapWith(Number),
                })
                .from(listeningHistory)
                .where(
                    gte(
                        listeningHistory.playedAt,
                        sql`NOW() - INTERVAL '30 days'`,
                    ),
                )
                .groupBy(sql`DATE(${listeningHistory.playedAt})`)
                .orderBy(sql`DATE(${listeningHistory.playedAt})`),
        ]);

        return {
            totalListens: totalListensResult[0]?.count ?? 0,
            totalListeningHours:
                Math.round(
                    ((totalListeningTimeResult[0]?.totalMs ?? 0) /
                        (1000 * 60 * 60)) *
                        10,
                ) / 10,
            avgSessionMinutes:
                Math.round(
                    ((avgSessionResult[0]?.avgMs ?? 0) / (1000 * 60)) * 10,
                ) / 10,
            activeUsersWeek: activeUsersResult[0]?.count ?? 0,
            dailyActivity: dailyActivityResult,
        };
    } catch (error) {
        console.error("Error fetching listening activity stats:", error);
        return {
            totalListens: 0,
            totalListeningHours: 0,
            avgSessionMinutes: 0,
            activeUsersWeek: 0,
            dailyActivity: [],
        };
    }
}

export async function getTopContentStats() {
    await checkAdminAccess();

    try {
        const [
            topTracksResult,
            topArtistsResult,
            topAlbumsResult,
            completionRateResult,
        ] = await Promise.all([
            // Top tracks by play count
            db
                .select({
                    trackId: listeningHistory.trackId,
                    trackName: tracks.name,
                    playCount: count(),
                    totalListeningMs: sum(listeningHistory.progressMs).mapWith(
                        Number,
                    ),
                })
                .from(listeningHistory)
                .leftJoin(tracks, eq(listeningHistory.trackId, tracks.id))
                .groupBy(listeningHistory.trackId, tracks.name)
                .orderBy(desc(count()))
                .limit(10),

            // Top artists by total listening time
            db
                .select({
                    artistId: artists.id,
                    artistName: artists.name,
                    playCount: count(),
                    totalListeningMs: sum(listeningHistory.progressMs).mapWith(
                        Number,
                    ),
                })
                .from(listeningHistory)
                .leftJoin(tracks, eq(listeningHistory.trackId, tracks.id))
                .leftJoin(artistTracks, eq(tracks.id, artistTracks.trackId))
                .leftJoin(artists, eq(artistTracks.artistId, artists.id))
                .where(eq(artistTracks.isPrimaryArtist, true))
                .groupBy(artists.id, artists.name)
                .orderBy(desc(sum(listeningHistory.progressMs)))
                .limit(10),

            // Top albums by play count
            db
                .select({
                    albumId: albums.id,
                    albumName: albums.name,
                    playCount: count(),
                    totalListeningMs: sum(listeningHistory.progressMs).mapWith(
                        Number,
                    ),
                })
                .from(listeningHistory)
                .leftJoin(tracks, eq(listeningHistory.trackId, tracks.id))
                .leftJoin(albums, eq(tracks.albumId, albums.id))
                .where(sql`${albums.id} IS NOT NULL`)
                .groupBy(albums.id, albums.name)
                .orderBy(desc(count()))
                .limit(10),

            // Overall completion rate
            db
                .select({
                    avgCompletion: sql<number>`AVG(
                CASE 
                    WHEN ${tracks.durationMs} > 0 
                    THEN (${listeningHistory.progressMs}::FLOAT / ${tracks.durationMs}) * 100
                    ELSE 0 
                END
            )::INTEGER`,
                })
                .from(listeningHistory)
                .leftJoin(tracks, eq(listeningHistory.trackId, tracks.id))
                .where(
                    and(
                        sql`${tracks.durationMs} > 0`,
                        sql`${listeningHistory.progressMs} > 0`,
                    ),
                ),
        ]);

        return {
            topTracks: topTracksResult,
            topArtists: topArtistsResult,
            topAlbums: topAlbumsResult,
            avgCompletionRate: completionRateResult[0]?.avgCompletion ?? 0,
        };
    } catch (error) {
        console.error("Error fetching top content stats:", error);
        return {
            topTracks: [],
            topArtists: [],
            topAlbums: [],
            avgCompletionRate: 0,
        };
    }
}

export async function getUserBehaviorStats() {
    await checkAdminAccess();

    try {
        const [topUsersResult, premiumVsRegularResult, userActivityResult] =
            await Promise.all([
                // Top users by listening time
                db
                    .select({
                        userId: listeningHistory.userId,
                        userSpotifyId: users.spotifyId,
                        isPremium: users.premiumUser,
                        playCount: count(),
                        totalListeningMs: sum(
                            listeningHistory.progressMs,
                        ).mapWith(Number),
                    })
                    .from(listeningHistory)
                    .leftJoin(users, eq(listeningHistory.userId, users.id))
                    .groupBy(
                        listeningHistory.userId,
                        users.spotifyId,
                        users.premiumUser,
                    )
                    .orderBy(desc(sum(listeningHistory.progressMs)))
                    .limit(10),

                // Premium vs regular user listening patterns - fixed to count unique users
                db
                    .select({
                        isPremium: users.premiumUser,
                        userCount: sql<number>`COUNT(DISTINCT ${users.id})`,
                        totalListeningMs: sum(
                            listeningHistory.progressMs,
                        ).mapWith(Number),
                    })
                    .from(listeningHistory)
                    .leftJoin(users, eq(listeningHistory.userId, users.id))
                    .where(sql`${users.id} IS NOT NULL`)
                    .groupBy(users.premiumUser),

                // User activity distribution - real data with buckets (last 30 days)
                db
                    .select({
                        userId: listeningHistory.userId,
                        totalListeningMs: sum(
                            listeningHistory.progressMs,
                        ).mapWith(Number),
                    })
                    .from(listeningHistory)
                    .where(
                        gte(
                            listeningHistory.playedAt,
                            sql`NOW() - INTERVAL '30 days'`,
                        ),
                    )
                    .groupBy(listeningHistory.userId)
                    .then((userTotals) => {
                        const buckets = [
                            { bucket: "< 5 hours", userCount: 0 },
                            { bucket: "5-25 hours", userCount: 0 },
                            { bucket: "25-75 hours", userCount: 0 },
                            { bucket: "75-150 hours", userCount: 0 },
                            { bucket: "150+ hours", userCount: 0 },
                        ];

                        userTotals.forEach((user) => {
                            const hours =
                                (user.totalListeningMs ?? 0) / (1000 * 60 * 60);
                            if (hours < 5) {
                                buckets[0]!.userCount++;
                            } else if (hours < 25) {
                                buckets[1]!.userCount++;
                            } else if (hours < 75) {
                                buckets[2]!.userCount++;
                            } else if (hours < 150) {
                                buckets[3]!.userCount++;
                            } else {
                                buckets[4]!.userCount++;
                            }
                        });

                        return buckets;
                    }),
            ]);

        // Get Clerk user details for top users
        const apiClient = await clerkClient();
        const topUserIds = topUsersResult.map((user) => user.userId);

        const clerkUsers = [];
        if (topUserIds.length > 0) {
            for (let i = 0; i < topUserIds.length; i += 500) {
                const batch = topUserIds.slice(i, i + 500);
                const { data } = await apiClient.users.getUserList({
                    userId: batch,
                    limit: 500,
                });
                clerkUsers.push(...data);
            }
        }

        const clerkUserMap = new Map(clerkUsers.map((user) => [user.id, user]));

        // Enhance top users with Clerk data
        const enhancedTopUsers = topUsersResult.map((user) => {
            const clerkUser = clerkUserMap.get(user.userId);
            return {
                ...user,
                firstName: clerkUser?.firstName,
                lastName: clerkUser?.lastName,
                emailAddress: clerkUser?.emailAddresses?.[0]?.emailAddress,
            };
        });

        return {
            topUsers: enhancedTopUsers,
            premiumVsRegular: premiumVsRegularResult,
            userActivityDistribution: userActivityResult,
        };
    } catch (error) {
        console.error("Error fetching user behavior stats:", error);
        return {
            topUsers: [],
            premiumVsRegular: [],
            userActivityDistribution: [
                { bucket: "< 5 hours", userCount: 0 },
                { bucket: "5-25 hours", userCount: 0 },
                { bucket: "25-75 hours", userCount: 0 },
                { bucket: "75-150 hours", userCount: 0 },
                { bucket: "150+ hours", userCount: 0 },
            ],
        };
    }
}

export async function getPlatformGrowthStats() {
    await checkAdminAccess();

    try {
        const [userGrowthResult, listeningGrowthResult, contentGrowthResult] =
            await Promise.all([
                // User growth over time (last 90 days)
                db
                    .select({
                        date: sql<string>`DATE(${users.createdAt})`,
                        newUsers: count(),
                    })
                    .from(users)
                    .where(
                        gte(users.createdAt, sql`NOW() - INTERVAL '90 days'`),
                    )
                    .groupBy(sql`DATE(${users.createdAt})`)
                    .orderBy(sql`DATE(${users.createdAt})`),

                // Listening activity growth (last 90 days)
                db
                    .select({
                        date: sql<string>`DATE(${listeningHistory.playedAt})`,
                        totalListens: count(),
                        uniqueUsers: sql<number>`COUNT(DISTINCT ${listeningHistory.userId})`,
                    })
                    .from(listeningHistory)
                    .where(
                        gte(
                            listeningHistory.playedAt,
                            sql`NOW() - INTERVAL '90 days'`,
                        ),
                    )
                    .groupBy(sql`DATE(${listeningHistory.playedAt})`)
                    .orderBy(sql`DATE(${listeningHistory.playedAt})`),

                // Content library stats - simplified
                Promise.all([
                    db.select({ count: count() }).from(tracks),
                    db.select({ count: count() }).from(artists),
                    db.select({ count: count() }).from(albums),
                    db
                        .select({ count: count() })
                        .from(tracks)
                        .where(
                            gte(
                                tracks.createdAt,
                                sql`NOW() - INTERVAL '30 days'`,
                            ),
                        ),
                    db
                        .select({ count: count() })
                        .from(artists)
                        .where(
                            gte(
                                artists.createdAt,
                                sql`NOW() - INTERVAL '30 days'`,
                            ),
                        ),
                    db
                        .select({ count: count() })
                        .from(albums)
                        .where(
                            gte(
                                albums.createdAt,
                                sql`NOW() - INTERVAL '30 days'`,
                            ),
                        ),
                ]).then(
                    ([
                        tracks,
                        artists,
                        albums,
                        recentTracks,
                        recentArtists,
                        recentAlbums,
                    ]) => ({
                        totalTracks: tracks[0]?.count ?? 0,
                        totalArtists: artists[0]?.count ?? 0,
                        totalAlbums: albums[0]?.count ?? 0,
                        recentTracks: recentTracks[0]?.count ?? 0,
                        recentArtists: recentArtists[0]?.count ?? 0,
                        recentAlbums: recentAlbums[0]?.count ?? 0,
                    }),
                ),
            ]);

        return {
            userGrowth: userGrowthResult,
            listeningGrowth: listeningGrowthResult,
            contentGrowth: contentGrowthResult,
        };
    } catch (error) {
        console.error("Error fetching platform growth stats:", error);
        return {
            userGrowth: [],
            listeningGrowth: [],
            contentGrowth: {
                totalTracks: 0,
                totalArtists: 0,
                totalAlbums: 0,
                recentTracks: 0,
                recentArtists: 0,
                recentAlbums: 0,
            },
        };
    }
}
