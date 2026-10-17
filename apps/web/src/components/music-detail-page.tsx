import "server-only";

import { listeningGranularityLabel } from "@/lib/listening-chart";
import { SpotifyWordmark } from "@/components/spotify-wordmark";

import { RedirectToSignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Music2 } from "lucide-react";
import { SpotifyLink } from "@/components/spotify-link";
import { checkAuth } from "@/app/dashboard/check-auth";
import { DateSelector } from "@/components/ui-parts/DateSelector";
import { PlaytimeChart } from "@/components/ui-parts/PlaytimeChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    MusicCollection,
    ListeningHistory,
} from "@/components/music-collection";
import { albums, tracks } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
    canViewMusicDetails,
    musicDetailHref,
    musicDetailParams,
    readMusicDetailRange,
    type MusicEntityType,
} from "@/lib/music-details";
import { db } from "@/server/db";
import { formatDuration } from "@/lib/utils";
import { getBaseUrl, usersAreFriends } from "@/server/lib";
import {
    getMusicDetailStats,
    getMusicEntity,
} from "@/server/music-detail-queries";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function displayDate(date: Date | null) {
    return date
        ? date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
          })
        : "No listens yet";
}

export async function MusicDetailPage({
    type,
    id,
    searchParams,
}: {
    type: MusicEntityType;
    id: string;
    searchParams: SearchParams;
}) {
    await connection();
    const { userId: viewerId } = await auth();
    if (!viewerId || !(await checkAuth())) return <RedirectToSignIn />;

    const userId = firstParam(searchParams.user) || viewerId;
    if (!(await canViewMusicDetails(viewerId, userId, usersAreFriends))) {
        return (
            <div className="ss-page ss-page-narrow ss-access-state">
                <div>
                    <h1 className="mb-3 text-3xl font-bold">
                        Listening details are private
                    </h1>
                    <p className="text-muted-foreground">
                        You can only view listening details for yourself and
                        your friends.
                    </p>
                    <Link
                        href="/dashboard"
                        className="mt-4 inline-block underline"
                    >
                        Back to your dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const entity = await getMusicEntity(db, type, id);
    if (!entity) notFound();

    const dateRange = readMusicDetailRange(
        firstParam(searchParams.from),
        firstParam(searchParams.to),
    );
    const context = { userId, dateRange };
    const stats = await getMusicDetailStats(db, type, id, context);
    const trackIds = [
        ...new Set([
            ...stats.topTracks.map((track) => track.id),
            ...stats.recentPlays.map((play) => play.trackId),
        ]),
    ];
    const artwork = trackIds.length
        ? await db
              .select({ id: tracks.id, imageUrl: albums.imageUrl })
              .from(tracks)
              .leftJoin(albums, eq(tracks.albumId, albums.id))
              .where(inArray(tracks.id, trackIds))
        : [];
    const images = new Map(artwork.map((track) => [track.id, track.imageUrl]));
    const dashboardHref = `/dashboard?${musicDetailParams(context)}`;

    return (
        <div className="ss-page ss-music-detail space-y-7">
            <Link href={dashboardHref} className="ss-back-link">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
            </Link>

            <header className="ss-music-hero">
                {entity.imageUrl ? (
                    <a
                        href={`https://open.spotify.com/${type}/${encodeURIComponent(id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${entity.name} in Spotify (opens in a new tab)`}
                        className="shrink-0 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <Image
                            src={entity.imageUrl}
                            alt={entity.name}
                            width={240}
                            height={240}
                            className="ss-detail-art rounded-[4px] object-contain lg:rounded-[8px]"
                        />
                    </a>
                ) : (
                    <div className="ss-detail-art flex shrink-0 items-center justify-center rounded-md bg-muted">
                        <Music2
                            aria-hidden="true"
                            className="h-10 w-10 text-muted-foreground"
                        />
                    </div>
                )}
                <div className="min-w-0 space-y-4">
                    <span className="ss-entity-type">
                        {type === "artist"
                            ? "Artist"
                            : type === "album"
                              ? "Album"
                              : "Track"}
                    </span>
                    <h1>{entity.name}</h1>
                    {entity.artists.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {entity.artists.map((artist, index) => (
                                <span
                                    key={artist.id}
                                    className="inline-flex items-center"
                                >
                                    {index > 0 && ", "}
                                    <Link
                                        className="underline-offset-4 hover:underline"
                                        href={musicDetailHref(
                                            "artist",
                                            artist.id,
                                            context,
                                        )}
                                    >
                                        {artist.name}
                                    </Link>
                                    <SpotifyLink
                                        type="artist"
                                        id={artist.id}
                                        name={artist.name}
                                    />
                                </span>
                            ))}
                        </p>
                    )}
                    {entity.album && entity.albumId && (
                        <p className="flex flex-wrap items-center text-sm text-muted-foreground">
                            <Link
                                className="underline-offset-4 hover:underline"
                                href={musicDetailHref(
                                    "album",
                                    entity.albumId,
                                    context,
                                )}
                            >
                                {entity.album}
                            </Link>
                            <SpotifyLink
                                type="album"
                                id={entity.albumId}
                                name={entity.album}
                            />
                        </p>
                    )}
                    <SpotifyLink
                        type={type}
                        id={id}
                        name={entity.name}
                        showLabel
                    />
                </div>
            </header>

            <div className="ss-detail-controls">
                <DateSelector
                    useUtcDates
                    baseUrl={getBaseUrl()}
                    startDate={dateRange.from}
                    endDate={dateRange.to}
                    dataStartDate={
                        stats.lifetime.firstPlayedAt ?? dateRange.from
                    }
                />
                <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-attribution"
                >
                    <span>Music from</span>
                    <SpotifyWordmark />
                </a>
            </div>

            <div
                className="ss-metrics ss-detail-metrics"
                aria-label="Listening summary"
            >
                {[
                    ["Plays", stats.summary.plays.toLocaleString()],
                    [
                        "Minutes listened",
                        Math.round(stats.summary.minutes).toLocaleString(),
                    ],
                    [
                        "Listening days",
                        stats.summary.listeningDays.toLocaleString(),
                    ],
                    type !== "track"
                        ? [
                              "Tracks heard",
                              stats.summary.uniqueTracks.toLocaleString(),
                          ]
                        : [
                              "Average listen",
                              formatDuration(
                                  stats.summary.plays
                                      ? (stats.summary.minutes * 60) /
                                            stats.summary.plays
                                      : 0,
                              ),
                          ],
                ].map(([label, value]) => (
                    <div key={label} className="ss-metric">
                        <span className="ss-metric-label">{label}</span>
                        <p className="ss-metric-value">{value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
                <p>
                    First listen (all time):{" "}
                    <span className="font-medium text-foreground">
                        {displayDate(stats.lifetime.firstPlayedAt)}
                    </span>
                </p>
                <p>
                    Latest listen (all time):{" "}
                    <span className="font-medium text-foreground">
                        {displayDate(stats.lifetime.lastPlayedAt)}
                    </span>
                </p>
            </div>

            {stats.summary.plays === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center">
                        <h2 className="mb-2 font-semibold">
                            No listens in this period
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Choose a different date range to explore more
                            listening history.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {listeningGranularityLabel[stats.granularity]}{" "}
                                listening activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PlaytimeChart
                                dailyPlaytime={stats.dailyPlaytime}
                                granularity={stats.granularity}
                            />
                        </CardContent>
                    </Card>
                    {type !== "track" && stats.topTracks.length > 0 && (
                        <section
                            aria-labelledby="detail-tracks-title"
                            className="ss-detail-collection"
                        >
                            <h2
                                id="detail-tracks-title"
                                className="ss-detail-list-title"
                            >
                                Top tracks
                            </h2>
                            <MusicCollection
                                context={context}
                                label="Top tracks"
                                layout="cards"
                                items={stats.topTracks.map((track, index) => ({
                                    ...track,
                                    type: "track",
                                    imageUrl: images.get(track.id) ?? null,
                                    rank: index + 1,
                                }))}
                            />
                        </section>
                    )}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle>Recent listens</CardTitle>
                            <span className="text-xs text-muted-foreground">
                                UTC
                            </span>
                        </CardHeader>
                        <CardContent>
                            <ListeningHistory
                                context={context}
                                showTracks={type !== "track"}
                                items={stats.recentPlays.map((play) => ({
                                    ...play,
                                    imageUrl: images.get(play.trackId) ?? null,
                                }))}
                            />
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
