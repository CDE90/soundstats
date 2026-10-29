import "server-only";

import { ListenerContext } from "@/components/listener-context";
import { PageHeading } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { readMusicDetailRange } from "@/lib/music-details";
import { calendarListeningRange } from "@/lib/listening-period";
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
                <div className="ss-page ss-page-narrow" role="status">
                    <PageHeading
                        title="This listening is private."
                        description="You can view listening statistics for yourself and your friends."
                    />
                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/dashboard">Your dashboard</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/friends">Find friends</Link>
                        </Button>
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
            playedAt:
                sql<string>`(${listeningHistory.playedAt} at time zone 'UTC')::date`.as(
                    "playedAt",
                ),
        })
        .from(listeningHistory)
        .where(eq(listeningHistory.userId, userId))
        .orderBy(asc(listeningHistory.playedAt))
        .limit(1);

    const now = new Date();
    const dataStartDate = firstListeningHistoryEntry.length
        ? new Date(firstListeningHistoryEntry[0]!.playedAt)
        : calendarListeningRange(30, now).from;
    const dateRange = readMusicDetailRange(
        searchParamsCopy.get("from") ?? undefined,
        searchParamsCopy.get("to") ?? undefined,
        now,
    ) satisfies DateRange;
    const { from: startDate, to: endDate } = dateRange;
    const rangeKey = `${userId}:${startDate.toISOString()}:${endDate.toISOString()}`;

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
    const isViewer = userId === currentUserId;

    return (
        <div className="ss-dashboard">
            <header className="ss-dashboard-heading">
                <div>
                    <ListenerContext user={clerkUser} isViewer={isViewer} />
                    <h1>
                        {isViewer
                            ? "Your sound, in view."
                            : "Listening, in view."}
                    </h1>
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
                        <h2>
                            {isViewer
                                ? "Your listening story starts here."
                                : "No listening history yet."}
                        </h2>
                        <p>
                            {isViewer ? (
                                <>
                                    Play something on Spotify and your activity
                                    will appear here. Have a history of
                                    favourites?{" "}
                                    <Link href="/import">
                                        Import your listening history
                                    </Link>{" "}
                                    to see earlier stats.
                                </>
                            ) : (
                                "This listener’s Spotify activity will appear here once it is recorded."
                            )}
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
                    <Suspense
                        key={rangeKey}
                        fallback={<Skeleton className="h-12 w-28" />}
                    >
                        <TotalMinutes userId={userId} dateRange={dateRange} />
                    </Suspense>
                </div>
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <AudioLines size={17} aria-hidden="true" /> Artists
                        explored
                    </span>
                    <Suspense
                        key={rangeKey}
                        fallback={<Skeleton className="h-12 w-28" />}
                    >
                        <TotalArtists userId={userId} dateRange={dateRange} />
                    </Suspense>
                </div>
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <Disc3 size={17} aria-hidden="true" /> Different tracks
                    </span>
                    <Suspense
                        key={rangeKey}
                        fallback={<Skeleton className="h-12 w-28" />}
                    >
                        <TotalTracks userId={userId} dateRange={dateRange} />
                    </Suspense>
                </div>
                <div className="ss-metric ss-metric-streak">
                    <span className="ss-metric-label">
                        <Flame size={17} aria-hidden="true" /> Listening streak
                    </span>
                    <Suspense
                        key={rangeKey}
                        fallback={<OverallListeningStreakSkeleton />}
                    >
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
                        <h2 id="activity-title">
                            {isViewer
                                ? "The rhythm of your days."
                                : "The rhythm of their days."}
                        </h2>
                        <p>
                            {isViewer
                                ? "How your listening time adds up."
                                : "How their listening time adds up."}
                        </p>
                    </div>
                    <Headphones
                        size={23}
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </div>
                <Suspense
                    key={rangeKey}
                    fallback={<Skeleton className="h-80 w-full" />}
                >
                    <DailyPlaytimeGraph
                        userId={userId}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </Suspense>
            </section>

            <DashboardMusicSection
                section="rankings"
                title={
                    isViewer ? "Your heavy rotation." : "Their heavy rotation."
                }
                tabs={[
                    {
                        id: "artists",
                        label: "Artists",
                        content: (
                            <Suspense
                                key={rangeKey}
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
                                key={rangeKey}
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
                                key={rangeKey}
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
                description={`Streaks as of ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · UTC`}
                tabs={[
                    {
                        id: "artists",
                        label: "Artists",
                        content: (
                            <Suspense
                                key={rangeKey}
                                fallback={<StreakSkeleton />}
                            >
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
                            <Suspense
                                key={rangeKey}
                                fallback={<StreakSkeleton />}
                            >
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
                            <Suspense
                                key={rangeKey}
                                fallback={<StreakSkeleton />}
                            >
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
            {isViewer && (
                <Link href="/import" className="ss-import-link">
                    There’s more to your listening story? Import your history{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}
