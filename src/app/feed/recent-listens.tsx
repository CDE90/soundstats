"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFullTimestamp, timeAgo } from "@/lib/utils";
import { Music } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { getRecentListens, type RecentListen } from "./actions";
import { useLogger } from "@/lib/axiom/client";

const LISTENS_PER_PAGE = 10;

function TimestampWithTooltip({
    timestamp,
    className,
}: {
    timestamp: string | Date;
    className: string;
}) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <p
                        className={`cursor-pointer text-xs text-muted-foreground ${className}`}
                    >
                        {timeAgo(new Date(timestamp))}
                    </p>
                </TooltipTrigger>
                <TooltipContent>
                    {formatFullTimestamp(new Date(timestamp))}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function RecentListens({
    initialState,
}: Readonly<{ initialState: RecentListen[] }>) {
    const log = useLogger();
    const [offset, setOffset] = useState(LISTENS_PER_PAGE);
    const [listens, setListens] = useState<RecentListen[]>(initialState);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [scrollTrigger, isInView] = useInView();

    // Log component initialization
    useEffect(() => {
        log.info("Recent listens component initialized", {
            initialListensCount: initialState.length,
            hasInitialData: initialState.length > 0
        });
    }, [log, initialState.length]);

    async function loadMoreListens() {
        if (!hasMoreData) return;

        log.debug("Loading more recent listens", {
            currentOffset: offset,
            currentListensCount: listens.length,
            requestSize: LISTENS_PER_PAGE
        });

        try {
            const newListens = await getRecentListens(offset, LISTENS_PER_PAGE);

            if (newListens.length === 0) {
                log.info("No more recent listens available", {
                    finalOffset: offset,
                    totalListensLoaded: listens.length
                });
                setHasMoreData(false);
            } else {
                log.info("Additional recent listens loaded", {
                    newListensCount: newListens.length,
                    totalListensAfterLoad: listens.length + newListens.length,
                    nextOffset: offset + LISTENS_PER_PAGE
                });
            }

            setListens((listens) => [...listens, ...newListens]);
            setOffset((offset) => offset + LISTENS_PER_PAGE);
        } catch (error) {
            log.error("Failed to load more recent listens", {
                currentOffset: offset,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    useEffect(() => {
        if (isInView && hasMoreData) {
            log.debug("Infinite scroll triggered", {
                isInView,
                hasMoreData,
                currentListensCount: listens.length
            });
            void loadMoreListens();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInView, hasMoreData, log]);

    return (
        <Card className="w-full">
            <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Recent Listens</h2>
                    <Link
                        href="https://open.spotify.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center opacity-80 transition-opacity hover:opacity-100"
                    >
                        <Image
                            src="/spotify-assets/Spotify_Full_Logo_RGB_Black.png"
                            alt="Spotify"
                            width={70}
                            height={21}
                            className="dark:hidden"
                        />
                        <Image
                            src="/spotify-assets/Spotify_Full_Logo_RGB_White.png"
                            alt="Spotify"
                            width={70}
                            height={21}
                            className="hidden dark:block"
                        />
                    </Link>
                </div>
                <div className="space-y-4 sm:space-y-6">
                    {listens.map((listen) => (
                        <div
                            key={listen.id}
                            className="flex gap-4 sm:items-center"
                        >
                            <div
                                className="relative flex-shrink-0"
                                style={{
                                    width: "clamp(72px, 20vw, 80px)",
                                    height: "clamp(60px, 16vw, 64px)",
                                }}
                            >
                                <Avatar className="absolute left-0 top-0 h-[52px] w-[52px] border border-border shadow-md sm:h-14 sm:w-14">
                                    <AvatarImage
                                        src={listen.avatar}
                                        alt={listen.user}
                                    />
                                    <AvatarFallback>
                                        {listen.user[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <Link
                                    href={`https://open.spotify.com/track/${listen.trackId}`}
                                    target="_blank"
                                    className="absolute bottom-0 right-0 h-9 w-9 overflow-hidden rounded-[2px] border border-border shadow-md sm:h-10 sm:w-10 sm:rounded-[4px]"
                                >
                                    {listen.albumImage ? (
                                        <Image
                                            src={listen.albumImage}
                                            alt={`${listen.song} album cover`}
                                            className="h-full w-full rounded-[2px] object-cover"
                                            height={40}
                                            width={40}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-[2px] bg-muted sm:rounded-[4px]">
                                            <Music className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
                                        </div>
                                    )}
                                </Link>
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="truncate text-sm font-medium sm:text-base">
                                    {listen.user}
                                </p>
                                <Link
                                    href={`https://open.spotify.com/track/${listen.trackId}`}
                                    target="_blank"
                                    className="hover:underline"
                                >
                                    <p className="truncate text-xs text-foreground sm:text-sm">
                                        {listen.song}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {listen.artist}
                                    </p>
                                </Link>
                                <p className="text-xs text-muted-foreground xs:hidden">
                                    {timeAgo(new Date(listen.timestamp))}
                                </p>
                            </div>
                            <TimestampWithTooltip
                                timestamp={new Date(listen.timestamp)}
                                className="hidden whitespace-nowrap xs:block"
                            />
                        </div>
                    ))}
                </div>

                {(hasMoreData && <div ref={scrollTrigger} />) || null}
            </CardContent>
        </Card>
    );
}
