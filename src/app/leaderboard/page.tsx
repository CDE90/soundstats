import { PercentageBadge } from "@/components/percentage-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableHeadRow,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/utils";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
    calculateComparisons,
    getBaseUrl,
    getRankChangeTooltip,
    getUserFriends,
} from "@/server/lib";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, desc, gte, inArray, lt, type SQL, sql } from "drizzle-orm";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientSearchParamsDropdown } from "./ClientDropdown";

const sortByOptions = ["Playtime", "Count"] as const;
const timeframeOptions = [
    "Last 24 hours",
    "Last 7 days",
    "Last 30 days",
    "All time",
] as const;

type SortBy = (typeof sortByOptions)[number];
type Timeframe = (typeof timeframeOptions)[number];

export default async function LeaderboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[]>>;
}) {
    const baseUrl = getBaseUrl();
    const actualParams = await searchParams;

    // @ts-expect-error this is fine
    const searchParamsCopy = new URLSearchParams(actualParams);

    const sortBy = (
        searchParamsCopy.get("sortBy")
            ? sortByOptions.includes(searchParamsCopy.get("sortBy")! as SortBy)
                ? searchParamsCopy.get("sortBy")!
                : "Playtime"
            : "Playtime"
    ) as SortBy;
    const timeframe = (
        searchParamsCopy.get("timeframe")
            ? timeframeOptions.includes(
                  searchParamsCopy.get("timeframe")! as Timeframe,
              )
                ? searchParamsCopy.get("timeframe")!
                : "Last 7 days"
            : "Last 7 days"
    ) as Timeframe;

    // Current period filters
    const filters: SQL[] = [];

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

    // Get the number of entries to fetch from the search params (per page)
    const limit = parseInt(searchParamsCopy.get("limit") ?? "10");

    // Get the page number from the search params
    const page = parseInt(searchParamsCopy.get("page") ?? "1");

    // Get current user ID for friends filter
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
        return (
            <div className="min-h-[calc(100vh-300px)] p-4">
                <h1 className="mb-2 text-2xl font-bold">Leaderboard</h1>
                <p>You need to be signed in to view the leaderboard.</p>
            </div>
        );
    }

    // Get user's friends
    const friendIds = await getUserFriends(currentUserId);

    // Include the current user in the filter
    const allowedUserIds = [currentUserId, ...friendIds];

    // Calculate total pages - only include friends in count
    const countUsers = await db
        .select({
            count: sql<number>`count(distinct ${schema.listeningHistory.userId})`,
        })
        .from(schema.listeningHistory)
        .where(
            and(
                ...filters,
                // Only include the current user and their friends
                inArray(schema.listeningHistory.userId, allowedUserIds),
            ),
        );
    const totalUsers = countUsers[0]!.count;
    const totalPages = Math.ceil(totalUsers / limit);

    if (totalPages !== 0) {
        if (page < 1) {
            searchParamsCopy.set("page", "1");
            redirect(`${baseUrl}/leaderboard?${searchParamsCopy.toString()}`);
        } else if (page > totalPages) {
            searchParamsCopy.set("page", totalPages.toString());
            redirect(`${baseUrl}/leaderboard?${searchParamsCopy.toString()}`);
        }
    }

    // Current period leaderboard
    const leaderboardUsers = await db
        .select({
            userId: schema.listeningHistory.userId,
            metric: metricQuery.as("metric"),
        })
        .from(schema.listeningHistory)
        .where(
            and(
                ...filters,
                // Only include the current user and their friends
                inArray(schema.listeningHistory.userId, allowedUserIds),
            ),
        )
        .groupBy(schema.listeningHistory.userId)
        .orderBy(desc(metricQuery))
        .limit(limit)
        .offset((page - 1) * limit);

    // Ensure metric is a number in each result - for some reason it was being returned as a string
    const formattedLeaderboardUsers = leaderboardUsers.map((user) => ({
        ...user,
        metric: Number(user.metric),
    }));

    // Previous period leaderboard (for comparison)
    const prevLeaderboardUsers =
        prevFilters.length > 0
            ? await db
                  .select({
                      userId: schema.listeningHistory.userId,
                      metric: metricQuery.as("metric"),
                  })
                  .from(schema.listeningHistory)
                  .where(
                      and(
                          ...prevFilters,
                          // Only include the current user and their friends
                          inArray(
                              schema.listeningHistory.userId,
                              allowedUserIds,
                          ),
                      ),
                  )
                  .groupBy(schema.listeningHistory.userId)
                  .orderBy(desc(metricQuery))
            : [];

    // Ensure metric is a number in each previous result
    const formattedPrevLeaderboardUsers = prevLeaderboardUsers.map((user) => ({
        ...user,
        metric: Number(user.metric),
    }));

    // Calculate comparisons
    const userComparisons = calculateComparisons(
        formattedLeaderboardUsers,
        formattedPrevLeaderboardUsers,
        "userId",
        "metric",
    );

    const userIds = formattedLeaderboardUsers.map((user) => user.userId);

    const client = await clerkClient();
    const { data: userData } = await client.users.getUserList({
        userId: userIds,
        limit,
    });

    function getPageUrl(page: number) {
        if (page < 1) {
            return "#";
        } else if (page > totalPages) {
            return "#";
        }

        const newUrl = new URL(
            `${baseUrl}/leaderboard?${searchParamsCopy.toString()}`,
        );
        newUrl.searchParams.set("page", page.toString());
        return newUrl.toString();
    }

    // Helper function to determine which page numbers to show
    function getPageNumbers(currentPage: number, totalPages: number) {
        const delta = 1; // Number of pages to show on each side of current page
        const pages: number[] = [];

        // Always include first page
        pages.push(1);

        // Calculate range around current page
        const rangeStart = Math.max(2, currentPage - delta);
        const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

        // Add ellipsis after first page if needed
        if (rangeStart > 2) {
            pages.push(-1); // -1 represents ellipsis
        }

        // Add pages around current page
        for (let i = rangeStart; i <= rangeEnd; i++) {
            pages.push(i);
        }

        // Add ellipsis before last page if needed
        if (rangeEnd < totalPages - 1) {
            pages.push(-1); // -1 represents ellipsis
        }

        // Always include last page if it exists and is different from first page
        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    }

    return (
        <div className="min-h-[calc(100vh-300px)] p-4">
            <h1 className="mb-2 text-2xl font-bold">Leaderboard</h1>
            <div className="mb-4 flex w-full flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <Label>Sort By</Label>
                    <ClientSearchParamsDropdown
                        title="Sort By"
                        baseUrl={baseUrl}
                        options={sortByOptions}
                        searchParam="sortBy"
                        defaultValue="Playtime"
                    />
                </div>
                <div className="flex-1">
                    <Label>Timeframe</Label>
                    <ClientSearchParamsDropdown
                        title="Timeframe"
                        baseUrl={baseUrl}
                        options={timeframeOptions}
                        searchParam="timeframe"
                        defaultValue="Last 7 days"
                    />
                </div>
            </div>
            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableHeadRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>{sortBy}</TableHead>
                                </TableHeadRow>
                            </TableHeader>
                            <TableBody>
                                {userComparisons.map((user, index) => {
                                    const clerkUser = userData.find(
                                        (innerUser) =>
                                            innerUser.id === user.userId,
                                    );
                                    return (
                                        <TableRow key={user.userId}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {index + 1}
                                                    {user.rankChange !==
                                                        null && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    {user.rankChange >
                                                                    0 ? (
                                                                        <ArrowUp className="h-4 w-4 text-green-600" />
                                                                    ) : user.rankChange <
                                                                      0 ? (
                                                                        <ArrowDown className="h-4 w-4 text-red-600" />
                                                                    ) : (
                                                                        <Minus className="h-4 w-4 text-gray-500" />
                                                                    )}
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {getRankChangeTooltip(
                                                                        user.rankChange,
                                                                        user.previousRank,
                                                                    )}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    className="flex h-12 items-center gap-4 text-wrap underline-offset-4 hover:underline"
                                                    href={`/dashboard?user=${user.userId}`}
                                                >
                                                    {clerkUser?.imageUrl ? (
                                                        <Image
                                                            src={
                                                                clerkUser?.imageUrl
                                                            }
                                                            alt={`${clerkUser?.firstName}'s profile picture`}
                                                            width={48}
                                                            height={48}
                                                            className="h-12 w-12 rounded-full"
                                                        />
                                                    ) : null}
                                                    {clerkUser?.firstName ??
                                                        "Unknown"}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {sortBy === "Playtime"
                                                        ? formatDuration(
                                                              user.metric,
                                                          )
                                                        : Number(
                                                              user.metric,
                                                          ).toLocaleString()}
                                                    <PercentageBadge
                                                        percentChange={
                                                            user.percentChange
                                                        }
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href={getPageUrl(page - 1)}
                                aria-disabled={page <= 1}
                            />
                        </PaginationItem>

                        {getPageNumbers(page, totalPages).map(
                            (pageNum, index) =>
                                pageNum === -1 ? (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href={getPageUrl(pageNum)}
                                            isActive={page === pageNum}
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                ),
                        )}

                        <PaginationItem>
                            <PaginationNext
                                href={getPageUrl(page + 1)}
                                aria-disabled={page >= totalPages}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}
