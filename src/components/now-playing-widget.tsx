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
    const [imageLoaded, setImageLoaded] = useState(false);
    const { isSignedIn, isLoaded } = useUser();
    const { resolvedTheme: theme } = useTheme();
    const [isVisible, setIsVisible] = useState(true);
    // Default gradient that matches Spotify brand colors
    const defaultGradient =
        theme === "dark"
            ? "linear-gradient(135deg, #1DB954 0%, #191414 100%)"
            : "linear-gradient(135deg, #1DB954 0%, #FFFFFF 100%)";
    const [gradientBg, setGradientBg] = useState<string>(defaultGradient);
    const [textColor, setTextColor] = useState<string>(
        theme === "dark" ? "text-white" : "text-black",
    );
    const imageRef = useRef<HTMLImageElement>(null);
    // Store previous gradient to prevent flashing during theme changes
    const prevGradientRef = useRef<string>(defaultGradient);

    const { data: nowPlaying } = useQuery({
        queryKey: ["nowPlaying"],
        queryFn: getNowPlaying,
        refetchInterval: 1000 * 20,
        enabled: isVisible && isLoaded && isSignedIn, // Only run the query when the widget is visible and the user is signed in
    });

    const currentlyPlaying = nowPlaying?.currentlyPlaying;

    // Function to extract dominant color from album artwork
    const extractColor = useCallback(() => {
        if (!imageRef.current) return;

        // Make sure the image is completely loaded and has dimensions
        if (!imageRef.current.complete || !imageRef.current.naturalWidth) {
            return;
        }

        try {
            const colorThief = new ColorThief();

            // Create a canvas to ensure image is properly decoded
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const img = imageRef.current;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            // Attempt to get palette after ensuring image is properly decoded
            const palette = colorThief.getPalette(img, 8);

            // Extract main colors for our scheme
            const dominantColor = palette?.[0] ?? [0, 0, 0];
            const secondaryColor = palette?.[1] ?? palette?.[0] ?? [0, 0, 0];

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

            // Primary color adjustments - ensure good contrast with text
            const primaryHsl = {
                h: hsl1.h,
                s: isDark
                    ? Math.max(0.2, hsl1.s * 0.8) // Moderate saturation in dark mode
                    : Math.min(0.85, hsl1.s * 1.2), // Moderate saturation in light mode
                l: isDark
                    ? Math.min(0.4, Math.max(0.15, hsl1.l * 0.9)) // Keep darker for dark mode but not too dark
                    : Math.max(0.6, Math.min(0.9, hsl1.l * 1.1)), // Keep lighter for light mode but not too light
            };

            // Secondary color adjustments - ensure good contrast with text
            const secondaryHsl = {
                h: hsl2.h,
                s: isDark
                    ? Math.max(0.2, hsl2.s * 0.8) // Moderate saturation in dark mode
                    : Math.min(0.85, hsl2.s * 1.2), // Moderate saturation in light mode
                l: isDark
                    ? Math.min(0.35, Math.max(0.1, hsl2.l * 0.85)) // Keep darker for dark mode but not too dark
                    : Math.max(0.65, Math.min(0.9, hsl2.l * 1.15)), // Keep lighter for light mode but not too light
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
            const newGradient = `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 100%)`;
            setGradientBg(newGradient);
            // Save this gradient for future reference
            prevGradientRef.current = newGradient;

            // Calculate luminance to determine text color (black or white)
            // Calculate luminance for both primary and secondary colors using standardized formula
            const primaryLuminance =
                (0.299 * primaryRgb.r +
                    0.587 * primaryRgb.g +
                    0.114 * primaryRgb.b) /
                255;
            const secondaryLuminance =
                (0.299 * secondaryRgb.r +
                    0.587 * secondaryRgb.g +
                    0.114 * secondaryRgb.b) /
                255;

            // Use a weighted average that emphasizes the primary color
            // since that's where most of the text will appear
            const averageLuminance =
                primaryLuminance * 0.7 + secondaryLuminance * 0.3;

            // Use WCAG contrast standards to choose text color
            // The threshold of 0.55 gives good contrast (4.5:1 ratio or better)
            const useDarkText = averageLuminance > 0.55;

            setTextColor(useDarkText ? "text-black" : "text-white");
        } catch (error) {
            console.error("Error extracting color:", error);
            // Use previous gradient if available, otherwise fall back to default
            if (prevGradientRef.current !== defaultGradient) {
                setGradientBg(prevGradientRef.current);
            } else {
                setGradientBg(defaultGradient);
            }
            setTextColor(theme === "dark" ? "text-white" : "text-black");
        }
    }, [theme, defaultGradient]);

    // Listen for image load to extract color
    useEffect(() => {
        // Reset state when track changes, but keep previous gradient to prevent flashing
        setImageLoaded(false);

        // If there's a previous custom gradient, keep using it rather than flashing to default
        if (prevGradientRef.current !== defaultGradient) {
            setGradientBg(prevGradientRef.current);
        } else {
            setGradientBg(defaultGradient);
        }

        setTextColor(theme === "dark" ? "text-white" : "text-black");

        const currentRef = imageRef.current;
        if (!currentRef) return;

        // Function to handle image load event
        const handleImageLoad = () => {
            // Sometimes naturalWidth is not immediately available even when complete is true
            // This ensures we only extract colors when the image is fully decoded
            if (currentRef.complete && currentRef.naturalWidth) {
                setImageLoaded(true);
                // Small timeout to ensure the image is fully decoded
                setTimeout(extractColor, 50);
            }
        };

        // Check immediately if image is already loaded
        if (currentRef.complete && currentRef.naturalWidth) {
            setImageLoaded(true);
            setTimeout(extractColor, 50);
        } else {
            // Otherwise wait for the load event
            currentRef.onload = handleImageLoad;
        }

        return () => {
            if (currentRef) {
                currentRef.onload = null;
            }
        };
    }, [currentlyPlaying?.item?.id, extractColor, defaultGradient, theme]);

    // Re-extract colors when theme changes
    useEffect(() => {
        // Don't reset gradient to default when only theme changes
        // Just update text color based on current theme until extraction completes
        if (theme === "dark") {
            setTextColor("text-white");
        } else {
            setTextColor("text-black");
        }

        if (
            currentlyPlaying?.item?.id &&
            imageLoaded &&
            imageRef.current?.complete &&
            imageRef.current?.naturalWidth
        ) {
            // Use setTimeout to ensure this runs after any rendering updates
            setTimeout(extractColor, 50);
        }
    }, [
        theme,
        imageLoaded,
        currentlyPlaying?.item?.id,
        extractColor,
        defaultGradient,
    ]);

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
                                        priority={true}
                                        onLoad={() => {
                                            if (
                                                imageRef.current?.complete &&
                                                !imageLoaded
                                            ) {
                                                setImageLoaded(true);
                                                setTimeout(extractColor, 50);
                                            }
                                        }}
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
