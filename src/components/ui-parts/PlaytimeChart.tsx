"use client";

import { LineChart } from "@/components/LineChart";
import { formatDuration } from "@/lib/utils";

export interface DailyPlaytime {
    date: string;
    playtime: number;
}

export function PlaytimeChart(
    props: Readonly<{
        dailyPlaytime: DailyPlaytime[];
    }>,
) {
    const maxPlaytime = Math.max(
        ...props.dailyPlaytime.map((item) => item.playtime),
    );

    // Get the order of magnitude of the max playtime
    const orderOfMagnitude = Math.floor(Math.log10(maxPlaytime));

    return (
        <LineChart
            className="h-80"
            data={props.dailyPlaytime}
            index="date"
            categories={["playtime"]}
            showLegend={true}
            minValue={0}
            maxValue={
                Math.ceil(maxPlaytime / 10 ** orderOfMagnitude) *
                10 ** orderOfMagnitude
            }
            valueFormatter={formatDuration}
        />
    );
}
