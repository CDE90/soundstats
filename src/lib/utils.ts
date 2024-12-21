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
