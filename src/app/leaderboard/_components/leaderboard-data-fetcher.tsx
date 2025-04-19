import { computeStreak } from "@/lib/utils";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getUserFriends } from "@/server/lib";
import { and, desc, gte, inArray, lt, type SQL, sql } from "drizzle-orm";
import "server-only";

export type SortBy = "Playtime" | "Count" | "Streak";
export type Timeframe =
    | "Last 24 hours"
    | "Last 7 days"
    | "Last 30 days"
    | "All time";

export const sortByOptions = ["Playtime", "Count", "Streak"] as const;
export const timeframeOptions = [
    "Last 24 hours",
    "Last 7 days",
    "Last 30 days",
    "All time",
] as const;

export interface LeaderboardUserData {
    userId: string;
    metric: number;
    playtime?: number;
    count?: number;
    streak?: number;
    percentChange: number | null;
    rankChange: number | null;
    previousRank: number | null;
}

// Main function to get all leaderboard data with comparisons
export async function getLeaderboardData(
    userId: string,
    sortBy: SortBy,
    timeframe: Timeframe,
    page: number,
    limit: number,
): Promise<{
    userComparisons: LeaderboardUserData[];
    totalPages: number;
    currentPage: number;
}> {
    if (!userId) {
        throw new Error("Not authenticated");
    }

    // Get user's friends
    const friendIds = await getUserFriends(userId);

    // Include the current user in the filter
    const allowedUserIds = [userId, ...friendIds];

    // Current period filters
    const filters: SQL[] = [];

    // Set time filters based on timeframe
    let timeStart: Date | null = null;
    if (timeframe === "Last 7 days") {
        timeStart = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.push(gte(schema.listeningHistory.playedAt, timeStart));
    } else if (timeframe === "Last 30 days") {
        timeStart = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.push(gte(schema.listeningHistory.playedAt, timeStart));
    } else if (timeframe === "Last 24 hours") {
        timeStart = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        filters.push(gte(schema.listeningHistory.playedAt, timeStart));
    }

    // Previous period filters
    const prevFilters: SQL[] = [];
    if (timeStart) {
        const prevTimeSpan = timeStart.getTime() - new Date().getTime();
        const prevTimeStart = new Date(timeStart.getTime() + prevTimeSpan);
        prevFilters.push(
            gte(schema.listeningHistory.playedAt, prevTimeStart),
            lt(schema.listeningHistory.playedAt, timeStart),
        );
    }

    // Get streaks for all users
    // Fetch all listening history for allowed users
    const listens = await db
        .select({
            userId: schema.listeningHistory.userId,
            playedAt: schema.listeningHistory.playedAt,
        })
        .from(schema.listeningHistory)
        .where(inArray(schema.listeningHistory.userId, allowedUserIds))
        .orderBy(schema.listeningHistory.playedAt);

    // Organize dates by user
    const userDates = new Map<string, Set<string>>();

    listens.forEach(({ userId, playedAt }) => {
        const date = playedAt.toISOString().slice(0, 10);
        if (!userDates.has(userId)) {
            userDates.set(userId, new Set());
        }
        userDates.get(userId)!.add(date);
    });

    // Calculate streak for each user
    const userStreaks = new Map<string, number>();
    userDates.forEach((dates, userId) => {
        userStreaks.set(userId, computeStreak(dates));
    });

    // Set up metrics queries
    const playtimeQuery = sql<number>`sum(${schema.listeningHistory.progressMs}) / 1000`;
    const countQuery = sql<number>`count(*)`;
    const countFilters = [
        ...filters,
        gte(schema.listeningHistory.progressMs, 30 * 1000),
    ];
    const countPrevFilters =
        prevFilters.length > 0
            ? [
                  ...prevFilters,
                  gte(schema.listeningHistory.progressMs, 30 * 1000),
              ]
            : [];

    // Get total users count
    const countUsers = await db
        .select({
            count: sql<number>`count(distinct ${schema.listeningHistory.userId})`,
        })
        .from(schema.listeningHistory)
        .where(
            and(
                ...filters,
                inArray(schema.listeningHistory.userId, allowedUserIds),
            ),
        );
    const totalUsers = countUsers[0]!.count;
    const totalPages = Math.ceil(totalUsers / limit);

    // Adjust page number if needed
    const adjustedPage = Math.max(1, Math.min(page, totalPages || 1));
    const offset = (adjustedPage - 1) * limit;

    // Fetch user ids for the current page based on the sort metric
    let userIdsForPage: string[] = [];

    if (sortBy === "Streak") {
        // Sort users by streak
        const streakEntries = Array.from(userStreaks.entries());
        streakEntries.sort((a, b) => b[1] - a[1]); // Sort descending

        // Apply pagination
        userIdsForPage = streakEntries
            .slice(offset, offset + limit)
            .map(([userId]) => userId);
    } else {
        // Use the database to sort and paginate for other metrics
        const sortQuery =
            sortBy === "Count"
                ? [...countFilters] // For Count, add min 30s filter
                : [...filters]; // For Playtime, use regular filters

        // Choose the appropriate metric query
        const sortMetricQuery = sortBy === "Count" ? countQuery : playtimeQuery;

        const sortedUsers = await db
            .select({
                userId: schema.listeningHistory.userId,
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    ...sortQuery,
                    inArray(schema.listeningHistory.userId, allowedUserIds),
                ),
            )
            .groupBy(schema.listeningHistory.userId)
            .orderBy(desc(sortMetricQuery))
            .limit(limit)
            .offset(offset);

        userIdsForPage = sortedUsers.map((user) => user.userId);
    }

    if (userIdsForPage.length === 0) {
        return {
            userComparisons: [],
            totalPages,
            currentPage: adjustedPage,
        };
    }

    // Now fetch all metric data for these users
    // 1. Playtime data
    const playtimeData = await db
        .select({
            userId: schema.listeningHistory.userId,
            metric: playtimeQuery.as("metric"),
        })
        .from(schema.listeningHistory)
        .where(
            and(
                ...filters,
                inArray(schema.listeningHistory.userId, userIdsForPage),
            ),
        )
        .groupBy(schema.listeningHistory.userId);

    // 2. Count data
    const countData = await db
        .select({
            userId: schema.listeningHistory.userId,
            metric: countQuery.as("metric"),
        })
        .from(schema.listeningHistory)
        .where(
            and(
                ...countFilters,
                inArray(schema.listeningHistory.userId, userIdsForPage),
            ),
        )
        .groupBy(schema.listeningHistory.userId);

    // Create maps for easy lookup
    const playtimeMap = new Map(
        playtimeData.map((item) => [item.userId, Number(item.metric)]),
    );
    const countMap = new Map(
        countData.map((item) => [item.userId, Number(item.metric)]),
    );

    // Previous period data for comparisons
    let prevPlaytimeMap = new Map<string, number>();
    let prevCountMap = new Map<string, number>();

    if (prevFilters.length > 0) {
        // Fetch previous playtime data
        const prevPlaytimeData = await db
            .select({
                userId: schema.listeningHistory.userId,
                metric: playtimeQuery.as("metric"),
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    ...prevFilters,
                    inArray(schema.listeningHistory.userId, userIdsForPage),
                ),
            )
            .groupBy(schema.listeningHistory.userId);

        prevPlaytimeMap = new Map(
            prevPlaytimeData.map((item) => [item.userId, Number(item.metric)]),
        );

        // Fetch previous count data
        const prevCountData = await db
            .select({
                userId: schema.listeningHistory.userId,
                metric: countQuery.as("metric"),
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    ...countPrevFilters,
                    inArray(schema.listeningHistory.userId, userIdsForPage),
                ),
            )
            .groupBy(schema.listeningHistory.userId);

        prevCountMap = new Map(
            prevCountData.map((item) => [item.userId, Number(item.metric)]),
        );
    }

    // Combine all data for each user
    const userData = userIdsForPage.map((userId) => {
        // Get the metrics
        const playtime = playtimeMap.get(userId) ?? 0;
        const count = countMap.get(userId) ?? 0;
        const streak = userStreaks.get(userId) ?? 0;

        // Determine the primary metric based on sort option
        const metric =
            sortBy === "Playtime"
                ? playtime
                : sortBy === "Count"
                  ? count
                  : streak;

        // Get previous values for the sorted metric
        let previousValue = null;
        if (sortBy === "Playtime") {
            previousValue = prevPlaytimeMap.get(userId) ?? null;
        } else if (sortBy === "Count") {
            previousValue = prevCountMap.get(userId) ?? null;
        }
        // No previous value for streak since it's a current state

        // Calculate percentage change
        let percentChange = null;
        if (previousValue !== null && previousValue > 0) {
            percentChange = ((metric - previousValue) / previousValue) * 100;
        }

        return {
            userId,
            metric,
            playtime,
            count,
            streak,
            percentChange,
            rankChange: null, // We'll compute this later if we have previous ranks
            previousRank: null,
        };
    });

    // Implement previous rank logic if we have that data
    // For simplicity, we'll leave this as null for now as it requires more complex implementation

    return {
        userComparisons: userData,
        totalPages,
        currentPage: adjustedPage,
    };
}
