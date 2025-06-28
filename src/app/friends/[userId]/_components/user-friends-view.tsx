"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sendFriendRequest } from "../../actions";
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

interface UserFriendsViewProps {
    userInfo: UserInfo;
    friends: FriendInfo[];
}

export function UserFriendsView({ userInfo, friends }: UserFriendsViewProps) {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/friends">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Friends
                    </Button>
                </Link>
            </div>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage
                                src={userInfo.imageUrl}
                                alt={userInfo.name}
                            />
                            <AvatarFallback className="text-lg">
                                {userInfo.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">
                                {userInfo.name}&apos;s Friends
                            </CardTitle>
                            <p className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                {friends.length}{" "}
                                {friends.length === 1 ? "friend" : "friends"}
                            </p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Friends List */}
            <div className="space-y-4">
                {friends.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                {userInfo.name} hasn&apos;t added any friends
                                yet.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    friends.map((friend) => (
                        <Card key={friend.userId}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
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
                                                Friends since{" "}
                                                {format(
                                                    new Date(friend.createdAt),
                                                    "MMM d, yyyy",
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {friend.canAdd &&
                                        !addedFriends.has(friend.userId) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleAddFriend(
                                                        friend.userId,
                                                    )
                                                }
                                                disabled={addingFriends.has(
                                                    friend.userId,
                                                )}
                                            >
                                                {addingFriends.has(
                                                    friend.userId,
                                                ) ? (
                                                    "Adding..."
                                                ) : (
                                                    <>
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        Add Friend
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                    {addedFriends.has(friend.userId) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled
                                        >
                                            Request Sent
                                        </Button>
                                    )}

                                    {!friend.canAdd &&
                                        !addedFriends.has(friend.userId) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled
                                            >
                                                Already Friends
                                            </Button>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
