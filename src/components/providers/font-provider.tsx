"use client";

import { createContext, useContext, useEffect, useState } from "react";

type FontType = "geist" | "gosha";

interface FontContextType {
    font: FontType;
    setFont: (font: FontType) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }) {
    const [font, setFontState] = useState<FontType>("geist");
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Load font preference from localStorage and sync with current state
        const savedFont = localStorage.getItem("preferred-font") as FontType;
        if (savedFont && (savedFont === "geist" || savedFont === "gosha")) {
            setFontState(savedFont);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        // Only apply font changes after initialization to avoid conflicts with blocking script
        if (!isInitialized) return;

        const html = document.documentElement;

        // Remove existing font classes
        html.classList.remove("font-geist", "font-gosha");

        // Add current font class
        if (font === "gosha") {
            html.classList.add("font-gosha");
        } else {
            html.classList.add("font-geist");
        }
    }, [font, isInitialized]);

    const setFont = (newFont: FontType) => {
        setFontState(newFont);
        localStorage.setItem("preferred-font", newFont);
    };

    return (
        <FontContext.Provider value={{ font, setFont }}>
            {children}
        </FontContext.Provider>
    );
}

export function useFont() {
    const context = useContext(FontContext);
    if (context === undefined) {
        throw new Error("useFont must be used within a FontProvider");
    }
    return context;
}
