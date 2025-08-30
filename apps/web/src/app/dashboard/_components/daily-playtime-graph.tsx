import "server-only";

import {
    PlaytimeChart,
    type DailyPlaytime,
} from "@/components/ui-parts/PlaytimeChart";
import { dateFormatter } from "@/lib/utils";
import { db } from "@/server/db";
import { listeningHistory } from "@/server/db/schema";
import { getPrevDateRange, getTimeFilters } from "@/server/lib";
import { and, asc, eq, gte, sql } from "drizzle-orm";

function isSameDay(date1: Date, date2: Date) {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

export async function DailyPlaytimeGraph({
    userId,
    startDate,
    endDate,
}: Readonly<{
    userId: string;
    startDate: Date;
    endDate: Date;
}>) {
    "use cache";

    const timeFilters = getTimeFilters({ from: startDate, to: endDate });
    const prevDateRange = getPrevDateRange({ from: startDate, to: endDate });
    const prevTimeFilters = getTimeFilters(prevDateRange);

    // Determine if we're looking at a single day
    const isSingleDayView = isSameDay(startDate, endDate);

    let dailyPlaytime: DailyPlaytime[];
    let prevDailyPlaytime: DailyPlaytime[];

    // Get the playtime data based on whether we're viewing a single day or multiple days
    if (isSingleDayView) {
        // Hourly breakdown for single day - Current Period
        const aggPlaytimeSq = db.$with("agg_playtime").as(
            db
                .select({
                    playedAt:
                        sql<number>`date_part('hour', ${listeningHistory.playedAt})::int`.as(
                            "playedAt",
                        ),
                    playtime:
                        sql<number>`sum(${listeningHistory.progressMs}) / 1000`.as(
                            "playtime",
                        ),
                })
                .from(listeningHistory)
                .where(
                    and(
                        timeFilters,
                        gte(listeningHistory.progressMs, 30 * 1000),
                        eq(listeningHistory.userId, userId),
                    ),
                )
                .groupBy(sql`date_part('hour', ${listeningHistory.playedAt})`),
        );

        const hoursSq = db.$with("hours").as(
            db
                .select({
                    hour: sql<number>`hh::int`.as("hour"),
                })
                .from(sql`generate_series(0, 23) as hh`),
        );

        dailyPlaytime = await db
            .with(hoursSq, aggPlaytimeSq)
            .select({
                date: sql<string>`${sql.raw(`'${startDate.toLocaleDateString()}'`)} || ' ' || 
                       case when ${hoursSq.hour} < 10 
                            then '0' || ${hoursSq.hour}::text 
                            else ${hoursSq.hour}::text 
                       end || ':00'`,
                playtime: sql<number>`coalesce(${aggPlaytimeSq.playtime}, 0)::int`,
            })
            .from(hoursSq)
            .leftJoin(aggPlaytimeSq, eq(hoursSq.hour, aggPlaytimeSq.playedAt))
            .orderBy(asc(hoursSq.hour));

        // Previous Period Hourly Breakdown
        const prevAggPlaytimeSq = db.$with("prev_agg_playtime").as(
            db
                .select({
                    playedAt:
                        sql<number>`date_part('hour', ${listeningHistory.playedAt})::int`.as(
                            "playedAt",
                        ),
                    playtime:
                        sql<number>`sum(${listeningHistory.progressMs}) / 1000`.as(
                            "playtime",
                        ),
                })
                .from(listeningHistory)
                .where(
                    and(
                        prevTimeFilters,
                        gte(listeningHistory.progressMs, 30 * 1000),
                        eq(listeningHistory.userId, userId),
                    ),
                )
                .groupBy(sql`date_part('hour', ${listeningHistory.playedAt})`),
        );

        prevDailyPlaytime = await db
            .with(hoursSq, prevAggPlaytimeSq)
            .select({
                date: sql<string>`${sql.raw(`'${prevDateRange.from.toLocaleDateString()}'`)} || ' ' || 
                       case when ${hoursSq.hour} < 10 
                            then '0' || ${hoursSq.hour}::text 
                            else ${hoursSq.hour}::text 
                       end || ':00'`,
                playtime: sql<number>`coalesce(${prevAggPlaytimeSq.playtime}, 0)::int`,
            })
            .from(hoursSq)
            .leftJoin(
                prevAggPlaytimeSq,
                eq(hoursSq.hour, prevAggPlaytimeSq.playedAt),
            )
            .orderBy(asc(hoursSq.hour));
    } else {
        // Daily breakdown for multiple days - Current Period
        const aggPlaytimeSq = db.$with("agg_playtime").as(
            db
                .select({
                    playedAt:
                        sql<string>`${listeningHistory.playedAt}::date`.as(
                            "playedAt",
                        ),
                    playtime:
                        sql<number>`sum(${listeningHistory.progressMs}) / 1000`.as(
                            "playtime",
                        ),
                })
                .from(listeningHistory)
                .where(
                    and(
                        timeFilters,
                        gte(listeningHistory.progressMs, 30 * 1000),
                        eq(listeningHistory.userId, userId),
                    ),
                )
                .groupBy(sql`${listeningHistory.playedAt}::date`),
        );

        const datesSq = db.$with("dates").as(
            db
                .select({
                    date: sql<string>`dd::date`.as("date"),
                })
                .from(
                    sql`generate_series(${dateFormatter(startDate)}::timestamp, ${dateFormatter(endDate)}::timestamp, '1 day'::interval) as dd`,
                ),
        );

        dailyPlaytime = await db
            .with(datesSq, aggPlaytimeSq)
            .select({
                date: datesSq.date,
                playtime: sql<number>`coalesce(${aggPlaytimeSq.playtime}, 0)::int`,
            })
            .from(datesSq)
            .leftJoin(aggPlaytimeSq, eq(datesSq.date, aggPlaytimeSq.playedAt));

        // Previous Period Daily Breakdown
        const prevAggPlaytimeSq = db.$with("prev_agg_playtime").as(
            db
                .select({
                    playedAt:
                        sql<string>`${listeningHistory.playedAt}::date`.as(
                            "playedAt",
                        ),
                    playtime:
                        sql<number>`sum(${listeningHistory.progressMs}) / 1000`.as(
                            "playtime",
                        ),
                })
                .from(listeningHistory)
                .where(
                    and(
                        prevTimeFilters,
                        gte(listeningHistory.progressMs, 30 * 1000),
                        eq(listeningHistory.userId, userId),
                    ),
                )
                .groupBy(sql`${listeningHistory.playedAt}::date`),
        );

        const prevDatesSq = db.$with("prev_dates").as(
            db
                .select({
                    date: sql<string>`dd::date`.as("date"),
                })
                .from(
                    sql`generate_series(${dateFormatter(prevDateRange.from)}::timestamp, ${dateFormatter(prevDateRange.to)}::timestamp, '1 day'::interval) as dd`,
                ),
        );

        prevDailyPlaytime = await db
            .with(prevDatesSq, prevAggPlaytimeSq)
            .select({
                date: prevDatesSq.date,
                playtime: sql<number>`coalesce(${prevAggPlaytimeSq.playtime}, 0)::int`,
            })
            .from(prevDatesSq)
            .leftJoin(
                prevAggPlaytimeSq,
                eq(prevDatesSq.date, prevAggPlaytimeSq.playedAt),
            );
    }

    return (
        <PlaytimeChart
            dailyPlaytime={dailyPlaytime}
            prevDailyPlaytime={prevDailyPlaytime}
        />
    );
}
