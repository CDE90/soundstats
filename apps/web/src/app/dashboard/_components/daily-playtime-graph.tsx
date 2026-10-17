import "server-only";
import { PlaytimeChart } from "@/components/ui-parts/PlaytimeChart";
import {
    listeningGranularity,
    previousListeningRange,
} from "@/lib/listening-chart";
import { db } from "@/server/db";
import { getListeningActivity } from "@/server/listening-activity";

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
    const range = { from: startDate, to: endDate };
    const previous = previousListeningRange(startDate, endDate);
    const granularity = listeningGranularity(startDate, endDate);
    const [dailyPlaytime, prevDailyPlaytime] = await Promise.all([
        getListeningActivity(db, userId, range, granularity),
        getListeningActivity(db, userId, previous, granularity, {
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
