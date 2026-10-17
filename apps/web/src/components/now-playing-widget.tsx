"use client";

import { TimeProgress } from "@/components/time-progress";
import { SpotifyWordmark } from "@/components/spotify-wordmark";
import { Button } from "@/components/ui/button";
import { type PlaybackState } from "@/server/spotify/types";
import { useUser } from "@clerk/nextjs";
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from "@tanstack/react-query";
import { Music, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function NowPlayingWidget() {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={queryClient}>
            <NowPlayingWidgetInner />
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
    const [isVisible, setIsVisible] = useState(true);
    const { data } = useQuery({
        queryKey: ["nowPlaying"],
        queryFn: getNowPlaying,
        refetchInterval: 20_000,
        enabled: isVisible && isLoaded && isSignedIn,
    });
    const playing = data?.currentlyPlaying;
    if (!playing?.item || playing.item.type === "episode") return null;

    if (!isVisible) {
        return (
            <div className="fixed bottom-4 right-4 z-40">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsVisible(true)}
                    className="h-11 w-11 rounded-full bg-card shadow-sm"
                    aria-label="Show now playing"
                >
                    <Music aria-hidden="true" />
                </Button>
            </div>
        );
    }

    const track = playing.item;
    return (
        <aside
            aria-label="Now playing on Spotify"
            className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-32px)] rounded-xl border bg-card p-4 text-card-foreground shadow-lg"
        >
            <div className="mb-3 flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                    Now playing
                </span>
                <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto"
                >
                    <SpotifyWordmark width={65} />
                </a>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsVisible(false)}
                    aria-label="Minimise now playing"
                >
                    <X aria-hidden="true" />
                </Button>
            </div>
            <div className="flex items-center gap-3">
                <a
                    href={`https://open.spotify.com/track/${track.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                    aria-label={`Open ${track.name} in Spotify`}
                >
                    {track.album.images[0]?.url ? (
                        <Image
                            src={track.album.images[0].url}
                            alt={`${track.name} artwork`}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-[4px] object-contain lg:rounded-[8px]"
                        />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                            <Music aria-hidden="true" />
                        </div>
                    )}
                </a>
                <div className="min-w-0 flex-1">
                    <Link
                        href={`https://open.spotify.com/track/${track.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={track.name}
                        className="block truncate text-sm font-medium hover:underline"
                    >
                        {track.name}
                    </Link>
                    {track.artists.map((artist) => (
                        <Link
                            key={artist.id}
                            href={`https://open.spotify.com/artist/${artist.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block truncate text-xs text-muted-foreground hover:underline"
                        >
                            {artist.name}
                        </Link>
                    ))}
                </div>
            </div>
            <TimeProgress
                startMs={playing.progress_ms}
                endMs={track.duration_ms}
                uniqueKey={track.id}
                className="mt-4"
                style={{
                    "--progress-background": "hsl(var(--secondary))",
                    "--progress-foreground": "hsl(var(--primary))",
                }}
            />
        </aside>
    );
}
