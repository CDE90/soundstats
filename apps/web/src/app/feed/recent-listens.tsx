"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/page-layout";
import Link from "next/link";
import { SpotifyLink } from "@/components/spotify-link";
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
                        <Link
                            href={`/tracks/${encodeURIComponent(listen.trackId)}?${new URLSearchParams({ user: listen.userId })}`}
                            className="ss-feed-track-link"
                            title={`View listening details for ${listen.song}`}
                        >
                            {listen.albumImage ? (
                                <Image
                                    src={listen.albumImage}
                                    alt=""
                                    width={64}
                                    height={64}
                                    className="ss-feed-art"
                                />
                            ) : (
                                <span className="ss-feed-art ss-feed-art-placeholder">
                                    <Music size={25} aria-hidden="true" />
                                </span>
                            )}
                            <div className="min-w-0">
                                <h3 className="line-clamp-2 text-base font-medium">
                                    {listen.song}
                                </h3>
                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                    {listen.artist}
                                </p>
                                <div className="ss-listener-name mt-3">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage
                                            src={listen.avatar}
                                            alt=""
                                        />
                                        <AvatarFallback>
                                            {listen.user[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">
                                        {listen.user}
                                    </span>
                                </div>
                            </div>
                        </Link>
                        <TimestampWithTooltip
                            timestamp={listen.timestamp}
                            className="ss-feed-time"
                        />
                        {listen.trackId && (
                            <SpotifyLink
                                type="track"
                                id={listen.trackId}
                                name={listen.song}
                                className="ss-feed-source"
                            />
                        )}
                    </article>
                ))}
            </div>
            {hasMoreData && <div ref={scrollTrigger} className="h-4" />}
        </section>
    );
}
