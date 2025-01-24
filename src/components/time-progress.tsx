"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
}: Readonly<{
    startMs: number;
    endMs: number;
    uniqueKey?: string;
    className?: string;
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
        <div className={cn("space-y-1", className)}>
            <div className="flex flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="min-w-8 font-mono">
                    {formatTime(currentMs)}
                </span>
                <Progress value={(currentMs / endMs) * 100} className="h-1" />
                <span className="min-w-8 text-right font-mono">
                    {formatTime(endMs)}
                </span>
            </div>
        </div>
    );
}
