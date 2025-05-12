"use client";

import { TimeProgress } from "@/components/time-progress";
import { Button } from "@/components/ui/button";
import { type PlaybackState } from "@/server/spotify/types";
import { useUser } from "@clerk/nextjs";
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Music, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import ColorThief from "colorthief";
import { useTheme } from "next-themes";

export function NowPlayingWidget() {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <NowPlayingWidgetInner />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

interface NowPlaying {
    userId: string;
    currentlyPlaying: PlaybackState;
}

async function getNowPlaying() {
    return (await fetch("/api/fetch-now-playing").then((res) =>
        res.json(),
    )) as Promise<NowPlaying>;
}

function NowPlayingWidgetInner() {
    const { isSignedIn, isLoaded } = useUser();
    const { resolvedTheme: theme } = useTheme();
    const [isVisible, setIsVisible] = useState(true);
    const [gradientBg, setGradientBg] = useState<string | null>(null);
    const [textColor, setTextColor] = useState<string>("text-foreground");
    const imageRef = useRef<HTMLImageElement>(null);

    const { data: nowPlaying } = useQuery({
        queryKey: ["nowPlaying"],
        queryFn: getNowPlaying,
        refetchInterval: 1000 * 20,
        enabled: isVisible && isLoaded && isSignedIn, // Only run the query when the widget is visible and the user is signed in
    });

    const currentlyPlaying = nowPlaying?.currentlyPlaying;

    // Function to extract dominant color from album artwork
    const extractColor = useCallback(() => {
        if (imageRef.current?.complete) {
            try {
                const colorThief = new ColorThief();

                // Get a palette of colors from the image
                const palette = colorThief.getPalette(imageRef.current, 8);

                // Extract main colors for our scheme
                const dominantColor = palette?.[0] ?? [0, 0, 0];
                const secondaryColor = palette?.[1] ??
                    palette?.[0] ?? [0, 0, 0];

                const [r, g, b] = dominantColor;
                const [r2, g2, b2] = secondaryColor;

                // Helper function to convert RGB to HSL
                const rgbToHsl = (r: number, g: number, b: number) => {
                    const rNorm = r / 255;
                    const gNorm = g / 255;
                    const bNorm = b / 255;
                    const max = Math.max(rNorm, gNorm, bNorm);
                    const min = Math.min(rNorm, gNorm, bNorm);
                    const l = (max + min) / 2;
                    let h = 0;
                    let s = 0;

                    if (max !== min) {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        if (max === rNorm) {
                            h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
                        } else if (max === gNorm) {
                            h = (bNorm - rNorm) / d + 2;
                        } else {
                            h = (rNorm - gNorm) / d + 4;
                        }
                        h /= 6;
                    }

                    return { h, s, l };
                };

                // Helper function to convert HSL to RGB
                const hslToRgb = (h: number, s: number, l: number) => {
                    let r, g, b;

                    const hue2rgb = (p: number, q: number, t: number) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1 / 6) return p + (q - p) * 6 * t;
                        if (t < 1 / 2) return q;
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    };

                    if (s === 0) {
                        r = g = b = l; // achromatic
                    } else {
                        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        const p = 2 * l - q;
                        r = hue2rgb(p, q, h + 1 / 3);
                        g = hue2rgb(p, q, h);
                        b = hue2rgb(p, q, h - 1 / 3);
                    }

                    return {
                        r: Math.round(r * 255),
                        g: Math.round(g * 255),
                        b: Math.round(b * 255),
                    };
                };

                // Helper to convert RGB to HEX
                const rgbToHex = (r: number, g: number, b: number) => {
                    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                };

                const isDark = theme === "dark";

                // Process primary color
                const hsl1 = rgbToHsl(r, g, b);

                // Process secondary color
                const hsl2 = rgbToHsl(r2, g2, b2);

                // Adjust colors based on theme and for better visual appeal

                // For light mode: make colors more vibrant, increase saturation
                // For dark mode: make colors more subdued, decrease brightness

                // Primary color adjustments
                const primaryHsl = {
                    h: hsl1.h,
                    s: isDark
                        ? Math.max(0.1, hsl1.s * 0.7) // Less saturation in dark mode
                        : Math.min(0.9, hsl1.s * 1.3), // More saturation in light mode
                    l: isDark
                        ? Math.max(0.1, hsl1.l * 0.85) // Darker for dark mode
                        : Math.min(0.9, hsl1.l * 1.1), // Brighter for light mode
                };

                // Secondary color adjustments (slightly different to create nice gradient)
                const secondaryHsl = {
                    h: hsl2.h,
                    s: isDark
                        ? Math.max(0.1, hsl2.s * 0.7) // Less saturation in dark mode
                        : Math.min(0.9, hsl2.s * 1.4), // More saturation in light mode
                    l: isDark
                        ? Math.max(0.05, hsl2.l * 0.75) // Darker for dark mode
                        : Math.min(0.95, hsl2.l * 1.15), // Brighter for light mode
                };

                // Convert back to RGB
                const primaryRgb = hslToRgb(
                    primaryHsl.h,
                    primaryHsl.s,
                    primaryHsl.l,
                );
                const secondaryRgb = hslToRgb(
                    secondaryHsl.h,
                    secondaryHsl.s,
                    secondaryHsl.l,
                );

                // Create hex colors for background and gradient
                const primaryHex = rgbToHex(
                    primaryRgb.r,
                    primaryRgb.g,
                    primaryRgb.b,
                );
                const secondaryHex = rgbToHex(
                    secondaryRgb.r,
                    secondaryRgb.g,
                    secondaryRgb.b,
                );

                // Create a gradient background
                setGradientBg(
                    `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
                );

                // Calculate luminance to determine text color (black or white)
                // Use a more aggressive threshold for better contrast
                const luminance =
                    (0.299 * primaryRgb.r +
                        0.587 * primaryRgb.g +
                        0.114 * primaryRgb.b) /
                    255;
                setTextColor(luminance > 0.6 ? "text-black" : "text-white");
            } catch (error) {
                console.error("Error extracting color:", error);
                setGradientBg(null);
                setTextColor("text-foreground");
            }
        }
    }, [imageRef, theme]);

    // Listen for image load to extract color
    useEffect(() => {
        // Reset colors when track changes
        setGradientBg(null);
        setTextColor("text-foreground");

        // Extract colors after image has loaded
        const currentRef = imageRef.current;
        if (currentRef) {
            if (currentRef.complete) {
                extractColor();
            } else {
                currentRef.onload = extractColor;
            }
        }

        return () => {
            if (currentRef) {
                currentRef.onload = null;
            }
        };
    }, [currentlyPlaying?.item?.id, extractColor]);

    // Re-extract colors when theme changes
    useEffect(() => {
        if (currentlyPlaying?.item?.id && imageRef.current?.complete) {
            extractColor();
        }
    }, [theme, currentlyPlaying?.item?.id, extractColor]);

    if (!currentlyPlaying) return null;
    if (!currentlyPlaying.item || currentlyPlaying.item.type === "episode")
        return null;

    if (!isVisible) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setIsVisible(true)}
                    className="h-10 w-10 rounded-full shadow-md"
                >
                    <Music className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div
                className="w-72 overflow-hidden rounded-xl shadow-lg transition-colors duration-300"
                style={
                    gradientBg
                        ? {
                              background: gradientBg,
                              boxShadow:
                                  textColor === "text-black"
                                      ? "0 4px 12px rgba(0, 0, 0, 0.15)"
                                      : "0 4px 12px rgba(0, 0, 0, 0.25)",
                          }
                        : undefined
                }
            >
                <div className="p-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsVisible(false)}
                            className="absolute -right-2 -top-2 z-50 flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur-md"
                            style={{
                                backgroundColor:
                                    textColor === "text-black"
                                        ? "rgba(255, 255, 255, 0.4)"
                                        : "rgba(0, 0, 0, 0.4)",
                                color:
                                    textColor === "text-black"
                                        ? "#000000"
                                        : "#ffffff",
                                border:
                                    textColor === "text-black"
                                        ? "1px solid rgba(0, 0, 0, 0.1)"
                                        : "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <div className="flex gap-3">
                            <Link
                                href={`https://open.spotify.com/track/${currentlyPlaying.item.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0"
                            >
                                {currentlyPlaying.item.album.images[0]?.url ? (
                                    <Image
                                        ref={imageRef}
                                        src={
                                            currentlyPlaying.item.album
                                                .images[0].url
                                        }
                                        alt={`${currentlyPlaying.item.name} album cover`}
                                        className="rounded-[2px] object-cover sm:rounded-[4px]"
                                        width={72}
                                        height={72}
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[2px] bg-muted sm:rounded-[4px]">
                                        <Music className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                            </Link>

                            <div className="flex min-w-0 flex-1 flex-col">
                                <div className="flex items-center">
                                    <Link
                                        href="https://open.spotify.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center transition-opacity hover:opacity-100"
                                        style={{
                                            opacity: 0.8,
                                            filter:
                                                textColor === "text-black"
                                                    ? "brightness(0)" // Black icon
                                                    : "brightness(10)", // White icon
                                        }}
                                    >
                                        <Image
                                            src="/spotify-assets/Spotify_Icon_RGB_White.png"
                                            alt="Spotify"
                                            width={21}
                                            height={21}
                                        />
                                    </Link>
                                </div>

                                <Link
                                    href={`https://open.spotify.com/track/${currentlyPlaying.item.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 truncate text-sm font-medium hover:underline"
                                    style={{
                                        color:
                                            textColor === "text-black"
                                                ? "#000000"
                                                : "#ffffff",
                                        fontWeight: 600,
                                    }}
                                >
                                    {currentlyPlaying.item.name}
                                </Link>

                                <Link
                                    href={`https://open.spotify.com/artist/${currentlyPlaying.item.artists[0]?.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate text-sm hover:underline"
                                    style={{
                                        color:
                                            textColor === "text-black"
                                                ? "#555555"
                                                : "#dddddd",
                                    }}
                                >
                                    {currentlyPlaying.item.artists[0]?.name ??
                                        ""}
                                </Link>
                            </div>
                        </div>

                        <TimeProgress
                            startMs={currentlyPlaying.progress_ms}
                            endMs={currentlyPlaying.item.duration_ms}
                            className="mt-3"
                            uniqueKey={currentlyPlaying.item.id}
                            style={{
                                "--progress-background":
                                    textColor === "text-black"
                                        ? "rgba(0,0,0,0.15)"
                                        : "rgba(255,255,255,0.15)",
                                "--progress-foreground":
                                    textColor === "text-black"
                                        ? "rgba(0,0,0,0.85)"
                                        : "rgba(255,255,255,0.85)",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
