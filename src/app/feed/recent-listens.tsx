"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { timeAgo } from "@/lib/utils";
import { Music } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { getRecentListens, type RecentListen } from "./actions";

const LISTENS_PER_PAGE = 10;

export function RecentListens({
    initialState,
}: Readonly<{ initialState: RecentListen[] }>) {
    const [offset, setOffset] = useState(LISTENS_PER_PAGE);
    const [listens, setListens] = useState<RecentListen[]>(initialState);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [scrollTrigger, isInView] = useInView();

    async function loadMoreListens() {
        if (!hasMoreData) return;

        const newListens = await getRecentListens(offset, LISTENS_PER_PAGE);

        if (newListens.length === 0) {
            setHasMoreData(false);
        }

        setListens((listens) => [...listens, ...newListens]);
        setOffset((offset) => offset + LISTENS_PER_PAGE);
    }

    useEffect(() => {
        if (isInView && hasMoreData) {
            void loadMoreListens();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInView, hasMoreData]);

    // Format the full timestamp for the tooltip
    const formatFullTimestamp = (date: Date) => {
        return date.toLocaleString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    return (
        <Card className="w-full">
            <CardContent className="p-4">
                <h2 className="mb-4 text-xl font-semibold">Recent Listens</h2>
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
                                    className="absolute bottom-0 right-0 h-9 w-9 overflow-hidden rounded-sm border border-border shadow-md sm:h-10 sm:w-10"
                                >
                                    {listen.albumImage ? (
                                        <Image
                                            src={listen.albumImage}
                                            alt={`${listen.song} album cover`}
                                            className="h-full w-full object-cover"
                                            height={40}
                                            width={40}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center rounded-sm bg-muted">
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
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <p className="cursor-pointer text-xs text-muted-foreground xs:hidden">
                                                {timeAgo(
                                                    new Date(listen.timestamp),
                                                )}
                                            </p>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {formatFullTimestamp(
                                                new Date(listen.timestamp),
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <p className="hidden cursor-pointer whitespace-nowrap text-xs text-muted-foreground xs:block">
                                            {timeAgo(
                                                new Date(listen.timestamp),
                                            )}
                                        </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {formatFullTimestamp(
                                            new Date(listen.timestamp),
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ))}
                </div>

                {(hasMoreData && <div ref={scrollTrigger} />) || null}
            </CardContent>
        </Card>
    );
}
