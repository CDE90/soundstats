import "server-only";

import {
    PlaytimeChart,
    type DailyPlaytime,
} from "@/components/ui-parts/PlaytimeChart";
import { db } from "@/server/db";
import { listeningHistory } from "@/server/db/schema";
import { getTimeFilters } from "@/server/lib";
import { and, asc, eq, gte, sql } from "drizzle-orm";

function isSameDay(date1: Date, date2: Date) {
    return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
    );
}

function dateFormatter(date: Date) {
    // Return the date in the format "YYYY-MM-DD"
    return date.toISOString().split("T")[0];
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

    // Determine if we're looking at a single day
    const isSingleDayView = isSameDay(startDate, endDate);

    let dailyPlaytime: DailyPlaytime[];

    // Get the playtime data based on whether we're viewing a single day or multiple days
    if (isSingleDayView) {
        // Hourly breakdown for single day
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
                    // hour: sql<number>`generate_series(0, 23)`.as("hour"),
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
    } else {
        // Daily breakdown for multiple days
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
    }

    return <PlaytimeChart dailyPlaytime={dailyPlaytime} />;
}
