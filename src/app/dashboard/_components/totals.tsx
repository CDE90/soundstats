import "server-only";

import { Badge } from "@/components/ui/badge";
import { db } from "@/server/db";
import { artistTracks, listeningHistory } from "@/server/db/schema";
import { type DateRange, getPrevDateRange, getTimeFilters } from "@/server/lib";
import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import { ArrowDown, ArrowUp } from "lucide-react";

async function getMetricsWithComparison<T>(
    userId: string,
    dateRange: DateRange,
    queryFn: (filters: SQL<unknown>, id: string) => Promise<T[]>,
    getValueFromResult: (result: T[]) => number,
): Promise<{
    current: number;
    previous: number;
    percentChange: number | null;
}> {
    const timeFilters = getTimeFilters(dateRange)!;
    const currentMetrics = await queryFn(timeFilters, userId);

    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange)!;
    const prevMetrics = await queryFn(prevTimeFilters, userId);

    const current = getValueFromResult(currentMetrics);
    const previous = getValueFromResult(prevMetrics);

    const percentChange =
        previous > 0 ? ((current - previous) / previous) * 100 : null;

    return { current, previous, percentChange };
}

export async function TotalMinutes({
    userId,
    dateRange,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
}>) {
    "use cache";

    const { current, percentChange } = await getMetricsWithComparison(
        userId,
        dateRange,
        async (filters: SQL<unknown>, id: string) => {
            return db
                .select({
                    duration: sql<number>`sum(${listeningHistory.progressMs})`,
                })
                .from(listeningHistory)
                .where(and(eq(listeningHistory.userId, id), filters));
        },
        (result) => {
            if (result?.[0]?.duration) {
                return result[0].duration / 60000;
            }
            return 0;
        },
    );

    return (
        <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">
                {Math.round(current).toLocaleString()} mins
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

    const { current, percentChange } = await getMetricsWithComparison(
        userId,
        dateRange,
        async (filters: SQL<unknown>, id: string) => {
            return db
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
                        eq(listeningHistory.userId, id),
                        filters,
                        gte(listeningHistory.progressMs, 30 * 1000),
                    ),
                );
        },
        (result) => {
            if (result?.[0]?.countArtists) {
                return result[0].countArtists;
            }
            return 0;
        },
    );

    return (
        <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{current.toLocaleString()}</p>
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

    const { current, percentChange } = await getMetricsWithComparison(
        userId,
        dateRange,
        async (filters: SQL<unknown>, id: string) => {
            return db
                .select({
                    countTracks: sql<number>`count(distinct ${listeningHistory.trackId})`,
                })
                .from(listeningHistory)
                .where(
                    and(
                        eq(listeningHistory.userId, id),
                        filters,
                        gte(listeningHistory.progressMs, 30 * 1000),
                    ),
                );
        },
        (result) => {
            if (result?.[0]?.countTracks) {
                return result[0].countTracks;
            }
            return 0;
        },
    );

    return (
        <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{current.toLocaleString()}</p>
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
