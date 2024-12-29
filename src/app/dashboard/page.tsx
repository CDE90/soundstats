import "server-only";

import { DateSelector } from "@/components/ui-parts/DateSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import { listeningHistory, users } from "@/server/db/schema";
import { getSpotifyAccount, setUserTracking } from "@/server/lib";
import { RedirectToSignIn } from "@clerk/nextjs";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { Suspense } from "react";
import { DailyPlaytimeGraph } from "./_components/daily-playtime-graph";
import {
    SkeletonTopTable,
    TopAlbums,
    TopArtists,
    TopTracks,
} from "./_components/top-tables";
import { TotalArtists, TotalMinutes, TotalTracks } from "./_components/totals";

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

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[]>>;
}) {
    const { userId } = await auth();

    if (!userId) {
        return <RedirectToSignIn />;
    }

    const dbUsers = await db.select().from(users).where(eq(users.id, userId));

    if (!dbUsers.length) {
        const apiClient = await clerkClient();
        const spotifyAccount = await getSpotifyAccount(apiClient, userId);

        if (spotifyAccount) {
            await setUserTracking(true, userId, spotifyAccount.externalId);
        }
    }

    const actualParams = await searchParams;

    // @ts-expect-error this is fine
    const searchParamsCopy = new URLSearchParams(actualParams);

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

    const defaultStartDate = firstListeningHistoryEntry.length
        ? new Date(firstListeningHistoryEntry[0]!.playedAt)
        : new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000);

    // Get the start date and end date from the search params
    const startDate = readDate(searchParamsCopy.get("from"), defaultStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = readDate(searchParamsCopy.get("to"), new Date());
    endDate.setHours(23, 59, 59, 999);

    const timeFilters = and(
        gte(listeningHistory.playedAt, startDate),
        lte(listeningHistory.playedAt, endDate),
    );

    // Get the number of entries to fetch from the search params
    const limit = parseInt(searchParamsCopy.get("limit") ?? "10");

    return (
        <div className="p-4">
            <h1 className="mb-2 text-2xl font-bold">Dashboard</h1>
            <DateSelector
                baseUrl={process.env.COOLIFY_URL ?? "http://localhost:3000"}
                className="mb-4"
                startDate={startDate}
                endDate={endDate}
                dataStartDate={defaultStartDate}
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
                                timeFilters={timeFilters}
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
                                timeFilters={timeFilters}
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
                                timeFilters={timeFilters}
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
                                timeFilters={timeFilters}
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
                                timeFilters={timeFilters}
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
                                timeFilters={timeFilters}
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
                                timeFilters={timeFilters}
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
