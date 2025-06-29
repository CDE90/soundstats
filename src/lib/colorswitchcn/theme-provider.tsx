"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { ThemeMode, ThemeState, ThemeProviderProps } from "./types";
import { defaultThemeState, getPresetThemeStyles } from "./theme-presets";
import { applyTheme } from "./fix-global-css";

// Theme context type
type ThemeContextType = {
    themeState: ThemeState;
    resolvedTheme: "light" | "dark";
    setThemeMode: (mode: ThemeMode) => void;
    applyThemePreset: (preset: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom theme provider component
export function CustomThemeProvider({
    children,
    defaultPreset,
}: ThemeProviderProps) {
    // State to track theme
    const [themeState, setThemeState] = useState<ThemeState>(defaultThemeState);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize theme from localStorage or system preference if available
    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const savedTheme = localStorage.getItem(
                "theme-mode",
            ) as ThemeMode | null;
            const savedPreset =
                localStorage.getItem("theme-preset") ??
                defaultPreset ??
                "default";

            // System preference for dark mode
            const initialMode = savedTheme ?? "system";

            // Set initial theme state
            const initialState = {
                currentMode: initialMode,
                preset: savedPreset,
                styles: getPresetThemeStyles(savedPreset),
            };

            console.log("Initializing theme:", initialState);
            setThemeState(initialState);
            setIsInitialized(true);

            // Apply initial theme styles
            applyTheme(initialState);
        } catch (error) {
            console.error("Error initializing theme:", error);
            // Fallback to default theme
            setThemeState(defaultThemeState);
            setIsInitialized(true);
            applyTheme(defaultThemeState);
        }
    }, [defaultPreset]);

    // Listen for system theme changes when using system mode
    useEffect(() => {
        if (typeof window === "undefined" || !isInitialized) return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleSystemThemeChange = (_e: MediaQueryListEvent) => {
            if (themeState.currentMode === "system") {
                // Force re-render to apply system theme
                setThemeState((prev) => ({ ...prev }));
            }
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener("change", handleSystemThemeChange);
        };
    }, [themeState.currentMode, isInitialized]);

    // Apply theme whenever it changes
    useEffect(() => {
        if (typeof window === "undefined" || !isInitialized) return;

        try {
            // Save preferences
            localStorage.setItem("theme-mode", themeState.currentMode);
            localStorage.setItem("theme-preset", themeState.preset);

            // Apply the theme styles
            applyTheme(themeState);

            console.log(
                `Theme applied: ${themeState.preset}, mode: ${themeState.currentMode}`,
                themeState,
            );
        } catch (error) {
            console.error("Error applying theme:", error);
        }
    }, [themeState, isInitialized]);

    // Change theme mode (light/dark)
    const setThemeMode = (mode: ThemeMode) => {
        console.log(`Setting theme mode: ${mode}`);
        setThemeState((prev) => ({
            ...prev,
            currentMode: mode,
        }));
    };

    // Apply a theme preset
    const applyThemePreset = (preset: string) => {
        console.log(`Applying preset: ${preset}`);
        try {
            const newStyles = getPresetThemeStyles(preset);

            setThemeState((prev) => ({
                ...prev,
                preset,
                styles: newStyles,
            }));
        } catch (error) {
            console.error(`Error applying preset ${preset}:`, error);
        }
    };

    // Calculate resolved theme (system -> actual light/dark)
    const resolvedTheme: "light" | "dark" = React.useMemo(() => {
        if (typeof window === "undefined") return "light";

        if (themeState.currentMode === "system") {
            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }

        return themeState.currentMode;
    }, [themeState.currentMode]);

    // Provider value
    const value = {
        themeState,
        resolvedTheme,
        setThemeMode,
        applyThemePreset,
    };

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

// Hook to access theme context
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a CustomThemeProvider");
    }
    return context;
}
