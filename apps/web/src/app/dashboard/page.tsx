import "server-only";

import { DateSelector } from "@/components/ui-parts/DateSelector";
import { Skeleton } from "@/components/ui/skeleton";
import {
    captureAuthenticatedEvent,
    captureServerPageView,
} from "@/lib/posthog";
import { db } from "@/server/db";
import { listeningHistory } from "@/server/db/schema";
import { type DateRange, getBaseUrl, usersAreFriends } from "@/server/lib";
import { RedirectToSignIn } from "@clerk/nextjs";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { asc, eq, sql } from "drizzle-orm";
import {
    ArrowUpRight,
    AudioLines,
    Disc3,
    Flame,
    Headphones,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DailyPlaytimeGraph } from "./_components/daily-playtime-graph";
import {
    OverallListeningStreak,
    OverallListeningStreakSkeleton,
    StreakSkeleton,
    GenericStreaks,
} from "./_components/listening-streaks";
import {
    TopMusicSkeleton,
    TopAlbums,
    TopArtists,
    TopTracks,
} from "./_components/top-music";
import { DashboardMusicSection } from "./_components/music-section";
import { TotalArtists, TotalMinutes, TotalTracks } from "./_components/totals";
import { checkAuth } from "./check-auth";
import { connection } from "next/server";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard",
    description:
        "Your SoundStats dashboard, with all your listening statistics.",
};

function readDate(date: string | null, defaultValue: Date) {
    if (!date) {
        return defaultValue;
    }

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? defaultValue : parsedDate;
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
        const areFriends = await usersAreFriends(currentUserId, userId);
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

    const apiClient = await clerkClient();

    let clerkUser;
    try {
        clerkUser = await apiClient.users.getUser(userId);
    } catch {
        clerkUser = null;
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
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = readDate(searchParamsCopy.get("to"), new Date());
    endDate.setUTCHours(23, 59, 59, 999);

    const dateRange = {
        from: startDate,
        to: endDate,
    } satisfies DateRange;

    // Get the number of entries to fetch from the search params
    // Set default to 10, with maximum of 100
    const requestedLimit = Number.parseInt(
        searchParamsCopy.get("limit") ?? "10",
        10,
    );
    const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(requestedLimit, 100))
        : 10;

    // Check if there's any data for this user
    const hasData = firstListeningHistoryEntry.length > 0;

    return (
        <div className="ss-dashboard">
            <header className="ss-dashboard-heading">
                <div>
                    <p className="ss-dashboard-owner">
                        {clerkUser?.firstName
                            ? `${clerkUser.firstName}’s listening`
                            : "Your listening"}
                    </p>
                    <h1>Your sound, in view.</h1>
                </div>
                <div className="ss-date-control">
                    <span>Listening period</span>
                    <DateSelector
                        useUtcDates
                        baseUrl={getBaseUrl()}
                        startDate={startDate}
                        endDate={endDate}
                        dataStartDate={dataStartDate}
                    />
                </div>
            </header>

            {!hasData && (
                <div className="ss-empty-notice" role="status">
                    <Headphones size={24} aria-hidden="true" />
                    <div>
                        <h2>Your listening story starts here.</h2>
                        <p>
                            Play something on Spotify and your activity will
                            appear here. Have a history of favourites?{" "}
                            <Link href="/import">
                                Import your listening history
                            </Link>{" "}
                            to see earlier stats.
                        </p>
                    </div>
                </div>
            )}

            <section className="ss-metrics" aria-label="Listening summary">
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <Headphones size={17} aria-hidden="true" /> Minutes
                        listened
                    </span>
                    <Suspense fallback={<Skeleton className="h-12 w-28" />}>
                        <TotalMinutes userId={userId} dateRange={dateRange} />
                    </Suspense>
                </div>
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <AudioLines size={17} aria-hidden="true" /> Artists
                        explored
                    </span>
                    <Suspense fallback={<Skeleton className="h-12 w-28" />}>
                        <TotalArtists userId={userId} dateRange={dateRange} />
                    </Suspense>
                </div>
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <Disc3 size={17} aria-hidden="true" /> Different tracks
                    </span>
                    <Suspense fallback={<Skeleton className="h-12 w-28" />}>
                        <TotalTracks userId={userId} dateRange={dateRange} />
                    </Suspense>
                </div>
                <div className="ss-metric ss-metric-streak">
                    <span className="ss-metric-label">
                        <Flame size={17} aria-hidden="true" /> Listening streak
                    </span>
                    <Suspense fallback={<OverallListeningStreakSkeleton />}>
                        <OverallListeningStreak
                            summary
                            userId={userId}
                            endDate={endDate}
                        />
                    </Suspense>
                </div>
            </section>
            <p className="ss-comparison-note">
                Changes compare with the previous period. Streaks are measured
                up to the end date.
            </p>

            <section className="ss-activity" aria-labelledby="activity-title">
                <div className="ss-panel-heading">
                    <div>
                        <h2 id="activity-title">The rhythm of your days.</h2>
                        <p>How your listening time adds up.</p>
                    </div>
                    <Headphones
                        size={23}
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </div>
                <Suspense fallback={<Skeleton className="h-80 w-full" />}>
                    <DailyPlaytimeGraph
                        userId={userId}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
            </section>

            <DashboardMusicSection
                section="rankings"
                title="Your heavy rotation."
                tabs={[
                    {
                        id: "artists",
                        label: "Artists",
                        content: (
                            <Suspense
                                fallback={<TopMusicSkeleton limit={limit} />}
                            >
                                <TopArtists
                                    userId={userId}
                                    dateRange={dateRange}
                                    limit={limit}
                                />
                            </Suspense>
                        ),
                    },
                    {
                        id: "tracks",
                        label: "Tracks",
                        content: (
                            <Suspense
                                fallback={<TopMusicSkeleton limit={limit} />}
                            >
                                <TopTracks
                                    userId={userId}
                                    dateRange={dateRange}
                                    limit={limit}
                                />
                            </Suspense>
                        ),
                    },
                    {
                        id: "albums",
                        label: "Albums",
                        content: (
                            <Suspense
                                fallback={<TopMusicSkeleton limit={limit} />}
                            >
                                <TopAlbums
                                    userId={userId}
                                    dateRange={dateRange}
                                    limit={limit}
                                />
                            </Suspense>
                        ),
                    },
                ]}
            />
            <DashboardMusicSection
                section="streaks"
                title="On repeat."
                tabs={[
                    {
                        id: "artists",
                        label: "Artists",
                        content: (
                            <Suspense fallback={<StreakSkeleton />}>
                                <GenericStreaks
                                    type="artist"
                                    userId={userId}
                                    startDate={startDate}
                                    endDate={endDate}
                                />
                            </Suspense>
                        ),
                    },
                    {
                        id: "tracks",
                        label: "Tracks",
                        content: (
                            <Suspense fallback={<StreakSkeleton />}>
                                <GenericStreaks
                                    type="track"
                                    userId={userId}
                                    startDate={startDate}
                                    endDate={endDate}
                                />
                            </Suspense>
                        ),
                    },
                    {
                        id: "albums",
                        label: "Albums",
                        content: (
                            <Suspense fallback={<StreakSkeleton />}>
                                <GenericStreaks
                                    type="album"
                                    userId={userId}
                                    startDate={startDate}
                                    endDate={endDate}
                                />
                            </Suspense>
                        ),
                    },
                ]}
            />
            <Link href="/import" className="ss-import-link">
                There’s more to your listening story? Import your history{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
        </div>
    );
}
