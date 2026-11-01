import "server-only";
import { PlaytimeChart } from "@/components/ui-parts/PlaytimeChart";
import {
    listeningGranularity,
    previousListeningRange,
} from "@/lib/listening-chart";
import { db as defaultDatabase } from "@/server/db";
import type { ReportingDatabase } from "@/server/reporting-database";
import { getListeningActivity } from "@/server/listening-activity";

export async function DailyPlaytimeGraph({
    database = defaultDatabase,
    userId,
    startDate,
    endDate,
}: Readonly<{
    database?: ReportingDatabase;
    userId: string;
    startDate: Date;
    endDate: Date;
}>) {
    const range = { from: startDate, to: endDate };
    const previous = previousListeningRange(startDate, endDate);
    const granularity = listeningGranularity(startDate, endDate);
    const [dailyPlaytime, prevDailyPlaytime] = await Promise.all([
        getListeningActivity(database, userId, range, granularity),
        getListeningActivity(database, userId, previous, granularity, {
            shiftMs: startDate.getTime() - previous.from.getTime(),
            axisRange: range,
        }),
    ]);
    return (
        <PlaytimeChart
            dailyPlaytime={dailyPlaytime}
            prevDailyPlaytime={prevDailyPlaytime}
            granularity={granularity}
        />
    );
}
