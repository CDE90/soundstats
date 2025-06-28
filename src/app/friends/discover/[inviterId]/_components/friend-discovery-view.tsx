"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sendFriendRequest } from "../../../actions";
import { format } from "date-fns";

type UserInfo = {
    id: string;
    name: string;
    imageUrl?: string;
};

type FriendInfo = {
    relationshipId: bigint;
    userId: string;
    name: string;
    imageUrl?: string;
    createdAt: Date;
    canAdd: boolean;
    isCurrentUser: boolean;
};

interface FriendDiscoveryViewProps {
    inviterInfo: UserInfo;
    friends: FriendInfo[];
}

export function FriendDiscoveryView({
    inviterInfo,
    friends,
}: FriendDiscoveryViewProps) {
    const [addingFriends, setAddingFriends] = useState<Set<string>>(new Set());
    const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());

    const handleAddFriend = async (friendId: string) => {
        setAddingFriends((prev) => new Set(prev).add(friendId));

        const result = await sendFriendRequest(friendId);

        if ("success" in result) {
            setAddedFriends((prev) => new Set(prev).add(friendId));
        }

        setAddingFriends((prev) => {
            const newSet = new Set(prev);
            newSet.delete(friendId);
            return newSet;
        });
    };

    const addableFriends = friends.filter((friend) => friend.canAdd);

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage
                                src={inviterInfo.imageUrl}
                                alt={inviterInfo.name}
                            />
                            <AvatarFallback className="text-lg">
                                {inviterInfo.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-2xl">
                                Welcome to SoundStats!
                            </CardTitle>
                            <p className="mt-2 text-muted-foreground">
                                You&apos;re now friends with{" "}
                                <strong>{inviterInfo.name}</strong>.
                                {addableFriends.length > 0 ? (
                                    <>
                                        {" "}
                                        Discover and add mutual friends below to
                                        get started!
                                    </>
                                ) : (
                                    <>
                                        {" "}
                                        Check out the platform or view all of{" "}
                                        {inviterInfo.name}&apos;s friends.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-4">
                <Link href="/friends">
                    <Button variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        View All Friends
                    </Button>
                </Link>
                <Link href={`/friends/${inviterInfo.id}`}>
                    <Button variant="outline">
                        View {inviterInfo.name}&apos;s Friends
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
                <Link href="/dashboard">
                    <Button>
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </div>

            {/* Friend Suggestions */}
            {addableFriends.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            People You Might Know
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            These are friends of {inviterInfo.name} that you can
                            add to your network.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {addableFriends.map((friend) => (
                            <div
                                key={friend.userId}
                                className="flex items-center justify-between rounded-lg border p-4"
                            >
                                <div className="flex items-center gap-4">
                                    {friend.isCurrentUser ? (
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage
                                                src={friend.imageUrl}
                                                alt={friend.name}
                                            />
                                            <AvatarFallback>
                                                {friend.name
                                                    .substring(0, 2)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <Link href={`/friends/${friend.userId}`}>
                                            <Avatar className="h-12 w-12 cursor-pointer transition-opacity hover:opacity-80">
                                                <AvatarImage
                                                    src={friend.imageUrl}
                                                    alt={friend.name}
                                                />
                                                <AvatarFallback>
                                                    {friend.name
                                                        .substring(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Link>
                                    )}
                                    <div>
                                        {friend.isCurrentUser ? (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">
                                                    {friend.name}
                                                </h3>
                                                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                                    You
                                                </span>
                                            </div>
                                        ) : (
                                            <Link
                                                href={`/friends/${friend.userId}`}
                                                className="hover:underline"
                                            >
                                                <h3 className="font-medium">
                                                    {friend.name}
                                                </h3>
                                            </Link>
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            Friends with {inviterInfo.name}{" "}
                                            since{" "}
                                            {format(
                                                new Date(friend.createdAt),
                                                "MMM d, yyyy",
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {!addedFriends.has(friend.userId) ? (
                                    <Button
                                        onClick={() =>
                                            handleAddFriend(friend.userId)
                                        }
                                        disabled={addingFriends.has(
                                            friend.userId,
                                        )}
                                        size="sm"
                                    >
                                        {addingFriends.has(friend.userId) ? (
                                            "Adding..."
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Add Friend
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Request Sent
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* All Friends List */}
            {friends.filter((f) => !f.canAdd).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {inviterInfo.name}&apos;s Other Friends
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            These friends are already in your network or have
                            pending requests.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {friends
                            .filter((f) => !f.canAdd)
                            .map((friend) => (
                                <div
                                    key={friend.userId}
                                    className="flex items-center justify-between rounded-lg border p-4 opacity-60"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage
                                                src={friend.imageUrl}
                                                alt={friend.name}
                                            />
                                            <AvatarFallback>
                                                {friend.name
                                                    .substring(0, 2)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            {friend.isCurrentUser ? (
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium">
                                                        {friend.name}
                                                    </h3>
                                                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                                        You
                                                    </span>
                                                </div>
                                            ) : (
                                                <h3 className="font-medium">
                                                    {friend.name}
                                                </h3>
                                            )}
                                            <p className="text-sm text-muted-foreground">
                                                Already connected
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" disabled>
                                        <Check className="mr-2 h-4 w-4" />
                                        Connected
                                    </Button>
                                </div>
                            ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
