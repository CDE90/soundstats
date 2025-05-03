"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Define interface for CSS custom properties
interface CustomCSSProperties extends React.CSSProperties {
    "--progress-background"?: string;
    "--progress-foreground"?: string;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TimeProgress({
    startMs,
    endMs,
    uniqueKey,
    className,
    style,
}: Readonly<{
    startMs: number;
    endMs: number;
    uniqueKey?: string;
    className?: string;
    style?: CustomCSSProperties;
}>) {
    const [currentMs, setCurrentMs] = useState(startMs);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMs((currentMs) => Math.min(currentMs + 1000, endMs));
        }, 1000);

        return () => clearInterval(interval);
    }, [endMs]);

    useEffect(() => {
        setCurrentMs(startMs);
    }, [startMs, uniqueKey]);

    return (
        <div className={cn("space-y-1", className)} style={style}>
            <div
                className="flex flex-row items-center justify-between gap-2 text-xs"
                style={{
                    color:
                        style?.["--progress-foreground"] ??
                        "var(--muted-foreground)",
                }}
            >
                <span className="min-w-8 font-mono">
                    {formatTime(currentMs)}
                </span>
                <div
                    className="relative h-1.5 w-full overflow-hidden rounded-full"
                    style={{
                        backgroundColor:
                            style?.["--progress-background"] ??
                            "rgba(100,100,100,0.2)",
                    }}
                >
                    <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{
                            width: `${(currentMs / endMs) * 100}%`,
                            backgroundColor:
                                style?.["--progress-foreground"] ??
                                "currentColor",
                        }}
                    />
                </div>
                <span className="min-w-8 text-right font-mono">
                    {formatTime(endMs)}
                </span>
            </div>
        </div>
    );
}
