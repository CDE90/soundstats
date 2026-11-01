"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { requireActionSuccess } from "../../../action-result";
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
    connectionStatus?: string;
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

        try {
            requireActionSuccess(await sendFriendRequest(friendId));
            setAddedFriends((prev) => new Set(prev).add(friendId));
            toast.success("Friend request sent.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "The request couldn’t be sent. Please try again.",
            );
        } finally {
            setAddingFriends((prev) => {
                const next = new Set(prev);
                next.delete(friendId);
                return next;
            });
        }
    };

    const otherFriends = friends.filter((friend) => !friend.isCurrentUser);
    const addableFriends = otherFriends.filter((friend) => friend.canAdd);

    return (
        <div className="ss-social-profile space-y-8">
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
                            <h1 className="text-4xl leading-tight tracking-tight">
                                Welcome to SoundStats.
                            </h1>
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
            <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                    <Link href="/friends">
                        <Users className="mr-2 h-4 w-4" />
                        View All Friends
                    </Link>
                </Button>
                <Link href={`/friends/${inviterInfo.id}`}>
                    <Button variant="outline">
                        View their friends
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
                <Button asChild>
                    <Link href="/dashboard">
                        Go to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
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
                                className="ss-person-row-inner border-b py-5"
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
                                        <Link
                                            href={`/friends/${friend.userId}`}
                                        >
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
                                                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
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
            {otherFriends.filter((f) => !f.canAdd).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {inviterInfo.name}&apos;s Other Friends
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Your existing connections and requests in this
                            circle.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {otherFriends
                            .filter((f) => !f.canAdd)
                            .map((friend) => (
                                <div
                                    key={friend.userId}
                                    className="flex items-center justify-between rounded-lg border p-4"
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
                                                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                                        You
                                                    </span>
                                                </div>
                                            ) : (
                                                <h3 className="font-medium">
                                                    {friend.name}
                                                </h3>
                                            )}
                                            <p className="text-sm text-muted-foreground">
                                                {friend.connectionStatus ===
                                                "pending"
                                                    ? "Request pending"
                                                    : friend.connectionStatus ===
                                                        "accepted"
                                                      ? "Already connected"
                                                      : "Not connected"}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {friend.connectionStatus === "pending"
                                            ? "Pending"
                                            : friend.connectionStatus ===
                                                "accepted"
                                              ? "Connected"
                                              : "Not connected"}
                                    </span>
                                </div>
                            ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
