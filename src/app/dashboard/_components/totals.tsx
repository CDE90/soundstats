import "server-only";

import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";
import { artistTracks, listeningHistory } from "@/server/db/schema";
import { type DateRange, getPrevDateRange, getTimeFilters } from "@/server/lib";
import { and, eq, gte, sql } from "drizzle-orm";
import { ArrowDown, ArrowUp } from "lucide-react";

export async function TotalMinutes({
    userId,
    dateRange,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
}>) {
    "use cache";

    const timeFilters = getTimeFilters(dateRange);

    const totalProgressMs = await db
        .select({
            duration: sql<number>`sum(${listeningHistory.progressMs})`,
        })
        .from(listeningHistory)
        .where(and(eq(listeningHistory.userId, userId), timeFilters));

    let totalMinutes = 0;
    if (totalProgressMs) {
        totalMinutes = totalProgressMs[0]!.duration / 60000;
    }

    // Get the previous date range
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    const prevTotalProgressMs = await db
        .select({
            duration: sql<number>`sum(${listeningHistory.progressMs})`,
        })
        .from(listeningHistory)
        .where(and(eq(listeningHistory.userId, userId), prevTimeFilters));

    let prevTotalMinutes = 0;
    if (prevTotalProgressMs) {
        prevTotalMinutes = prevTotalProgressMs[0]!.duration / 60000;
    }

    const percentChange =
        prevTotalMinutes > 0
            ? ((totalMinutes - prevTotalMinutes) / prevTotalMinutes) * 100
            : null;

    return (
        <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">
                {Math.round(totalMinutes).toLocaleString()} mins
            </p>
            {percentChange !== null && (
                <Badge
                    variant="outline"
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs ${
                        percentChange > 0
                            ? "border-green-600/30 bg-green-600/10 text-green-600"
                            : "border-red-600/30 bg-red-600/10 text-red-600"
                    } `}
                >
                    {percentChange > 0 ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(percentChange).toFixed(1)}%
                </Badge>
            )}
        </div>
    );
}

export async function TotalArtists({
    userId,
    dateRange,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
}>) {
    "use cache";

    const timeFilters = getTimeFilters(dateRange);

    const totalArtistsCount = await db
        .select({
            countArtists: sql<number>`count(distinct ${artistTracks.artistId})`,
        })
        .from(listeningHistory)
        .innerJoin(
            artistTracks,
            eq(listeningHistory.trackId, artistTracks.trackId),
        )
        .where(
            and(
                eq(listeningHistory.userId, userId),
                timeFilters,
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        );

    let totalArtists = 0;
    if (totalArtistsCount) {
        totalArtists = totalArtistsCount[0]!.countArtists;
    }

    // Get the previous date range
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    const prevTotalArtistsCount = await db
        .select({
            countArtists: sql<number>`count(distinct ${artistTracks.artistId})`,
        })
        .from(listeningHistory)
        .innerJoin(
            artistTracks,
            eq(listeningHistory.trackId, artistTracks.trackId),
        )
        .where(
            and(
                eq(listeningHistory.userId, userId),
                prevTimeFilters,
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        );

    let prevTotalArtists = 0;
    if (prevTotalArtistsCount) {
        prevTotalArtists = prevTotalArtistsCount[0]!.countArtists;
    }

    const percentChange =
        prevTotalArtists > 0
            ? ((totalArtists - prevTotalArtists) / prevTotalArtists) * 100
            : null;

    return (
        <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">
                {totalArtists.toLocaleString()}
            </p>
            {percentChange !== null && (
                <Badge
                    variant="outline"
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs ${
                        percentChange > 0
                            ? "border-green-600/30 bg-green-600/10 text-green-600"
                            : "border-red-600/30 bg-red-600/10 text-red-600"
                    } `}
                >
                    {percentChange > 0 ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(percentChange).toFixed(1)}%
                </Badge>
            )}
        </div>
    );
}

export async function TotalTracks({
    userId,
    dateRange,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
}>) {
    "use cache";

    const timeFilters = getTimeFilters(dateRange);

    const totalTracksCount = await db
        .select({
            countTracks: sql<number>`count(distinct ${listeningHistory.trackId})`,
        })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                timeFilters,
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        );

    let totalTracks = 0;
    if (totalTracksCount) {
        totalTracks = totalTracksCount[0]!.countTracks;
    }

    // Get the previous date range
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    const prevTotalTracksCount = await db
        .select({
            countTracks: sql<number>`count(distinct ${listeningHistory.trackId})`,
        })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                prevTimeFilters,
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        );

    let prevTotalTracks = 0;
    if (prevTotalTracksCount) {
        prevTotalTracks = prevTotalTracksCount[0]!.countTracks;
    }

    const percentChange =
        prevTotalTracks > 0
            ? ((totalTracks - prevTotalTracks) / prevTotalTracks) * 100
            : null;

    return (
        <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">
                {totalTracks.toLocaleString()}
            </p>
            {percentChange !== null && (
                <Badge
                    variant="outline"
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs ${
                        percentChange > 0
                            ? "border-green-600/30 bg-green-600/10 text-green-600"
                            : "border-red-600/30 bg-red-600/10 text-red-600"
                    } `}
                >
                    {percentChange > 0 ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(percentChange).toFixed(1)}%
                </Badge>
            )}
        </div>
    );
}
