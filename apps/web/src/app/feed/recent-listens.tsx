"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/page-layout";
import { SpotifyWordmark } from "@/components/spotify-wordmark";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFullTimestamp, timeAgo } from "@/lib/utils";
import { Music } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useSearchParams } from "next/navigation";
import { getRecentListens, type RecentListen } from "./actions";

const LISTENS_PER_PAGE = 10;

function TimestampWithTooltip({
    timestamp,
    className,
}: {
    timestamp: string | Date | number;
    className: string;
}) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <time
                        dateTime={new Date(timestamp).toISOString()}
                        tabIndex={0}
                        className={`cursor-pointer text-xs text-muted-foreground ${className}`}
                    >
                        {timeAgo(new Date(timestamp))}
                    </time>
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
    const searchParams = useSearchParams();
    const [offset, setOffset] = useState(LISTENS_PER_PAGE);
    const [listens, setListens] = useState<RecentListen[]>(initialState);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [scrollTrigger, isInView] = useInView();
    const [lastFilterParam, setLastFilterParam] = useState(
        searchParams.get("filter"),
    );

    const getFilteredUserIds = () => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
            return filterParam.split(",").filter(Boolean);
        }
        return undefined;
    };

    async function loadMoreListens() {
        if (!hasMoreData) return;

        const filteredUserIds = getFilteredUserIds();
        const newListens = await getRecentListens(
            offset,
            LISTENS_PER_PAGE,
            filteredUserIds,
        );

        if (newListens.length === 0) {
            setHasMoreData(false);
        }

        setListens((listens) => [...listens, ...newListens]);
        setOffset((offset) => offset + LISTENS_PER_PAGE);
    }

    async function reloadListens() {
        const filteredUserIds = getFilteredUserIds();
        const newListens = await getRecentListens(
            0,
            LISTENS_PER_PAGE,
            filteredUserIds,
        );
        setListens(newListens);
        setOffset(LISTENS_PER_PAGE);
        setHasMoreData(true);
    }

    useEffect(() => {
        if (isInView && hasMoreData) {
            void loadMoreListens();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInView, hasMoreData]);

    useEffect(() => {
        const currentFilterParam = searchParams.get("filter");
        if (currentFilterParam !== lastFilterParam) {
            setLastFilterParam(currentFilterParam);
            void reloadListens();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    return (
        <section
            className="ss-recent-listens"
            aria-labelledby="recent-listens-title"
        >
            <div className="ss-feed-section-heading">
                <div>
                    <h2 id="recent-listens-title">Recently played</h2>
                    <p>The songs making their way around your circle.</p>
                </div>
                <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-music-source"
                >
                    <SpotifyWordmark width={79} />
                </a>
            </div>
            {listens.length === 0 && (
                <EmptyState
                    title="Your feed is waiting for its first track."
                    description="Choose more people in the filter, or find friends to see what they’re playing."
                />
            )}
            <div className="ss-listen-list">
                {listens.map((listen) => (
                    <article key={listen.id} className="ss-listen-row">
                        <a
                            href={`https://open.spotify.com/track/${listen.trackId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${listen.song} in Spotify`}
                            className="shrink-0 rounded-lg"
                        >
                            {listen.albumImage ? (
                                <Image
                                    src={listen.albumImage}
                                    alt={`${listen.song} artwork`}
                                    width={64}
                                    height={64}
                                    className="h-16 w-16 rounded-[4px] object-contain lg:rounded-[8px]"
                                />
                            ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                                    <Music size={25} aria-hidden="true" />
                                </div>
                            )}
                        </a>
                        <div className="min-w-0 flex-1">
                            <a
                                href={`https://open.spotify.com/track/${listen.trackId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${listen.song} by ${listen.artist}`}
                                className="block hover:underline"
                            >
                                <h3 className="line-clamp-2 text-base font-medium">
                                    {listen.song}
                                </h3>
                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                    {listen.artist}
                                </p>
                            </a>
                            <div className="ss-listener-name mt-3">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={listen.avatar} alt="" />
                                    <AvatarFallback>
                                        {listen.user[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{listen.user}</span>
                                <TimestampWithTooltip
                                    timestamp={listen.timestamp}
                                    className="ss-feed-mobile-time"
                                />
                            </div>
                        </div>
                        <TimestampWithTooltip
                            timestamp={listen.timestamp}
                            className="ss-feed-desktop-time"
                        />
                    </article>
                ))}
            </div>
            {hasMoreData && <div ref={scrollTrigger} className="h-4" />}
        </section>
    );
}
