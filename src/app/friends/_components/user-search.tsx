"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { searchUsers, sendFriendRequest } from "../actions";

type UserInfo = {
    id: string;
    name: string;
    imageUrl?: string;
};

export function UserSearch() {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
        {},
    );
    const [searchMessageVisible, setSearchMessageVisible] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (query.length >= 2) {
            setIsSearching(true);
            setSearchMessageVisible(false);

            // Debounce search to avoid too many requests
            timeoutId = setTimeout(() => {
                void (async () => {
                    const result = await searchUsers(query);
                    const usersList = result.users ?? [];
                    setUsers(usersList);
                    setIsSearching(false);

                    if (usersList.length === 0) {
                        setSearchMessageVisible(true);
                    }
                })();
            }, 500);
        } else {
            setUsers([]);
            setIsSearching(false);
            setSearchMessageVisible(false);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [query]);

    const handleSendRequest = async (userId: string) => {
        setActionLoading((prev) => ({ ...prev, [userId]: true }));

        try {
            await sendFriendRequest(userId);
            // Remove user from search results after sending request
            setUsers((prev) => prev.filter((user) => user.id !== userId));
        } catch (error) {
            console.error("Error sending friend request:", error);
        } finally {
            setActionLoading((prev) => ({ ...prev, [userId]: false }));
        }
    };

    return (
        <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold">Find Friends</h2>
            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={query}
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                    Type at least 2 characters to search.
                </p>
            </div>

            {isSearching && (
                <div className="p-4 text-center">
                    <p className="text-muted-foreground">Searching users...</p>
                </div>
            )}

            {searchMessageVisible && (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            No users found for &quot;{query}&quot;.
                        </p>
                    </CardContent>
                </Card>
            )}

            {!isSearching && users.length > 0 && (
                <div>
                    {users.map((user) => (
                        <Card key={user.id} className="mb-4">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage
                                                src={user.imageUrl}
                                                alt={user.name}
                                            />
                                            <AvatarFallback>
                                                {user.name
                                                    .substring(0, 2)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-medium">
                                                {user.name}
                                            </h3>
                                        </div>
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() =>
                                            handleSendRequest(user.id)
                                        }
                                        disabled={actionLoading[user.id]}
                                    >
                                        {actionLoading[user.id]
                                            ? "Sending..."
                                            : "Add Friend"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
