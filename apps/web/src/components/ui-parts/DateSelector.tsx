"use client";

import { DateRangePicker } from "@/components/DateRangePicker";
import { listeningDatePresets } from "@/lib/listening-period";
import { dateFormatter } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

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
    const [isPending, startTransition] = useTransition();
    const controlRef = useRef<HTMLDivElement>(null);
    const wasPending = useRef(false);
    const restoreSubmissionFocus = useRef(false);

    useEffect(() => {
        // The disabled trigger cannot receive Radix's normal close focus. Return
        // keyboard focus after the new period arrives, unless the user moved on.
        if (
            wasPending.current &&
            !isPending &&
            restoreSubmissionFocus.current &&
            document.activeElement === document.body
        ) {
            controlRef.current
                ?.querySelector("button")
                ?.focus({ preventScroll: true });
        }
        if (!isPending) restoreSubmissionFocus.current = false;
        wasPending.current = isPending;
    }, [isPending]);

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
        <div
            ref={controlRef}
            className="relative w-full sm:w-auto"
            aria-busy={isPending}
        >
            <DateRangePicker
                className={className}
                disabled={isPending}
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
                    if (url.searchParams.toString() === searchParams.toString())
                        return;
                    const active = document.activeElement;
                    restoreSubmissionFocus.current = !!(
                        active?.closest("[role=dialog]") ||
                        (active && controlRef.current?.contains(active))
                    );
                    startTransition(() => {
                        router.push(url.toString(), { scroll: false });
                    });
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
            <span
                role="status"
                aria-live="polite"
                className={
                    isPending
                        ? "absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-muted-foreground"
                        : "sr-only"
                }
            >
                {isPending ? "Updating listening period…" : ""}
            </span>
        </div>
    );
}
