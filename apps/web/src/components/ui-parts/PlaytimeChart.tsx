"use client";

import { LineChart } from "@/components/LineChart";
import {
    formatListeningDuration,
    listeningDateLabel,
    listeningGranularityLabel,
    listeningTimeTicks,
    listeningTickDates,
    type ListeningGranularity,
    type ListeningPoint,
} from "@/lib/listening-chart";

export type DailyPlaytime = ListeningPoint;

export function PlaytimeChart({
    dailyPlaytime,
    prevDailyPlaytime,
    granularity = "day",
}: Readonly<{
    dailyPlaytime: DailyPlaytime[];
    prevDailyPlaytime?: DailyPlaytime[];
    granularity?: ListeningGranularity;
}>) {
    const hasListening = dailyPlaytime.some((day) => day.playtime > 0);
    const hasPreviousListening = prevDailyPlaytime?.some(
        (day) => day.playtime > 0,
    );
    if (!hasListening && !hasPreviousListening) {
        return (
            <div className="ss-chart-empty">
                <p>No listening in this period yet.</p>
                <span>
                    Choose an earlier date range or play something on Spotify.
                </span>
            </div>
        );
    }

    const includeYear =
        dailyPlaytime[0]?.date.slice(0, 4) !==
        dailyPlaytime.at(-1)?.date.slice(0, 4);
    const data = dailyPlaytime.map((item, index) => ({
        date: listeningDateLabel(item.date, granularity, includeYear),
        "This period": item.playtime,
        ...(prevDailyPlaytime
            ? { "Previous period": prevDailyPlaytime[index]?.playtime ?? 0 }
            : {}),
    }));
    const maximum = Math.max(
        0,
        ...dailyPlaytime.map((item) => item.playtime),
        ...(prevDailyPlaytime ?? []).map((item) => item.playtime),
    );
    const ticks = listeningTimeTicks(maximum);

    return (
        <figure className="ss-listening-chart">
            <figcaption className="ss-chart-caption">
                <span>
                    {listeningGranularityLabel[granularity]} totals{" "}
                    <span aria-hidden="true">·</span> UTC
                </span>
                {prevDailyPlaytime && (
                    <span>Previous period aligned by elapsed time</span>
                )}
            </figcaption>
            <LineChart
                className="h-80"
                aria-label={`${listeningGranularityLabel[granularity]} listening time`}
                data={data}
                index="date"
                categories={
                    prevDailyPlaytime
                        ? ["This period", "Previous period"]
                        : ["This period"]
                }
                colors={["chart-1", "chart-2"]}
                showLegend={Boolean(prevDailyPlaytime)}
                minValue={0}
                maxValue={ticks.at(-1)}
                yAxisTicks={ticks}
                xAxisTicks={listeningTickDates(dailyPlaytime, granularity).map(
                    (date) =>
                        listeningDateLabel(date, granularity, includeYear),
                )}
                valueFormatter={formatListeningDuration}
                yAxisWidth={68}
                tickGap={12}
                lineStyles={{
                    "This period": "solid",
                    "Previous period": "dashed",
                }}
            />
        </figure>
    );
}
