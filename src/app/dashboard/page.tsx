import "server-only";

import { DateSelector } from "@/components/ui-parts/DateSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import { listeningHistory, users } from "@/server/db/schema";
import {
    type DateRange,
    getBaseUrl,
    getSpotifyAccount,
    setUserTracking,
    usersAreFriends,
} from "@/server/lib";
import { RedirectToSignIn } from "@clerk/nextjs";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { asc, eq, sql } from "drizzle-orm";
import { Suspense } from "react";
import { DailyPlaytimeGraph } from "./_components/daily-playtime-graph";
import {
    SkeletonTopTable,
    TopAlbums,
    TopArtists,
    TopTracks,
} from "./_components/top-tables";
import { TotalArtists, TotalMinutes, TotalTracks } from "./_components/totals";
import { checkAuth } from "./check-auth";

function readDate(date: string | null, defaultValue: Date) {
    if (!date) {
        return defaultValue;
    }

    try {
        return new Date(date);
    } catch {
        return defaultValue;
    }
}

function mostRecentDate(date1: Date, date2: Date) {
    return date1.getTime() > date2.getTime() ? date1 : date2;
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[]>>;
}) {
    const actualParams = await searchParams;

    // @ts-expect-error this is fine
    const searchParamsCopy = new URLSearchParams(actualParams);

    let userId = searchParamsCopy.get("user");

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId || !(await checkAuth())) {
        return <RedirectToSignIn />;
    }

    const currentUserId = clerkUserId;

    if (!userId) {
        // If no user ID is provided, show the current user's dashboard
        userId = currentUserId;
    } else if (userId !== currentUserId) {
        // Check if the users are friends
        const areFriends = await usersAreFriends(currentUserId, userId);
        if (!areFriends) {
            return (
                <div className="flex h-[70vh] items-center justify-center">
                    <div className="text-center">
                        <h1 className="mb-4 text-4xl font-bold">
                            Access Denied
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            You can only view dashboards for users who are your
                            friends.
                        </p>
                    </div>
                </div>
            );
        }
    }

    const dbUsers = await db.select().from(users).where(eq(users.id, userId));

    const apiClient = await clerkClient();

    let clerkUser;
    try {
        clerkUser = await apiClient.users.getUser(userId);
    } catch {
        clerkUser = null;
    }

    if (!dbUsers.length) {
        const spotifyAccount = await getSpotifyAccount(apiClient, userId);

        if (spotifyAccount) {
            await setUserTracking(true, userId, spotifyAccount.externalId);
        }
    }

    // Get the date of the first listening history entry
    const firstListeningHistoryEntry = await db
        .select({
            playedAt: sql<string>`${listeningHistory.playedAt}::date`.as(
                "playedAt",
            ),
        })
        .from(listeningHistory)
        .where(eq(listeningHistory.userId, userId))
        .orderBy(asc(listeningHistory.playedAt))
        .limit(1);

    let defaultStartDate = firstListeningHistoryEntry.length
        ? new Date(firstListeningHistoryEntry[0]!.playedAt)
        : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
    // Ensure the default start date is not earlier than a year ago
    defaultStartDate = mostRecentDate(
        defaultStartDate,
        new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    const dataStartDate = firstListeningHistoryEntry.length
        ? new Date(firstListeningHistoryEntry[0]!.playedAt)
        : defaultStartDate;

    // Get the start date and end date from the search params
    const startDate = readDate(searchParamsCopy.get("from"), defaultStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = readDate(searchParamsCopy.get("to"), new Date());
    endDate.setHours(23, 59, 59, 999);

    const dateRange = {
        from: startDate,
        to: endDate,
    } satisfies DateRange;

    // Get the number of entries to fetch from the search params
    const limit = parseInt(searchParamsCopy.get("limit") ?? "10");

    return (
        <div className="p-4">
            <h1 className="mb-2 text-2xl font-bold">
                Dashboard{clerkUser ? ` for ${clerkUser.firstName}` : ""}
            </h1>
            <DateSelector
                baseUrl={getBaseUrl()}
                className="mb-4"
                startDate={startDate}
                endDate={endDate}
                dataStartDate={dataStartDate}
            />

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Minutes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense
                            fallback={
                                <Skeleton className="h-7 w-32 rounded-lg" />
                            }
                        >
                            <TotalMinutes
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Artists</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense
                            fallback={
                                <Skeleton className="h-7 w-32 rounded-lg" />
                            }
                        >
                            <TotalArtists
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Tracks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense
                            fallback={
                                <Skeleton className="h-7 w-32 rounded-lg" />
                            }
                        >
                            <TotalTracks
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Artists</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<SkeletonTopTable limit={limit} />}>
                            <TopArtists
                                userId={userId}
                                dateRange={dateRange}
                                limit={limit}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Tracks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<SkeletonTopTable limit={limit} />}>
                            <TopTracks
                                userId={userId}
                                dateRange={dateRange}
                                limit={limit}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Albums</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<SkeletonTopTable limit={limit} />}>
                            <TopAlbums
                                userId={userId}
                                dateRange={dateRange}
                                limit={limit}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Playtime</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense
                            fallback={<Skeleton className="h-80 w-full" />}
                        >
                            <DailyPlaytimeGraph
                                userId={userId}
                                startDate={startDate}
                                endDate={endDate}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
