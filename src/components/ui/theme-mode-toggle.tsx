"use client";

import type * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/colorswitchcn/theme-provider";

export interface ThemeModeToggleProps {
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function ThemeModeToggle({
    variant = "outline",
    size = "icon",
    className = "",
}: ThemeModeToggleProps) {
    const { themeState, setThemeMode } = useTheme();
    const isDarkMode = themeState.currentMode === "dark";

    const toggleTheme = () => {
        const newMode = isDarkMode ? "light" : "dark";
        setThemeMode(newMode);
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={toggleTheme}
            aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}
            className={`transition-all hover:scale-105 active:scale-95 ${className}`}
        >
            {isDarkMode ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
        </Button>
    );
}
