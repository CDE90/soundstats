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

export function formatDuration(duration: number) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    let formatted = "";
    if (hours > 0) {
        formatted += `${hours}h `;
    }
    if (minutes > 0 || hours > 0) {
        formatted += `${minutes}m `;
    }
    if (seconds > 0 || minutes > 0 || hours > 0) {
        formatted += `${seconds}s`;
    }
    if (formatted === "") {
        return "0m 0s";
    }
    return formatted.trim();
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
