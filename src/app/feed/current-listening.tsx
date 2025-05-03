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
        .groupBy(schema.listeningHistory.userId);

    const fetchedListeners = await Promise.all(
        recentlyListenedUsers.map(async (user) => {
            const nowPlaying = await getUserPlaying(user.userId);
            return {
                userId: user.userId,
                nowPlaying,
            };
        }),
    );
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
        <Card className="w-full overflow-hidden">
            <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        Currently Listening
                    </h2>
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
                {currentListeners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Music2 className="mb-2 h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">
                            No one is listening right now
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {currentListeners.map((listener) => (
                            <div
                                key={listener.id}
                                className="flex flex-col items-center space-y-2"
                            >
                                <div
                                    className="relative flex-shrink-0"
                                    style={{ width: "80px", height: "64px" }}
                                >
                                    <Avatar className="absolute left-0 top-0 h-14 w-14">
                                        <AvatarImage
                                            src={listener.avatar}
                                            alt={listener.name}
                                        />
                                        <AvatarFallback>
                                            {listener.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Link
                                        href={`https://open.spotify.com/track/${listener.trackId}`}
                                        target="_blank"
                                        className="absolute bottom-0 right-0 h-10 w-10 overflow-hidden rounded-[2px] border border-border shadow-md sm:rounded-[4px]"
                                    >
                                        {listener.albumImage ? (
                                            <Image
                                                src={listener.albumImage}
                                                alt={`${listener.song} album cover`}
                                                height={40}
                                                width={40}
                                                className="rounded-[2px]"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                                                <Music2 className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </Link>
                                </div>
                                <div className="w-full text-center">
                                    <p className="text-sm font-medium">
                                        {listener.name}
                                    </p>
                                    <Link
                                        href={`https://open.spotify.com/track/${listener.trackId}`}
                                        target="_blank"
                                        className="hover:underline"
                                    >
                                        <p className="line-clamp-2 text-xs text-foreground">
                                            {listener.song}
                                        </p>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            {listener.artist}
                                        </p>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
