"use client";

import { LineChart } from "@/components/LineChart";

interface DailyPlaytime {
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

    console.log(maxPlaytime, orderOfMagnitude);

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
            valueFormatter={
                (value: number) => {
                    const hours = Math.floor(value / 3600);
                    // const minutes = Math.floor(value / 60);
                    const minutes = Math.floor((value % 3600) / 60);
                    const seconds = value % 60;
                    let formatted = "";
                    if (hours > 0) {
                        formatted += `${hours}h `;
                    }
                    if (minutes > 0) {
                        formatted += `${minutes}m `;
                    }
                    if (seconds > 0) {
                        formatted += `${seconds}s`;
                    }
                    if (formatted === "") {
                        return "0m 0s";
                    }
                    return formatted.trim();
                }
                // `${Math.floor(value / 60)}m ${value % 60}s`
            }
        />
    );
}
