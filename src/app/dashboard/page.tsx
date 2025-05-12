import "server-only";

import { DateSelector } from "@/components/ui-parts/DateSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    captureAuthenticatedEvent,
    captureServerPageView,
} from "@/lib/posthog";
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
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { asc, eq, sql } from "drizzle-orm";
import { InfoIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DailyPlaytimeGraph } from "./_components/daily-playtime-graph";
import {
    AlbumStreaks,
    ArtistStreaks,
    OverallListeningStreak,
    OverallListeningStreakSkeleton,
    StreakSkeleton,
    TrackStreaks,
} from "./_components/listening-streaks";
import {
    SkeletonTopTable,
    TopAlbums,
    TopArtists,
    TopTracks,
} from "./_components/top-tables";
import { TotalArtists, TotalMinutes, TotalTracks } from "./_components/totals";
import { checkAuth } from "./check-auth";
import { connection } from "next/server";

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
    await connection();

    const user = await currentUser();
    await captureServerPageView(user);

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
        const areFriends =
            (await usersAreFriends(currentUserId, userId)) || true;
        if (!areFriends) {
            // Track access denied event
            await captureAuthenticatedEvent(
                currentUserId,
                "dashboard_access_denied",
                {
                    requested_user_id: userId,
                },
            );

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
        } else {
            // Track friend dashboard view event
            await captureAuthenticatedEvent(
                currentUserId,
                "friend_dashboard_view",
                {
                    friend_user_id: userId,
                    date_range_start: searchParamsCopy.get("from"),
                    date_range_end: searchParamsCopy.get("to"),
                    limit: searchParamsCopy.get("limit"),
                },
            );
        }
    } else {
        // Track own dashboard view
        await captureAuthenticatedEvent(currentUserId, "own_dashboard_view", {
            date_range_start: searchParamsCopy.get("from"),
            date_range_end: searchParamsCopy.get("to"),
            limit: searchParamsCopy.get("limit"),
        });
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
    // Set default to 10, with maximum of 100
    let limit = parseInt(searchParamsCopy.get("limit") ?? "10");
    limit = Math.min(limit, 100);

    // Check if there's any data for this user
    const hasData = firstListeningHistoryEntry.length > 0;

    return (
        <div className="p-2 sm:p-4">
            <h1 className="mb-2 text-xl font-bold sm:text-2xl">
                {clerkUser
                    ? `${clerkUser.firstName}${clerkUser.firstName?.endsWith("s") ? "'" : "'s"} Dashboard`
                    : "Dashboard"}
            </h1>
            <DateSelector
                baseUrl={getBaseUrl()}
                className="mb-3 sm:mb-4"
                startDate={startDate}
                endDate={endDate}
                dataStartDate={dataStartDate}
            />

            {!hasData && (
                <>
                    {/* TODO: remove the first alert when extended quota is available */}
                    <Alert
                        className="mb-3 text-sm sm:mb-4 sm:text-base"
                        variant="destructive"
                    >
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>SoundStats is in closed beta</AlertTitle>
                        <AlertDescription>
                            <p className="mb-2">
                                If you haven&apos;t been invited, we will not be
                                able to fetch your listening data to show here.
                                Please check back later, or contact us at{" "}
                                <Link
                                    href="mailto:hello@soundstats.app"
                                    className="font-medium underline hover:opacity-80"
                                >
                                    hello@soundstats.app
                                </Link>{" "}
                                if you think this is an error.
                            </p>
                        </AlertDescription>
                    </Alert>

                    <Alert className="mb-3 text-sm sm:mb-4 sm:text-base">
                        <InfoIcon className="h-4 w-4" />
                        <AlertTitle>No listening data available</AlertTitle>
                        <AlertDescription>
                            <p className="mb-2">
                                We only collect Spotify listening data from the
                                time you sign up onwards, so it may take a
                                little while for your dashboard to start to
                                populate.
                            </p>
                            <p>
                                You can also{" "}
                                <Link
                                    href="/import"
                                    className="font-medium underline hover:opacity-80"
                                >
                                    import your listening history
                                </Link>{" "}
                                to see your stats right away.
                            </p>
                        </AlertDescription>
                    </Alert>
                </>
            )}

            {/* Stats cards - 2 columns on small screens, 4 on medium+ */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Total Minutes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense
                            fallback={
                                <Skeleton className="h-7 w-24 rounded-lg sm:w-32" />
                            }
                        >
                            <TotalMinutes
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Total Artists
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense
                            fallback={
                                <Skeleton className="h-7 w-24 rounded-lg sm:w-32" />
                            }
                        >
                            <TotalArtists
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Total Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense
                            fallback={
                                <Skeleton className="h-7 w-24 rounded-lg sm:w-32" />
                            }
                        >
                            <TotalTracks
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                {/* Overall Listening Streak */}
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Listening Streak
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense fallback={<OverallListeningStreakSkeleton />}>
                            <OverallListeningStreak userId={userId} />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>

            {/* Listening streaks - 1 column on small, 3 on large */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Artist Streaks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense fallback={<StreakSkeleton />}>
                            <ArtistStreaks userId={userId} />
                        </Suspense>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Track Streaks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense fallback={<StreakSkeleton />}>
                            <TrackStreaks userId={userId} />
                        </Suspense>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Album Streaks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense fallback={<StreakSkeleton />}>
                            <AlbumStreaks userId={userId} />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>

            {/* Top tables - 1 column on small, 2 on medium, 3 on xl */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Top Artists
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense fallback={<SkeletonTopTable limit={limit} />}>
                            <TopArtists
                                userId={userId}
                                dateRange={dateRange}
                                limit={limit}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Top Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense fallback={<SkeletonTopTable limit={limit} />}>
                            <TopTracks
                                userId={userId}
                                dateRange={dateRange}
                                limit={limit}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
                <Card className="h-full md:col-span-2 xl:col-span-1">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Top Albums
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
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

            {/* Daily playtime - full width */}
            <div className="mb-4">
                <Card>
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Daily Playtime
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Suspense
                            fallback={
                                <Skeleton className="h-60 w-full sm:h-80" />
                            }
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
