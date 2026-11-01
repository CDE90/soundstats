"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { searchUsers, sendFriendRequest } from "../actions";
import { requireActionSuccess } from "../action-result";
import { toast } from "sonner";

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
    const [searchError, setSearchError] = useState("");
    const [retry, setRetry] = useState(0);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    useEffect(() => {
        let current = true;
        setSearchError("");
        setSearchMessageVisible(false);
        setUsers([]);
        if (query.trim().length < 2) {
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const timeoutId = setTimeout(() => {
            void (async () => {
                try {
                    const result = await searchUsers(query.trim());
                    if (!current) return;
                    if (result.error) throw new Error(result.error);
                    const usersList = result.users ?? [];
                    setUsers(usersList);
                    setSearchMessageVisible(usersList.length === 0);
                } catch {
                    if (current)
                        setSearchError(
                            "People couldn’t be loaded. Please try again.",
                        );
                } finally {
                    if (current) setIsSearching(false);
                }
            })();
        }, 500);
        return () => {
            current = false;
            clearTimeout(timeoutId);
        };
    }, [query, retry]);

    const handleSendRequest = async (userId: string) => {
        setActionLoading((prev) => ({ ...prev, [userId]: true }));
        try {
            requireActionSuccess(await sendFriendRequest(userId));
            setSentRequests((prev) => new Set(prev).add(userId));
            toast.success("Friend request sent.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "The request couldn’t be sent. Please try again.",
            );
        } finally {
            setActionLoading((prev) => ({ ...prev, [userId]: false }));
        }
    };

    return (
        <div className="ss-search-friends mb-8">
            <h2 className="mb-4 text-2xl font-bold">Find friends</h2>
            <div className="mb-6">
                <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={query}
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search people by name or email"
                    className="w-full"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                    Type at least 2 characters to search.
                </p>
            </div>

            {isSearching && (
                <div
                    className="p-4 text-center"
                    role="status"
                    aria-live="polite"
                >
                    <p className="text-muted-foreground">Searching users...</p>
                </div>
            )}

            {searchError && (
                <div
                    role="alert"
                    className="mb-6 space-y-3 rounded-lg border p-5"
                >
                    <p>{searchError}</p>
                    <Button
                        variant="outline"
                        onClick={() => setRetry((value) => value + 1)}
                    >
                        Try again
                    </Button>
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
                        <Card key={user.id} className="ss-person-row">
                            <CardContent className="p-6">
                                <div className="ss-person-row-inner">
                                    <div className="ss-person-identity">
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
                                        disabled={
                                            actionLoading[user.id] ||
                                            sentRequests.has(user.id)
                                        }
                                    >
                                        {actionLoading[user.id]
                                            ? "Sending..."
                                            : sentRequests.has(user.id)
                                              ? "Request sent"
                                              : "Add friend"}
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
