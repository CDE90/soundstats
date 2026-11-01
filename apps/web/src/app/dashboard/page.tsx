import "server-only";

import { ListenerContext } from "@/components/listener-context";
import { PageHeading } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { readMusicDetailRange } from "@/lib/music-details";
import { calendarListeningRange } from "@/lib/listening-period";
import { DateSelector } from "@/components/ui-parts/DateSelector";
import {
    captureAuthenticatedEvent,
    captureServerPageView,
} from "@/lib/posthog";
import { db } from "@/server/db";
import { readReportingSnapshot } from "@/server/reporting-database";
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
import { DailyPlaytimeGraph } from "./_components/daily-playtime-graph";
import {
    OverallListeningStreak,
    GenericStreaks,
} from "./_components/listening-streaks";
import { TopAlbums, TopArtists, TopTracks } from "./_components/top-music";
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

    const now = new Date();
    const dateRange = readMusicDetailRange(
        searchParamsCopy.get("from") ?? undefined,
        searchParamsCopy.get("to") ?? undefined,
        now,
    ) satisfies DateRange;
    const { from: startDate, to: endDate } = dateRange;

    // Get the number of entries to fetch from the search params
    // Set default to 10, with maximum of 100
    const requestedLimit = Number.parseInt(
        searchParamsCopy.get("limit") ?? "10",
        10,
    );
    const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(requestedLimit, 100))
        : 10;

    const isViewer = userId === currentUserId;

    // Read fresh mutable history from one committed snapshot. Independent caches
    // could otherwise mix old summary values with newly calculated streaks.
    const reportUserId = userId;
    const [
        firstListeningHistoryEntry,
        minutes,
        artists,
        tracks,
        overallStreak,
        activity,
        topArtists,
        topTracks,
        topAlbums,
        artistStreaks,
        trackStreaks,
        albumStreaks,
    ] = await readReportingSnapshot(db, async (database) => {
        const userId = reportUserId;
        const firstListeningHistoryEntry = await database
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

        const report = await Promise.all([
            TotalMinutes({ database, userId, dateRange }),
            TotalArtists({ database, userId, dateRange }),
            TotalTracks({ database, userId, dateRange }),
            OverallListeningStreak({
                database,
                summary: true,
                userId,
                endDate,
            }),
            DailyPlaytimeGraph({ database, userId, startDate, endDate }),
            TopArtists({ database, userId, dateRange, limit }),
            TopTracks({ database, userId, dateRange, limit }),
            TopAlbums({ database, userId, dateRange, limit }),
            GenericStreaks({
                database,
                type: "artist",
                userId,
                startDate,
                endDate,
            }),
            GenericStreaks({
                database,
                type: "track",
                userId,
                startDate,
                endDate,
            }),
            GenericStreaks({
                database,
                type: "album",
                userId,
                startDate,
                endDate,
            }),
        ]);
        return [firstListeningHistoryEntry, ...report] as const;
    });
    const hasData = firstListeningHistoryEntry.length > 0;
    const dataStartDate = hasData
        ? new Date(firstListeningHistoryEntry[0]!.playedAt)
        : calendarListeningRange(30, now).from;

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
                    {minutes}
                </div>
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <AudioLines size={17} aria-hidden="true" /> Artists
                        explored
                    </span>
                    {artists}
                </div>
                <div className="ss-metric">
                    <span className="ss-metric-label">
                        <Disc3 size={17} aria-hidden="true" /> Different tracks
                    </span>
                    {tracks}
                </div>
                <div className="ss-metric ss-metric-streak">
                    <span className="ss-metric-label">
                        <Flame size={17} aria-hidden="true" /> Listening streak
                    </span>
                    {overallStreak}
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
                {activity}
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
                        content: topArtists,
                    },
                    {
                        id: "tracks",
                        label: "Tracks",
                        content: topTracks,
                    },
                    {
                        id: "albums",
                        label: "Albums",
                        content: topAlbums,
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
                        content: artistStreaks,
                    },
                    {
                        id: "tracks",
                        label: "Tracks",
                        content: trackStreaks,
                    },
                    {
                        id: "albums",
                        label: "Albums",
                        content: albumStreaks,
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
