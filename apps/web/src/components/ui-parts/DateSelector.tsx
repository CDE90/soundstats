"use client";

import { DateRangePicker } from "@/components/DateRangePicker";
import { listeningDatePresets } from "@/lib/listening-period";
import { dateFormatter } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DateSelector({
    baseUrl,
    className,
    startDate,
    endDate,
    dataStartDate,
    useUtcDates = true,
}: Readonly<{
    baseUrl: string;
    className?: string;
    startDate: Date;
    endDate: Date;
    dataStartDate: Date;
    useUtcDates?: boolean;
}>) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // The picker uses local calendar dates; detail-page ranges use UTC dates.
    function pickerDate(date: Date) {
        return useUtcDates
            ? new Date(
                  date.getUTCFullYear(),
                  date.getUTCMonth(),
                  date.getUTCDate(),
              )
            : date;
    }

    const presets = listeningDatePresets(dataStartDate).map((preset) => ({
        ...preset,
        dateRange: {
            from: pickerDate(preset.dateRange.from),
            to: pickerDate(preset.dateRange.to),
        },
    }));

    return (
        <DateRangePicker
            className={className}
            onChange={(value) => {
                const url = new URL(
                    `${baseUrl}${pathname}?${searchParams.toString()}`,
                );
                if (value?.from) {
                    url.searchParams.set("from", dateFormatter(value.from));
                } else {
                    url.searchParams.delete("from");
                }
                if (value?.to) {
                    url.searchParams.set("to", dateFormatter(value.to));
                } else {
                    url.searchParams.delete("to");
                }
                router.push(url.toString());
            }}
            presets={presets}
            value={{
                from: pickerDate(startDate),
                to: pickerDate(endDate),
            }}
            enableYearNavigation
            aria-label="Listening period (UTC)"
            required
        />
    );
}
