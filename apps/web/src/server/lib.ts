import { ordinal } from "@/lib/utils";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { type clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
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

    const data = clerkTokenResponse.data[0];

    if (!data?.token) {
        return null;
    }

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
    endDate?: Date,
) {
    // Use provided end date or default to current date
    const effectiveEndDate = endDate ?? new Date();
    const effectiveEndDateString = effectiveEndDate.toISOString().split("T")[0];

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
                    lte(schema.listeningHistory.playedAt, effectiveEndDate),
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
                    lte(schema.listeningHistory.playedAt, effectiveEndDate),
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
                    lte(schema.listeningHistory.playedAt, effectiveEndDate),
                ),
            );
    } else {
        throw new Error("UNREACHABLE");
    }

    // 1. UserListenDates CTE
    const userListenDates = db
        .$with("user_listen_dates")
        // @ts-expect-error This works
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
            isExtendedToday:
                sql<boolean>`(${entityStreaks.streakEnd}) = ${effectiveEndDateString}::date`.as(
                    "is_extended_today",
                ),
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
                // Check if streak ended on the effective end date
                eq(
                    entityStreaks.streakEnd,
                    sql`${effectiveEndDateString}::date`,
                ),
                // Check if streak ended the day before the effective end date
                eq(
                    entityStreaks.streakEnd,
                    sql`(${effectiveEndDateString}::date - interval '1 day')::date`,
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
 * Get the overall listening streak for multiple users at once.
 * A streak is the number of consecutive days a user has listened to any music,
 * ending on the specified end date or the day before.
 *
 * @param userIds - An array of user IDs to calculate streaks for.
 * @param endDate - Optional end date to use for streak calculation. Defaults to current date.
 * @returns A Map where keys are user IDs and values are objects containing
 *          the streak length. Users with no current streak will not be included
 *          in the map.
 */
export async function getUsersOverallStreaks(
    userIds: string[],
    endDate?: Date,
): Promise<Map<string, { streakLength: number; isExtendedToday: boolean }>> {
    if (userIds.length === 0) {
        // Return early if no user IDs are provided
        return new Map();
    }

    // Use provided end date or default to current date
    const effectiveEndDate = endDate ?? new Date();
    const effectiveEndDateString = effectiveEndDate.toISOString().split("T")[0];

    // 1. Get all distinct dates each user has listened to music
    // We need the userId alongside the date now.
    const userListenDates = db.$with("user_listen_dates").as(
        db
            .selectDistinct({
                userId: schema.listeningHistory.userId, // Include userId
                uniqueDate:
                    sql<Date>`(${schema.listeningHistory.playedAt})::date`.as(
                        "unique_date",
                    ),
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    // Use inArray to check against multiple user IDs
                    inArray(schema.listeningHistory.userId, userIds),
                    gte(schema.listeningHistory.progressMs, 30 * 1000),
                    // Only consider listening history up to the effective end date
                    lte(schema.listeningHistory.playedAt, effectiveEndDate),
                ),
            ),
    );

    // 2. Rank the dates in sequence *for each user*
    // We need to partition the ranking by userId.
    const rankedDates = db.$with("ranked_dates").as(
        db
            .select({
                userId: userListenDates.userId, // Carry over userId
                uniqueDate: userListenDates.uniqueDate,
                rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${userListenDates.userId} ORDER BY ${userListenDates.uniqueDate})`.as(
                    "rn", // Rank within each user's dates
                ),
            })
            .from(userListenDates),
    );

    // 3. Group consecutive dates *for each user*
    // The grouping calculation remains the same, but it's now applied
    // per user because the rank (rn) is user-specific.
    const groupedDates = db.$with("grouped_dates").as(
        db
            .select({
                userId: rankedDates.userId, // Carry over userId
                uniqueDate: rankedDates.uniqueDate,
                grp: sql<Date>`(${rankedDates.uniqueDate} - (${rankedDates.rn} * interval '1 day'))::date`.as(
                    "grp", // Group key calculation
                ),
            })
            .from(rankedDates),
    );

    // 4. Calculate streak lengths *for each user*
    // We need to group by both the user ID and the group key.
    const streaks = db.$with("streaks").as(
        db
            .select({
                userId: groupedDates.userId, // Carry over userId
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
            .groupBy(groupedDates.userId, groupedDates.grp), // Group by user AND group key
    );

    // 5. Get the streaks for all relevant users that end today or yesterday
    const currentStreaks = await db
        .with(userListenDates, rankedDates, groupedDates, streaks)
        .select({
            userId: streaks.userId, // Select the userId
            streakLength: streaks.streakLength,
            streakEnd: streaks.streakEnd,
            isExtendedToday:
                sql<boolean>`(${streaks.streakEnd}) = ${effectiveEndDateString}::date`.as(
                    "is_extended_today",
                ),
        })
        .from(streaks)
        .where(
            or(
                // Check if streak ended on the effective end date
                eq(streaks.streakEnd, sql`${effectiveEndDateString}::date`),
                // Check if streak ended the day before the effective end date
                eq(
                    streaks.streakEnd,
                    sql`(${effectiveEndDateString}::date - interval '1 day')::date`,
                ),
            ),
        );
    // No need to order or limit here, we want all current streaks for the specified users.
    // If a user could theoretically have two streaks ending yesterday and today
    // (e.g., data inconsistency), this might return both. The original logic
    // implicitly preferred the one ending today. We can refine this if needed,
    // but usually, only one will match.

    // 6. Format the results into a Map
    const resultsMap = new Map<
        string,
        { streakLength: number; isExtendedToday: boolean }
    >();
    for (const streak of currentStreaks) {
        // If multiple streaks were found per user (unlikely but possible),
        // this logic will favor the one processed last. You could add logic
        // here to prioritize (e.g., prefer the one ending today if both exist).
        // For simplicity, we assume at most one relevant streak per user.
        resultsMap.set(streak.userId, {
            streakLength: streak.streakLength,
            isExtendedToday: streak.isExtendedToday,
        });
    }

    return resultsMap;
}
