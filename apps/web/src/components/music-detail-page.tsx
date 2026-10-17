import "server-only";

import { RedirectToSignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Music2 } from "lucide-react";
import { checkAuth } from "@/app/dashboard/check-auth";
import { DateSelector } from "@/components/ui-parts/DateSelector";
import { PlaytimeChart } from "@/components/ui-parts/PlaytimeChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    canViewMusicDetails,
    musicDetailHref,
    musicDetailParams,
    readMusicDetailRange,
    type MusicEntityType,
} from "@/lib/music-details";
import { formatDuration } from "@/lib/utils";
import { db } from "@/server/db";
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
            <div className="flex min-h-[60vh] items-center justify-center p-4 text-center">
                <div>
                    <h1 className="mb-3 text-3xl font-bold">Access Denied</h1>
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
    const dashboardHref = `/dashboard?${musicDetailParams(context)}`;

    return (
        <div className="mx-auto max-w-7xl space-y-5 p-3 sm:space-y-6 sm:p-6">
            <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
            </Link>

            <header className="flex items-center gap-4 sm:gap-6">
                {entity.imageUrl ? (
                    <Image
                        src={entity.imageUrl}
                        alt={entity.name}
                        width={160}
                        height={160}
                        className="h-24 w-24 rounded-md object-cover sm:h-40 sm:w-40"
                    />
                ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-muted sm:h-40 sm:w-40">
                        <Music2
                            aria-hidden="true"
                            className="h-10 w-10 text-muted-foreground"
                        />
                    </div>
                )}
                <div className="min-w-0 space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {type} ·{" "}
                        {userId === viewerId
                            ? "Your listening history"
                            : "Friend’s listening history"}
                    </p>
                    <h1 className="break-words text-2xl font-bold sm:text-4xl">
                        {entity.name}
                    </h1>
                    {entity.artists.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {entity.artists.map((artist, index) => (
                                <span key={artist.id}>
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
                                </span>
                            ))}
                        </p>
                    )}
                    {entity.album && (
                        <p className="text-sm text-muted-foreground">
                            {entity.album}
                        </p>
                    )}
                    <Link
                        href={`https://open.spotify.com/${type}/${encodeURIComponent(id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                    >
                        Open in Spotify <ExternalLink className="h-3 w-3" />
                    </Link>
                </div>
            </header>

            <DateSelector
                useUtcDates
                baseUrl={getBaseUrl()}
                startDate={dateRange.from}
                endDate={dateRange.to}
                dataStartDate={stats.lifetime.firstPlayedAt ?? dateRange.from}
            />
            <p className="text-sm text-muted-foreground">
                Stats for the selected period. Plays count after at least 30
                seconds of listening. Dates and activity are shown in UTC.
                {type === "artist" &&
                    " Includes primary and featured artist credits."}
            </p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                    type === "artist"
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
                    <Card key={label}>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm text-muted-foreground">
                                {label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-2xl font-semibold">
                            {value}
                        </CardContent>
                    </Card>
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
                                {stats.monthly ? "Monthly" : "Daily"} listening
                                activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PlaytimeChart
                                dailyPlaytime={stats.dailyPlaytime}
                            />
                        </CardContent>
                    </Card>
                    {type === "artist" && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top tracks</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableHeadRow>
                                            <TableHead>Track</TableHead>
                                            <TableHead>Plays</TableHead>
                                            <TableHead>Minutes</TableHead>
                                        </TableHeadRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.topTracks.map((track) => (
                                            <TableRow key={track.id}>
                                                <TableCell>
                                                    <Link
                                                        className="font-medium underline-offset-4 hover:underline"
                                                        href={musicDetailHref(
                                                            "track",
                                                            track.id,
                                                            context,
                                                        )}
                                                    >
                                                        {track.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {track.plays.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {Math.round(
                                                        track.minutes,
                                                    ).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent listens</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Latest 25 plays in the selected period.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableHeadRow>
                                        <TableHead>Played at (UTC)</TableHead>
                                        {type === "artist" && (
                                            <TableHead>Track</TableHead>
                                        )}
                                        <TableHead>Listened</TableHead>
                                        <TableHead>Source</TableHead>
                                    </TableHeadRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.recentPlays.map((play) => (
                                        <TableRow key={play.id}>
                                            <TableCell className="whitespace-nowrap">
                                                <time
                                                    dateTime={play.playedAt.toISOString()}
                                                >
                                                    {play.playedAt.toLocaleString(
                                                        "en-GB",
                                                        { timeZone: "UTC" },
                                                    )}
                                                </time>
                                            </TableCell>
                                            {type === "artist" && (
                                                <TableCell>
                                                    <Link
                                                        className="underline-offset-4 hover:underline"
                                                        href={musicDetailHref(
                                                            "track",
                                                            play.trackId,
                                                            context,
                                                        )}
                                                    >
                                                        {play.name}
                                                    </Link>
                                                </TableCell>
                                            )}
                                            <TableCell className="whitespace-nowrap">
                                                {formatDuration(
                                                    play.progressMs / 1000,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {play.imported
                                                    ? "Spotify import"
                                                    : play.deviceName ||
                                                      "Spotify"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
