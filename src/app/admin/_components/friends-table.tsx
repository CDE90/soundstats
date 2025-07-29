"use client";

import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableSearch } from "./table-search";
import {
    getUserDisplayName,
    getUserInitials,
    userHasNameInfo,
    createUserMatcher,
    type UserDisplayData,
} from "@/lib/user-display";

interface Friendship {
    id: string;
    status: "pending" | "accepted" | "rejected";
    createdAt: Date;
    userId: string;
    friendId: string;
    user?: UserDisplayData & {
        id: string;
        spotifyId: string;
    };
    friend?: UserDisplayData & {
        id: string;
        spotifyId: string;
    };
}

interface FriendsTableProps {
    friendships: Friendship[];
}

export function FriendsTable({ friendships }: FriendsTableProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredFriendships = useMemo(() => {
        if (!searchTerm) return friendships;

        const searchLower = searchTerm.toLowerCase();
        return friendships.filter((friendship) => {
            const userMatch = createUserMatcher(searchLower, friendship.user);
            const friendMatch = createUserMatcher(
                searchLower,
                friendship.friend,
            );

            const idMatch =
                friendship.userId.toLowerCase().includes(searchLower) ||
                friendship.friendId.toLowerCase().includes(searchLower);

            return userMatch || friendMatch || idMatch;
        });
    }, [friendships, searchTerm]);

    if (!friendships || friendships.length === 0) {
        return <div>No friendships found.</div>;
    }

    return (
        <div className="space-y-4">
            <TableSearch
                placeholder="Search friendships by name, email, or ID..."
                value={searchTerm}
                onChange={setSearchTerm}
            />
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredFriendships.map((friendship) => (
                        <TableRow key={friendship.id}>
                            <TableCell>
                                <div className="flex items-center space-x-3">
                                    {/* First person */}
                                    <div className="flex items-center space-x-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>
                                                {getUserInitials(
                                                    friendship.user,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                                {getUserDisplayName(
                                                    friendship.user,
                                                )}
                                            </div>
                                            {userHasNameInfo(friendship.user) &&
                                                friendship.user
                                                    ?.emailAddress && (
                                                    <div className="truncate text-xs text-muted-foreground">
                                                        {
                                                            friendship.user
                                                                .emailAddress
                                                        }
                                                    </div>
                                                )}
                                        </div>
                                    </div>

                                    {/* Relationship indicator */}
                                    <div className="flex items-center px-2">
                                        {friendship.status === "accepted" ? (
                                            <span className="font-mono text-lg text-green-600">
                                                ↔
                                            </span>
                                        ) : friendship.status === "pending" ? (
                                            <span className="font-mono text-lg text-yellow-600">
                                                →
                                            </span>
                                        ) : (
                                            <span className="font-mono text-lg text-red-600">
                                                ✗
                                            </span>
                                        )}
                                    </div>

                                    {/* Second person */}
                                    <div className="flex items-center space-x-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>
                                                {getUserInitials(
                                                    friendship.friend,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                                {getUserDisplayName(
                                                    friendship.friend,
                                                )}
                                            </div>
                                            {userHasNameInfo(
                                                friendship.friend,
                                            ) &&
                                                friendship.friend
                                                    ?.emailAddress && (
                                                    <div className="truncate text-xs text-muted-foreground">
                                                        {
                                                            friendship.friend
                                                                .emailAddress
                                                        }
                                                    </div>
                                                )}
                                        </div>
                                    </div>

                                    {/* Show direction for pending requests */}
                                    {friendship.status === "pending" && (
                                        <div className="ml-2 text-xs text-muted-foreground">
                                            (request)
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        friendship.status === "accepted"
                                            ? "default"
                                            : friendship.status === "pending"
                                              ? "secondary"
                                              : "destructive"
                                    }
                                >
                                    {friendship.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {new Date(
                                    friendship.createdAt,
                                ).toLocaleDateString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
