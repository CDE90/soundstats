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
import { InviteStatusToggle } from "./invite-status-toggle";
import { TableSearch } from "./table-search";

interface Invite {
    id: bigint;
    code: string;
    name: string | null;
    status: "active" | "used" | "expired" | "disabled";
    maxUses: number | null;
    currentUses: number;
    expiresAt: Date | null;
    createdAt: Date;
    createdBy: string;
    createdByUser: {
        spotifyId: string;
    } | null;
}

interface InvitesTableProps {
    invites: Invite[];
}

export function InvitesTable({ invites }: InvitesTableProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredInvites = useMemo(() => {
        if (!searchTerm) return invites;

        return invites.filter(
            (invite) =>
                invite.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invite.name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ??
                    false) ||
                (invite.createdByUser?.spotifyId
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ??
                    false),
        );
    }, [invites, searchTerm]);

    if (!invites || invites.length === 0) {
        return <div>No invites found.</div>;
    }

    return (
        <div className="space-y-4">
            <TableSearch
                placeholder="Search invites by code, name, or creator..."
                value={searchTerm}
                onChange={setSearchTerm}
            />
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredInvites.map((invite) => (
                        <TableRow key={invite.id}>
                            <TableCell>
                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                    {invite.code}
                                </code>
                            </TableCell>
                            <TableCell>
                                {invite.name ?? (
                                    <span className="italic text-muted-foreground">
                                        No name
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                {invite.createdByUser?.spotifyId ?? "Unknown"}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={
                                        invite.status === "active"
                                            ? "default"
                                            : invite.status === "disabled"
                                              ? "destructive"
                                              : "secondary"
                                    }
                                >
                                    {invite.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {invite.currentUses}
                                {invite.maxUses
                                    ? ` / ${invite.maxUses}`
                                    : " / ∞"}
                            </TableCell>
                            <TableCell>
                                {invite.expiresAt
                                    ? new Date(
                                          invite.expiresAt,
                                      ).toLocaleDateString()
                                    : "Never"}
                            </TableCell>
                            <TableCell>
                                {new Date(
                                    invite.createdAt,
                                ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <InviteStatusToggle
                                    inviteId={invite.id.toString()}
                                    currentStatus={invite.status}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
