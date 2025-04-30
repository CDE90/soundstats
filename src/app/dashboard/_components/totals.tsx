import "server-only";

import { PercentageBadge } from "@/components/percentage-badge";
import { db } from "@/server/db";
import { artistTracks, listeningHistory } from "@/server/db/schema";
import { type DateRange, getPrevDateRange, getTimeFilters } from "@/server/lib";
import { and, eq, gte, sql, type SQL } from "drizzle-orm";

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
        <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
            <p className="text-base font-semibold sm:text-lg">
                {Math.round(current).toLocaleString()} mins
            </p>
            <PercentageBadge percentChange={percentChange} />
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
        <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
            <p className="text-base font-semibold sm:text-lg">
                {current.toLocaleString()}
            </p>
            <PercentageBadge percentChange={percentChange} />
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
        <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
            <p className="text-base font-semibold sm:text-lg">
                {current.toLocaleString()}
            </p>
            <PercentageBadge percentChange={percentChange} />
        </div>
    );
}
