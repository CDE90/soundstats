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
import { Loader2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useReducer, useRef } from "react";
import {
    createFeedPageState,
    feedPageReducer,
    FEED_PAGE_SIZE,
    getFeedEmptyState,
} from "./feed-state";
import { getRecentListens, type RecentListen } from "./actions";

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
    initialError = null,
    selectedUserIds,
    friendCount,
}: Readonly<{
    initialState: RecentListen[];
    initialError?: string | null;
    selectedUserIds: string[];
    friendCount: number;
}>) {
    const [state, dispatch] = useReducer(
        feedPageReducer,
        createFeedPageState(initialState, initialError),
    );
    const mounted = useRef(true);
    const request = useRef(0);
    const pending = useRef(false);
    const empty = getFeedEmptyState(selectedUserIds.length, friendCount);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    async function loadMoreListens() {
        if (pending.current || !state.hasMore) return;
        pending.current = true;
        const requestId = ++request.current;
        dispatch({ type: "start", requestId });
        try {
            const items = await getRecentListens(
                state.offset,
                FEED_PAGE_SIZE,
                selectedUserIds,
            );
            if (mounted.current)
                dispatch({ type: "success", requestId, items });
        } catch {
            if (mounted.current)
                dispatch({
                    type: "error",
                    requestId,
                    message: state.items.length
                        ? "More activity couldn’t load. Your current plays are still here."
                        : "Recent activity couldn’t load. Try again.",
                });
        } finally {
            pending.current = false;
        }
    }

    return (
        <section
            className="ss-recent-listens"
            aria-labelledby="recent-listens-title"
            aria-busy={state.requestId !== null}
        >
            <div className="ss-feed-section-heading">
                <div>
                    <h2 id="recent-listens-title">Recently played</h2>
                    <p>Last 24 hours · From the people selected above.</p>
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
            {state.items.length === 0 && !state.error && (
                <EmptyState title={empty.title} description={empty.description}>
                    <Button asChild variant="outline">
                        <Link href={empty.href}>{empty.action}</Link>
                    </Button>
                </EmptyState>
            )}
            <div className="ss-listen-list">
                {state.items.map((listen) => (
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
            <div className="mt-6 space-y-3">
                {state.error && <p role="alert">{state.error}</p>}
                {state.hasMore && selectedUserIds.length > 0 && (
                    <Button
                        variant="outline"
                        onClick={() => void loadMoreListens()}
                        disabled={state.requestId !== null}
                    >
                        {state.requestId !== null ? (
                            <>
                                <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                />{" "}
                                Loading activity…
                            </>
                        ) : state.error ? (
                            "Try again"
                        ) : (
                            "Load more activity"
                        )}
                    </Button>
                )}
                <p
                    role="status"
                    aria-live="polite"
                    className="text-sm text-muted-foreground"
                >
                    {state.requestId !== null
                        ? "Loading more activity…"
                        : state.items.length > 0 &&
                            !state.hasMore &&
                            !state.error
                          ? "You’re up to date for the last 24 hours."
                          : ""}
                </p>
            </div>
        </section>
    );
}
