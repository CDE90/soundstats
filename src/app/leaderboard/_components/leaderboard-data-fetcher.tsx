import { computeStreak } from "@/lib/utils";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { calculateComparisons, getUserFriends } from "@/server/lib";
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

    // Handle streak sort option differently
    if (sortBy === "Streak") {
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
        const userStreaks = Array.from(userDates.entries()).map(
            ([userId, dates]) => {
                return {
                    userId,
                    metric: computeStreak(dates),
                };
            },
        );

        // Sort by streak (descending)
        userStreaks.sort((a, b) => b.metric - a.metric);

        // Pagination
        const totalUsers = userStreaks.length;
        const totalPages = Math.ceil(totalUsers / limit);
        const adjustedPage = Math.max(1, Math.min(page, totalPages || 1));
        const offset = (adjustedPage - 1) * limit;

        // Get current page data
        const paginatedUsers = userStreaks.slice(offset, offset + limit);

        // Not implementing previous comparison for streaks since it's a current state metric
        const userComparisons = paginatedUsers.map((user) => ({
            ...user,
            percentChange: null,
            rankChange: null,
            previousRank: null,
        }));

        return {
            userComparisons,
            totalPages,
            currentPage: adjustedPage,
        };
    }

    // For Playtime and Count options - original implementation
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

    // Set up metric query based on sort option
    let metricQuery;
    if (sortBy === "Playtime") {
        metricQuery = sql<number>`sum(${schema.listeningHistory.progressMs}) / 1000`;
    } else {
        metricQuery = sql<number>`count(*)`;
        filters.push(gte(schema.listeningHistory.progressMs, 30 * 1000));
        if (prevFilters.length > 0) {
            prevFilters.push(
                gte(schema.listeningHistory.progressMs, 30 * 1000),
            );
        }
    }

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

    // Fetch current period data
    const leaderboardUsers = await db
        .select({
            userId: schema.listeningHistory.userId,
            metric: metricQuery.as("metric"),
        })
        .from(schema.listeningHistory)
        .where(
            and(
                ...filters,
                inArray(schema.listeningHistory.userId, allowedUserIds),
            ),
        )
        .groupBy(schema.listeningHistory.userId)
        .orderBy(desc(metricQuery))
        .limit(limit)
        .offset(offset);

    // Ensure metric is a number in each result
    const currentPeriodData = leaderboardUsers.map((user) => ({
        ...user,
        metric: Number(user.metric),
    }));

    // Fetch previous period data for comparison
    let previousPeriodData: { userId: string; metric: number }[] = [];

    if (prevFilters.length > 0) {
        const prevLeaderboardUsers = await db
            .select({
                userId: schema.listeningHistory.userId,
                metric: metricQuery.as("metric"),
            })
            .from(schema.listeningHistory)
            .where(
                and(
                    ...prevFilters,
                    inArray(schema.listeningHistory.userId, allowedUserIds),
                ),
            )
            .groupBy(schema.listeningHistory.userId)
            .orderBy(desc(metricQuery));

        // Ensure metric is a number in each result
        previousPeriodData = prevLeaderboardUsers.map((user) => ({
            ...user,
            metric: Number(user.metric),
        }));
    }

    // Calculate comparisons between periods
    const userComparisons = calculateComparisons(
        currentPeriodData,
        previousPeriodData,
        "userId",
        "metric",
    );

    return {
        userComparisons,
        totalPages,
        currentPage: adjustedPage,
    };
}
