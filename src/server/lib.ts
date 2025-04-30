import { ordinal } from "@/lib/utils";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { type clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { unstable_cacheLife as cacheLife } from "next/cache";
import "server-only";

export function getBaseUrl() {
    const coolifyUrl = process.env.COOLIFY_URL;
    if (coolifyUrl) {
        // Check if there's a comma in the url, if so split and return the first part
        const commaIndex = coolifyUrl.indexOf(",");
        if (commaIndex !== -1) {
            return coolifyUrl.substring(0, commaIndex);
        }
        return coolifyUrl;
    } else {
        return "http://localhost:3000";
    }
}

export interface DateRange {
    from: Date;
    to: Date;
}

export function getTimeFilters(dateRange: DateRange) {
    const timeFilters = and(
        gte(schema.listeningHistory.playedAt, dateRange.from),
        lte(schema.listeningHistory.playedAt, dateRange.to),
    );

    return timeFilters;
}

export function getPrevDateRange(currRange: DateRange) {
    const dateDiff = Math.abs(
        currRange.to.getTime() - currRange.from.getTime(),
    );
    return {
        to: currRange.from,
        from: new Date(currRange.from.getTime() - dateDiff),
    } satisfies DateRange;
}

export async function setUserTracking(
    enabled: boolean,
    userId: string,
    spotifyId: string,
) {
    "use server";

    const dbUsers = await db
        .insert(schema.users)
        .values({
            id: userId,
            spotifyId: spotifyId,
            premiumUser: false,
            enabled,
        })
        .onConflictDoUpdate({
            target: schema.users.id,
            set: { enabled },
        })
        .returning();

    return dbUsers[0]!;
}

type ClerkClient = Awaited<ReturnType<typeof clerkClient>>;

export async function getSpotifyToken(apiClient: ClerkClient, userId: string) {
    const clerkTokenResponse = await apiClient.users.getUserOauthAccessToken(
        userId,
        "spotify",
    );

    if (!clerkTokenResponse.data) {
        return null;
    }

    const data = clerkTokenResponse.data[0]!;
    const accessToken = data.token;

    return accessToken;
}

export async function getSpotifyAccount(
    apiClient: ClerkClient,
    clerkUserId: string,
) {
    const userResponse = await apiClient.users.getUser(clerkUserId);

    const spotifyAccounts = userResponse.externalAccounts.filter(
        (account) => account.provider === "oauth_spotify",
    );

    if (!spotifyAccounts.length) {
        return null;
    }

    return spotifyAccounts[0]!;
}

export function chunkArray<T>(arr: T[], chunkSize: number) {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}

export async function usersAreFriends(user1Id: string, user2Id: string) {
    "use cache";

    cacheLife({
        stale: 10,
        revalidate: 10,
        expire: 10,
    });

    // Check if the target user is the friend of the user
    const friends = await db
        .select()
        .from(schema.friends)
        .where(
            and(
                eq(schema.friends.userId, user1Id),
                eq(schema.friends.friendId, user2Id),
                eq(schema.friends.status, "accepted"),
            ),
        );

    if (friends.length > 0) {
        return true;
    }

    return false;
}

export async function getUserFriends(userId: string) {
    "use cache";

    cacheLife({
        stale: 10,
        revalidate: 10,
        expire: 10,
    });

    // for development, just return all users
    if (process.env.NODE_ENV === "development") {
        const users = await db
            .select({
                id: schema.users.id,
            })
            .from(schema.users);

        return users.map((user) => user.id);
    }

    const friends = await db
        .select({
            friendId: schema.friends.friendId,
        })
        .from(schema.friends)
        .where(
            and(
                eq(schema.friends.userId, userId),
                eq(schema.friends.status, "accepted"),
            ),
        );

    return friends.map((friend) => friend.friendId);
}

export function calculateComparisons<
    TCurrent extends Record<string, unknown>,
    TPrev extends Record<string, unknown>,
    TValueKey extends string | number | symbol,
>(
    currentItems: Array<TCurrent>,
    previousItems: Array<TPrev>,
    idKey: keyof TCurrent & keyof TPrev,
    valueKey: TValueKey & keyof TCurrent & keyof TPrev,
) {
    return currentItems.map((item, currentIndex) => {
        // Find this item in previous period
        const prevItemIndex = previousItems.findIndex(
            // @ts-expect-error Based on usage, this is fine
            (prevItem) => prevItem[idKey] === item[idKey],
        );

        // Determine rank change
        const rankChange =
            prevItemIndex !== -1 ? prevItemIndex - currentIndex : null;

        // Determine value change
        const prevItem =
            prevItemIndex !== -1 ? previousItems[prevItemIndex] : null;
        const valueChange =
            prevItem &&
            typeof item[valueKey] === "number" &&
            typeof prevItem[valueKey] === "number"
                ? Number(prevItem[valueKey]) !== 0
                    ? ((Number(item[valueKey]) - Number(prevItem[valueKey])) /
                          Number(prevItem[valueKey])) *
                      100
                    : 0
                : null;

        return {
            ...item, // This preserves all properties from the current item
            rankChange,
            percentChange: valueChange,
            previousRank: prevItemIndex !== -1 ? prevItemIndex + 1 : null,
        };
    });
}

export function getRankChangeTooltip(
    rankChange: number | null,
    previousRank: number | null,
): string {
    if (rankChange === null || previousRank === null) return "";

    if (rankChange > 0) {
        return `Moved up ${rankChange} rank${rankChange !== 1 ? "s" : ""} from ${ordinal(previousRank)}`;
    } else if (rankChange < 0) {
        return `Moved down ${Math.abs(rankChange)} rank${Math.abs(rankChange) !== 1 ? "s" : ""} from ${ordinal(previousRank)}`;
    } else {
        return "Same rank as previous period";
    }
}

// Define the streak types
export type StreakType = "track" | "artist" | "album";

// Define the common structure for streak results
export interface StreakInfo {
    id: string; // Track ID, Artist ID, or Album ID
    name: string | null; // Track name, Artist name, or Album name
    imageUrl: string | null; // Image URL (album image for tracks/albums, artist image for artists)
    streakLength: number;
}

/**
 * Core function to get listening streaks for a user by track, artist, or album
 */
export async function getUserStreaks(
    targetUserId: string,
    limitCount: number,
    streakType: StreakType,
    // ): Promise<StreakInfo[]> {
) {
    // Define the appropriate columns and tables based on streak type
    let nameColumn;
    let imageUrlColumn;

    // Configure the query based on streak type
    if (streakType === "track") {
        // For tracks, we use track ID directly
        nameColumn = schema.tracks.name;
        imageUrlColumn = schema.albums.imageUrl;
    } else if (streakType === "artist") {
        // For artists, we need to join through artist_tracks
        nameColumn = schema.artists.name;
        imageUrlColumn = schema.artists.imageUrl;
    } else if (streakType === "album") {
        // For albums, we need to join through tracks to get album ID
        nameColumn = schema.albums.name;
        imageUrlColumn = schema.albums.imageUrl;
    } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Invalid streak type: ${streakType}`);
    }

    // --- Build the userListenDates CTE differently based on streak type ---
    let userListenDatesQuery;

    if (streakType === "track") {
        // For tracks - straightforward query from listening history
        userListenDatesQuery = db
            .selectDistinct({
                entityId: schema.listeningHistory.trackId,
                uniqueDate:
                    sql<Date>`(${schema.listeningHistory.playedAt})::date`.as(
                        "unique_date",
                    ),
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    eq(schema.listeningHistory.userId, targetUserId),
                    sql`${schema.listeningHistory.trackId} IS NOT NULL`,
                    gte(schema.listeningHistory.progressMs, 30 * 1000),
                ),
            );
    } else if (streakType === "artist") {
        // For artists - join through artist_tracks
        userListenDatesQuery = db
            .selectDistinct({
                entityId: schema.artistTracks.artistId,
                uniqueDate:
                    sql<Date>`(${schema.listeningHistory.playedAt})::date`.as(
                        "unique_date",
                    ),
            })
            .from(schema.listeningHistory)
            .innerJoin(
                schema.artistTracks,
                eq(
                    schema.listeningHistory.trackId,
                    schema.artistTracks.trackId,
                ),
            )
            .where(
                and(
                    eq(schema.listeningHistory.userId, targetUserId),
                    sql`${schema.artistTracks.artistId} IS NOT NULL`,
                    gte(schema.listeningHistory.progressMs, 30 * 1000),
                ),
            );
    } else if (streakType === "album") {
        // For albums - join through tracks
        userListenDatesQuery = db
            .selectDistinct({
                entityId: schema.tracks.albumId,
                uniqueDate:
                    sql<Date>`(${schema.listeningHistory.playedAt})::date`.as(
                        "unique_date",
                    ),
            })
            .from(schema.listeningHistory)
            .innerJoin(
                schema.tracks,
                eq(schema.listeningHistory.trackId, schema.tracks.id),
            )
            .where(
                and(
                    eq(schema.listeningHistory.userId, targetUserId),
                    sql`${schema.tracks.albumId} IS NOT NULL`,
                    gte(schema.listeningHistory.progressMs, 30 * 1000),
                ),
            );
    } else {
        throw new Error("UNREACHABLE");
    }

    // 1. UserListenDates CTE
    const userListenDates = db
        .$with("user_listen_dates")
        .as(userListenDatesQuery);

    // 2. RankedDates: Assign row numbers within each entity's date sequence
    const rankedDates = db.$with("ranked_dates").as(
        db
            .select({
                entityId: userListenDates.entityId,
                uniqueDate: userListenDates.uniqueDate,
                rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${userListenDates.entityId} ORDER BY ${userListenDates.uniqueDate})`.as(
                    "rn",
                ),
            })
            .from(userListenDates),
    );

    // 3. GroupedDates: Create the grouping value based on consecutive dates
    const groupedDates = db.$with("grouped_dates").as(
        db
            .select({
                entityId: rankedDates.entityId,
                uniqueDate: rankedDates.uniqueDate,
                grp: sql<Date>`${rankedDates.uniqueDate} - (${rankedDates.rn} * interval '1 day')`.as(
                    "grp",
                ),
            })
            .from(rankedDates),
    );

    // 4. EntityStreaks: Calculate the length of each consecutive streak
    const entityStreaks = db.$with("entity_streaks").as(
        db
            .select({
                entityId: groupedDates.entityId,
                streakLength: sql<number>`COUNT(*)`
                    .mapWith(Number)
                    .as("streak_length"),
                streakEnd: sql<Date>`MAX(${groupedDates.uniqueDate})`.as(
                    "streak_end",
                ),
            })
            .from(groupedDates)
            .groupBy(groupedDates.entityId, groupedDates.grp),
    );

    // --- Build final query with different joins based on streak type ---
    const baseQuery = db
        .with(userListenDates, rankedDates, groupedDates, entityStreaks)
        .select({
            id: entityStreaks.entityId,
            name: nameColumn,
            imageUrl: imageUrlColumn,
            streakLength: entityStreaks.streakLength,
        })
        .from(entityStreaks);

    // Add different joins based on streak type
    let joinedQuery;

    if (streakType === "track") {
        joinedQuery = baseQuery
            .leftJoin(
                schema.tracks,
                eq(entityStreaks.entityId, schema.tracks.id),
            )
            .leftJoin(
                schema.albums,
                eq(schema.tracks.albumId, schema.albums.id),
            );
    } else if (streakType === "artist") {
        joinedQuery = baseQuery.leftJoin(
            schema.artists,
            eq(entityStreaks.entityId, schema.artists.id),
        );
    } else if (streakType === "album") {
        joinedQuery = baseQuery.leftJoin(
            schema.albums,
            eq(entityStreaks.entityId, schema.albums.id),
        );
    } else {
        throw new Error("UNREACHABLE");
    }

    // Complete with filtering, grouping, ordering, and limit
    const topStreaks = await joinedQuery
        .where(
            or(
                // Check if streak ended today
                eq(entityStreaks.streakEnd, sql`CURRENT_DATE`),
                // Check if streak ended yesterday
                eq(
                    entityStreaks.streakEnd,
                    sql`(CURRENT_DATE - interval '1 day')::date`,
                ),
            ),
        )
        .groupBy(
            entityStreaks.entityId,
            nameColumn,
            imageUrlColumn,
            entityStreaks.streakLength,
            entityStreaks.streakEnd,
        )
        .orderBy(
            desc(entityStreaks.streakLength),
            desc(entityStreaks.streakEnd),
        )
        .limit(limitCount);

    return topStreaks;
}

/**
 * Get the overall listening streak for a user - the number of consecutive days
 * they have listened to any music, ending today or yesterday.
 *
 * @param targetUserId - The user ID to calculate the streak for
 * @returns An object containing the streak length or null if no current streak
 */
export async function getUserOverallStreak(
    targetUserId: string,
): Promise<{ streakLength: number } | null> {
    // 1. Get all distinct dates the user has listened to music
    const userListenDates = db.$with("user_listen_dates").as(
        db
            .selectDistinct({
                // No entity ID needed - we just care about dates
                uniqueDate:
                    sql<Date>`(${schema.listeningHistory.playedAt})::date`.as(
                        "unique_date",
                    ),
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    eq(schema.listeningHistory.userId, targetUserId),
                    gte(schema.listeningHistory.progressMs, 30 * 1000),
                ),
            ),
    );

    // 2. Rank the dates in sequence
    const rankedDates = db.$with("ranked_dates").as(
        db
            .select({
                uniqueDate: userListenDates.uniqueDate,
                rn: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userListenDates.uniqueDate})`.as(
                    "rn",
                ),
            })
            .from(userListenDates),
    );

    // 3. Group consecutive dates
    // The key difference: we don't partition by entity ID, just look at consecutive dates overall
    const groupedDates = db.$with("grouped_dates").as(
        db
            .select({
                uniqueDate: rankedDates.uniqueDate,
                grp: sql<Date>`${rankedDates.uniqueDate} - (${rankedDates.rn} * interval '1 day')`.as(
                    "grp",
                ),
            })
            .from(rankedDates),
    );

    // 4. Calculate streak lengths
    const streaks = db.$with("streaks").as(
        db
            .select({
                streakLength: sql<number>`COUNT(*)`
                    .mapWith(Number)
                    .as("streak_length"),
                streakStart: sql<Date>`MIN(${groupedDates.uniqueDate})`.as(
                    "streak_start",
                ),
                streakEnd: sql<Date>`MAX(${groupedDates.uniqueDate})`.as(
                    "streak_end",
                ),
            })
            .from(groupedDates)
            .groupBy(groupedDates.grp),
    );

    // 5. Get the streak that ends today or yesterday, ordered by most recent
    const currentStreak = await db
        .with(userListenDates, rankedDates, groupedDates, streaks)
        .select({
            streakLength: streaks.streakLength,
            streakEnd: streaks.streakEnd,
        })
        .from(streaks)
        .where(
            or(
                // Check if streak ended today
                eq(streaks.streakEnd, sql`CURRENT_DATE`),
                // Check if streak ended yesterday
                eq(
                    streaks.streakEnd,
                    sql`(CURRENT_DATE - interval '1 day')::date`,
                ),
            ),
        )
        .orderBy(desc(streaks.streakEnd)) // Most recent first - today before yesterday
        .limit(1); // Just get the most recent streak

    // Return the streak length or null if no current streak
    if (currentStreak.length === 0) {
        return null;
    }

    return {
        streakLength: currentStreak[0]!.streakLength,
    };
}
