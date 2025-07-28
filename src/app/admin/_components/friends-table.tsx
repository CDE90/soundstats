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

interface Friendship {
    id: bigint;
    status: "pending" | "accepted" | "rejected";
    createdAt: Date;
    userId: string;
    friendId: string;
    user?: {
        id: string;
        spotifyId: string;
    };
    friend?: {
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

        return friendships.filter(
            (friendship) =>
                (friendship.user?.spotifyId
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ??
                    false) ||
                (friendship.friend?.spotifyId
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ??
                    false) ||
                friendship.userId
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                friendship.friendId
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()),
        );
    }, [friendships, searchTerm]);

    if (!friendships || friendships.length === 0) {
        return <div>No friendships found.</div>;
    }

    return (
        <div className="space-y-4">
            <TableSearch
                placeholder="Search friendships by user name or ID..."
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
                                                {friendship.user?.spotifyId
                                                    ?.slice(0, 2)
                                                    .toUpperCase() ?? "??"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="text-sm font-medium">
                                                {friendship.user?.spotifyId ??
                                                    "Unknown"}
                                            </div>
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
                                                {friendship.friend?.spotifyId
                                                    ?.slice(0, 2)
                                                    .toUpperCase() ?? "??"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="text-sm font-medium">
                                                {friendship.friend?.spotifyId ??
                                                    "Unknown"}
                                            </div>
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
