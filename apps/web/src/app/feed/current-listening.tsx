import { EmptyState } from "@/components/page-layout";
import { SpotifyWordmark } from "@/components/spotify-wordmark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getUserPlaying } from "@/server/spotify/spotify";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, gte, inArray, sql } from "drizzle-orm";
import { Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getUserFriends } from "@/server/lib";

interface CurrentListener {
    id: string;
    name: string;
    avatar?: string;
    song: string;
    artist: string;
    trackId?: string;
    albumImage?: string;
}

export async function CurrentListeners() {
    // Get the current user ID
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
        return (
            <Card className="w-full overflow-hidden">
                <CardContent className="p-4">
                    <h2 className="mb-4 text-xl font-semibold">
                        Currently Listening
                    </h2>
                    <p>
                        You need to be signed in to view currently listening
                        users.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Get the user's friends
    const friendIds = await getUserFriends(currentUserId);

    // Include the current user and their friends
    const allowedUserIds = [currentUserId, ...friendIds];

    // Get the list of user IDs who have listened to something in the last 10 minutes
    const recentlyListenedUsers = await db
        .select({
            userId: schema.listeningHistory.userId,
        })
        .from(schema.listeningHistory)
        .where(
            and(
                gte(
                    schema.listeningHistory.playedAt,
                    sql`now() - interval '10 minutes'`,
                ),
                // Only include the current user and their friends
                inArray(schema.listeningHistory.userId, allowedUserIds),
            ),
        )
        .groupBy(schema.listeningHistory.userId)
        .limit(100);

    const fetchedListeners: Array<{
        userId: string;
        nowPlaying: Awaited<ReturnType<typeof getUserPlaying>>;
    }> = [];
    const batchSize = 10;
    for (
        let index = 0;
        index < recentlyListenedUsers.length;
        index += batchSize
    ) {
        const batch = recentlyListenedUsers.slice(index, index + batchSize);
        const results = await Promise.allSettled(
            batch.map(async (user) => ({
                userId: user.userId,
                nowPlaying: await getUserPlaying(user.userId),
            })),
        );

        for (const result of results) {
            if (result.status === "fulfilled") {
                fetchedListeners.push(result.value);
            }
        }
    }
    const resolvedListeners = fetchedListeners.filter(
        (listener) =>
            listener.nowPlaying && listener.nowPlaying.item.type !== "episode",
    );

    const apiClient = await clerkClient();
    const { data: userData } = await apiClient.users.getUserList({
        userId: resolvedListeners.map((user) => user.userId),
        limit: 100,
    });

    // Now combine the resolved listeners with the user data
    const combinedListeners = resolvedListeners.map((listener) => {
        const user = userData.find((user) => user.id === listener.userId);
        return { ...listener, user };
    });

    const currentListeners = combinedListeners.map((listener) => {
        const userId = listener.userId;
        const username = listener.user?.firstName ?? "Unknown";
        const userProfile = listener.user?.imageUrl;
        const song = listener.nowPlaying!.item.name;
        let artist;
        let albumImage;
        if (listener.nowPlaying!.item.type !== "episode") {
            artist = listener.nowPlaying!.item.artists[0]?.name;
            albumImage = listener.nowPlaying!.item.album.images[0]?.url;
        } else {
            artist = "Unknown";
            albumImage = undefined;
        }
        return {
            id: userId,
            name: username,
            avatar: userProfile,
            song,
            artist,
            trackId: listener.nowPlaying!.item.id,
            albumImage,
        } as CurrentListener;
    });

    return (
        <section
            className="ss-listening-now"
            aria-labelledby="listening-now-title"
        >
            <div className="ss-feed-section-heading">
                <h2 id="listening-now-title">Listening now</h2>
                <span className="ss-live-dot" aria-label="Live activity" />
            </div>
            <a
                href="https://open.spotify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ss-music-source"
            >
                <SpotifyWordmark width={75} />
            </a>
            {currentListeners.length === 0 ? (
                <EmptyState
                    title="A quiet moment."
                    description="When you or your friends play something on Spotify, it will appear here."
                />
            ) : (
                <div className="divide-y">
                    {currentListeners.map((listener) => (
                        <div key={listener.id} className="ss-now-listener">
                            <a
                                href={`https://open.spotify.com/track/${listener.trackId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                                aria-label={`Open ${listener.song} in Spotify`}
                            >
                                {listener.albumImage ? (
                                    <Image
                                        src={listener.albumImage}
                                        alt={`${listener.song} artwork`}
                                        width={64}
                                        height={64}
                                        className="h-16 w-16 rounded-[4px] object-contain lg:rounded-[8px]"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                                        <Music2 aria-hidden="true" />
                                    </div>
                                )}
                            </a>
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/dashboard?user=${listener.id}`}
                                    className="ss-listener-name"
                                >
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage
                                            src={listener.avatar}
                                            alt=""
                                        />
                                        <AvatarFallback>
                                            {listener.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    {listener.name}
                                </Link>
                                <a
                                    href={`https://open.spotify.com/track/${listener.trackId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block hover:underline"
                                    title={`${listener.song} by ${listener.artist}`}
                                >
                                    <p className="line-clamp-2 text-sm font-medium">
                                        {listener.song}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {listener.artist}
                                    </p>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
