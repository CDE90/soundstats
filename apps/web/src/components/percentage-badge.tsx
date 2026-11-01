import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export function PercentageBadge({
    percentChange,
    metric = "listening activity",
}: {
    percentChange: number | null;
    metric?: string;
}) {
    if (percentChange === null || !Number.isFinite(percentChange)) return null;

    const percentage = Math.abs(percentChange).toFixed(1);
    const direction = percentChange > 0 ? "increase" : "decrease";
    const label =
        percentChange === 0
            ? `No change in ${metric} compared with the previous period (0.0%).`
            : `${percentage}% ${direction} in ${metric} compared with the previous period.`;
    const Icon =
        percentChange > 0 ? ArrowUp : percentChange < 0 ? ArrowDown : Minus;

    return (
        <Badge
            variant="outline"
            role="img"
            aria-label={label}
            title={label}
            className={`flex min-w-0 items-center gap-0.5 whitespace-nowrap px-1 py-0.5 text-xs xs:gap-1 xs:px-1.5 ${
                percentChange > 0
                    ? "border-green-800/30 bg-green-800/10 text-green-800 dark:border-green-300/30 dark:bg-green-300/10 dark:text-green-300"
                    : percentChange < 0
                      ? "border-red-800/30 bg-red-800/10 text-red-800 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-300"
                      : "border-slate-700/30 bg-slate-700/10 text-slate-700 dark:border-slate-200/30 dark:bg-slate-200/10 dark:text-slate-200"
            }`}
        >
            <Icon aria-hidden="true" className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
            <span className="truncate" aria-hidden="true">
                {percentage}%
            </span>
        </Badge>
    );
}
