"use client";

import { TimeProgress } from "@/components/time-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useState } from "react";

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
    const [isVisible, setIsVisible] = useState(true);
    const { data: nowPlaying } = useQuery({
        queryKey: ["nowPlaying"],
        queryFn: getNowPlaying,
        refetchInterval: 1000 * 20,
        enabled: isVisible && isLoaded && isSignedIn, // Only run the query when the widget is visible and the user is signed in
    });

    const currentlyPlaying = nowPlaying?.currentlyPlaying;

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
            <Card className="w-64 bg-background shadow-md">
                <CardContent className="p-4">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsVisible(false)}
                            className="absolute -right-2 -top-2 z-50 h-8 w-8 rounded-full"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <Link
                            href={`https://open.spotify.com/track/${currentlyPlaying.item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-4 transition-opacity hover:opacity-80"
                        >
                            {currentlyPlaying.item.album.images[0]?.url ? (
                                <Image
                                    src={
                                        currentlyPlaying.item.album.images[0]
                                            .url
                                    }
                                    alt={`${currentlyPlaying.item.name} album cover`}
                                    className="rounded-sm object-cover"
                                    width={64}
                                    height={64}
                                />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-muted">
                                    <Music className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {currentlyPlaying.item.name}
                                </p>
                                <p className="truncate text-sm text-muted-foreground decoration-muted-foreground">
                                    {currentlyPlaying.item.artists[0]?.name ??
                                        ""}
                                </p>
                            </div>
                        </Link>

                        <TimeProgress
                            startMs={currentlyPlaying.progress_ms}
                            endMs={currentlyPlaying.item.duration_ms}
                            className="mt-2"
                            uniqueKey={currentlyPlaying.item.id}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
