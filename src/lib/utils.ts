export function timeAgo(date: Date) {
    const now = Date.now();
    const diff = now - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 90) {
        return date.toLocaleDateString();
    }

    if (seconds < 60) {
        return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
    }

    if (minutes < 60) {
        return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
    }

    if (hours < 24) {
        return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }

    return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function formatFullTimestamp(date: Date) {
    return date.toLocaleString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function dateFormatter(date: Date) {
    // Return the date in the format "YYYY-MM-DD"
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

/**
 * Format duration with adaptive level of detail
 * - For very short durations (< 1 min): "45s"
 * - For durations < 1 hour: "45m" or "45m 30s" if seconds > 0
 * - For durations >= 1 hour: "5h" or "5h 32m" if minutes > 0
 * - For long durations: accumulate all into hours, e.g., "124h 15m"
 *
 * @param duration Duration in seconds
 * @param includeSeconds Whether to include seconds for durations less than 1 hour
 */
export function formatDuration(duration: number, includeSeconds = true) {
    if (duration < 0) duration = 0;

    // Round to nearest second
    duration = Math.round(duration);

    // Convert everything to hours, minutes, seconds
    const totalHours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    let formatted = "";

    // For hour-level durations (including what would have been days)
    if (totalHours > 0) {
        formatted += `${totalHours}h`;
        if (minutes > 0) formatted += ` ${minutes}m`;
        return formatted;
    }

    // For minute-level durations
    if (minutes > 0) {
        formatted += `${minutes}m`;
        if (seconds > 0 && includeSeconds) formatted += ` ${seconds}s`;
        return formatted;
    }

    // For seconds-only durations
    return `${seconds}s`;
}

// Helper to compute consecutive-day streak ending at most recent play date
export function computeStreak(dates: Set<string>): number {
    if (dates.size === 0) return 0;
    // find latest date
    const current = Array.from(dates)
        .map((d) => new Date(d))
        .reduce((a, b) => (a > b ? a : b));
    let streak = 0;
    while (true) {
        const iso = current.toISOString().slice(0, 10);
        if (dates.has(iso)) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// Ordinal functions
const englishOrdinalRules = new Intl.PluralRules("en-US", { type: "ordinal" });
const suffixes = {
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
    zero: "",
    many: "",
};

export function ordinal(n: number) {
    const rule = englishOrdinalRules.select(n);
    return `${n}${suffixes[rule]}`;
}

// Tremor Raw cx [v0.0.0]

import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cx(...args: ClassValue[]) {
    return twMerge(clsx(...args));
}

// Shadcn
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Tremor Raw focusInput [v0.0.1]

export const focusInput = [
    // base
    "focus:ring-2",
    // ring color
    "focus:ring-ring focus:dark:ring-ring/30",
    // border color
    "focus:border-border focus:dark:border-border",
];

// Tremor Raw focusRing [v0.0.1]

export const focusRing = [
    // base
    "outline outline-offset-2 outline-0 focus-visible:outline-2",
    // outline color
    "outline-ring dark:outline-ring",
];

// Tremor Raw hasErrorInput [v0.0.1]

export const hasErrorInput = [
    // base
    "ring-2",
    // border color
    "border-red-500 dark:border-red-700",
    // ring color
    "ring-red-200 dark:ring-red-700/30",
];
