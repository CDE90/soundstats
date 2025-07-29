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
import { UserToggleSwitch } from "./user-toggle-switch";
import { TableSearch } from "./table-search";
import {
    getUserDisplayName,
    getUserInitials,
    userHasNameInfo,
    type UserDisplayData,
} from "@/lib/user-display";

interface User extends UserDisplayData {
    id: string;
    spotifyId: string;
    premiumUser: boolean;
    enabled: boolean;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date | null;
    imageUrl?: string;
}

interface UsersTableProps {
    users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;

        const searchLower = searchTerm.toLowerCase();
        return users.filter(
            (user) =>
                (user.spotifyId?.toLowerCase().includes(searchLower) ??
                    false) ||
                user.id.toLowerCase().includes(searchLower) ||
                (user.firstName?.toLowerCase().includes(searchLower) ??
                    false) ||
                (user.lastName?.toLowerCase().includes(searchLower) ?? false) ||
                (user.emailAddress?.toLowerCase().includes(searchLower) ??
                    false) ||
                `${user.firstName ?? ""} ${user.lastName ?? ""}`
                    .toLowerCase()
                    .includes(searchLower),
        );
    }, [users, searchTerm]);

    if (!users || users.length === 0) {
        return <div>No users found.</div>;
    }

    return (
        <div className="space-y-4">
            <TableSearch
                placeholder="Search users by name, email, or ID..."
                value={searchTerm}
                onChange={setSearchTerm}
            />
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback>
                                            {getUserInitials(user)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium">
                                            {getUserDisplayName(user)}
                                        </div>
                                        <div className="truncate text-sm text-muted-foreground">
                                            {userHasNameInfo(user) &&
                                                user.emailAddress && (
                                                    <span className="mr-2">
                                                        {user.emailAddress}
                                                    </span>
                                                )}
                                            <span className="text-xs">
                                                ID: {user.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center space-x-2">
                                    <UserToggleSwitch
                                        userId={user.id}
                                        checked={user.enabled}
                                        type="enabled"
                                    />
                                    <Badge
                                        variant={
                                            user.enabled
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {user.enabled ? "Enabled" : "Disabled"}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell>
                                <UserToggleSwitch
                                    userId={user.id}
                                    checked={user.premiumUser}
                                    type="premium"
                                />
                            </TableCell>
                            <TableCell>
                                <UserToggleSwitch
                                    userId={user.id}
                                    checked={user.isAdmin}
                                    type="admin"
                                />
                            </TableCell>
                            <TableCell>
                                {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
