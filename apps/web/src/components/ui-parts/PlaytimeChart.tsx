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
        prevDailyPlaytime?: DailyPlaytime[];
    }>,
) {
    // If no previous data, just return current data
    if (!props.prevDailyPlaytime) {
        return (
            <LineChart
                className="h-80"
                data={props.dailyPlaytime}
                index="date"
                categories={["playtime"]}
                colors={["chart-1"]}
                valueFormatter={formatDuration}
                yAxisWidth={60}
            />
        );
    }

    // Combine the data into a format that supports multiple lines
    const combinedData = props.dailyPlaytime.map((item, index) => {
        const prevItem = props.prevDailyPlaytime![index] ?? { playtime: 0 };
        return {
            date: item.date,
            "Current Period": item.playtime,
            "Previous Period": prevItem.playtime,
        };
    });

    // Calculate max playtime across both current and previous periods
    const maxPlaytime = Math.max(
        ...combinedData.map((item) =>
            Math.max(item["Current Period"], item["Previous Period"]),
        ),
    );

    // Get the order of magnitude of the max playtime
    const orderOfMagnitude = Math.floor(Math.log10(maxPlaytime));

    return (
        <LineChart
            className="h-80"
            data={combinedData}
            index="date"
            categories={["Current Period", "Previous Period"]}
            colors={["chart-1", "chart-2"]}
            showLegend={true}
            onValueChange={() => null}
            minValue={0}
            maxValue={
                Math.ceil(maxPlaytime / 10 ** orderOfMagnitude) *
                10 ** orderOfMagnitude
            }
            valueFormatter={formatDuration}
            yAxisWidth={60}
            lineStyles={{
                "Current Period": "solid",
                "Previous Period": "dashed",
            }}
        />
    );
}
