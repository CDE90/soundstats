"use client";

import * as React from "react";
import { ThemeModeToggle } from "./theme-mode-toggle";
import { ThemePicker } from "./theme-picker";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/colorswitchcn/theme-provider";
import { useEffect, useState } from "react";

interface ColorThemeSwitcherProps {
    className?: string;
    align?: "start" | "center" | "end";
}

export function ColorThemeSwitcher({
    className,
    align = "center",
}: ColorThemeSwitcherProps) {
    const alignClass = {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
    };

    // Client-side only rendering guard
    const [mounted, setMounted] = useState(false);

    // Get theme state from the theme provider
    const { themeState } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Log when theme changes for debugging
    useEffect(() => {
        console.log("Theme state updated:", {
            mode: themeState.currentMode,
            preset: themeState.preset,
        });
    }, [themeState]);

    // Don't render until mounted to prevent hydration issues
    if (!mounted) {
        return (
            <div
                className={cn(
                    "flex items-center gap-2",
                    alignClass[align],
                    className,
                )}
            />
        );
    }

    // Pass down theme mode toggle props
    const themeModeToggleProps = {
        variant: "outline" as const,
        size: "icon" as const,
    };

    return (
        <div
            className={cn("flex flex-row gap-4", alignClass[align], className)}
        >
            <ThemeModeToggle {...themeModeToggleProps} />
            <ThemePicker />
        </div>
    );
}
