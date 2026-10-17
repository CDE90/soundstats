import { listeningHistory } from "@soundstats/database";
import type * as schema from "@soundstats/database";
import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ListeningGranularity } from "../lib/listening-chart.ts";

// Shift a comparison into the current axis before grouping. Both series then
// use exactly the same bucket boundaries, including partial weeks and months.
export function getListeningActivity(
    db: PostgresJsDatabase<typeof schema>,
    userId: string,
    range: { from: Date; to: Date },
    granularity: ListeningGranularity,
    options: {
        entityFilter?: SQL;
        shiftMs?: number;
        axisRange?: { from: Date; to: Date };
    } = {},
) {
    const axisRange = options.axisRange ?? range;
    const bucket = sql`date_trunc(${granularity}, (${listeningHistory.playedAt} AT TIME ZONE 'UTC') + ${options.shiftMs ?? 0} * interval '1 millisecond')`;
    const activity = db.$with("activity").as(
        db
            .select({
                date: bucket.as("date"),
                playtime:
                    sql<number>`sum(${listeningHistory.progressMs}) / 1000.0`
                        .mapWith(Number)
                        .as("playtime"),
            })
            .from(listeningHistory)
            .where(
                and(
                    eq(listeningHistory.userId, userId),
                    gte(listeningHistory.progressMs, 30_000),
                    gte(listeningHistory.playedAt, range.from),
                    lte(listeningHistory.playedAt, range.to),
                    options.entityFilter,
                ),
            )
            .groupBy(sql`1`),
    );

    return db
        .with(activity)
        .select({
            date:
                granularity === "hour"
                    ? sql<string>`to_char(series.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`
                    : sql<string>`to_char(series.bucket, 'YYYY-MM-DD')`,
            playtime: sql<number>`coalesce(${activity.playtime}, 0)`.mapWith(
                Number,
            ),
        })
        .from(
            sql`generate_series(date_trunc(${granularity}, ${axisRange.from.toISOString()}::timestamptz AT TIME ZONE 'UTC'), date_trunc(${granularity}, ${axisRange.to.toISOString()}::timestamptz AT TIME ZONE 'UTC'), ${`1 ${granularity}`}::interval) AS series(bucket)`,
        )
        .leftJoin(activity, sql`${activity.date} = series.bucket`)
        .orderBy(sql`series.bucket`);
}
