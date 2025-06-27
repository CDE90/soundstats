"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Copy,
    Check,
    Trash2,
    Power,
    PowerOff,
    Calendar,
    Users,
    Loader2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { deleteInvite, toggleInviteStatus } from "../actions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Invite {
    id: bigint;
    code: string;
    name: string | null;
    status: "active" | "used" | "expired" | "disabled";
    maxUses: number | null;
    currentUses: number;
    expiresAt: Date | null;
    createdAt: Date;
}

interface InviteListProps {
    invites: Invite[];
}

export function InviteList({ invites }: InviteListProps) {
    const [isPending, startTransition] = useTransition();
    const [copiedCode, setCopiedCode] = useState<string>("");

    const copyInviteLink = async (code: string) => {
        const inviteUrl = `${window.location.origin}/invite/${code}`;
        await navigator.clipboard.writeText(inviteUrl);
        setCopiedCode(code);
        toast.success("Invite link copied to clipboard!");
    };

    const handleDeleteInvite = (inviteId: bigint) => {
        startTransition(async () => {
            const result = await deleteInvite(inviteId);
            if ("error" in result) {
                toast.error(result.error);
            } else {
                toast.success("Invite deleted successfully!");
            }
        });
    };

    const handleToggleStatus = (inviteId: bigint) => {
        startTransition(async () => {
            const result = await toggleInviteStatus(inviteId);
            if ("error" in result) {
                toast.error(result.error);
            } else {
                toast.success("Invite status updated!");
            }
        });
    };

    const getStatusBadge = (status: Invite["status"]) => {
        switch (status) {
            case "active":
                return (
                    <Badge variant="default" className="bg-green-500">
                        Active
                    </Badge>
                );
            case "used":
                return <Badge variant="secondary">Used</Badge>;
            case "expired":
                return <Badge variant="destructive">Expired</Badge>;
            case "disabled":
                return <Badge variant="outline">Disabled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const isExpired = (invite: Invite) => {
        return invite.expiresAt && invite.expiresAt < new Date();
    };

    const canToggle = (invite: Invite) => {
        return invite.status === "active" || invite.status === "disabled";
    };

    if (invites.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <div className="mb-4">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">
                        No invites yet
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                        Create your first invite to start sharing SoundStats
                        with friends!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {invites.map((invite) => (
                <Card key={invite.id.toString()}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">
                                    {invite.name ?? `Invite ${invite.code}`}
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <code className="rounded bg-muted px-2 py-1 font-mono">
                                        {invite.code}
                                    </code>
                                    {getStatusBadge(invite.status)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {invite.status === "active" &&
                                    !isExpired(invite) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                copyInviteLink(invite.code)
                                            }
                                            disabled={isPending}
                                        >
                                            {copiedCode === invite.code ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                {canToggle(invite) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleToggleStatus(invite.id)
                                        }
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : invite.status === "active" ? (
                                            <PowerOff className="h-4 w-4" />
                                        ) : (
                                            <Power className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Delete Invite
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete
                                                this invite? This action cannot
                                                be undone and the invite link
                                                will no longer work.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() =>
                                                    handleDeleteInvite(
                                                        invite.id,
                                                    )
                                                }
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                            <div>
                                <div className="font-medium text-muted-foreground">
                                    Uses
                                </div>
                                <div>
                                    {invite.currentUses}
                                    {invite.maxUses
                                        ? ` / ${invite.maxUses}`
                                        : " / ∞"}
                                </div>
                            </div>
                            <div>
                                <div className="font-medium text-muted-foreground">
                                    Created
                                </div>
                                <div>
                                    {formatDistanceToNow(invite.createdAt, {
                                        addSuffix: true,
                                    })}
                                </div>
                            </div>
                            <div>
                                <div className="font-medium text-muted-foreground">
                                    Expires
                                </div>
                                <div className="flex items-center gap-1">
                                    {invite.expiresAt ? (
                                        <>
                                            <Calendar className="h-3 w-3" />
                                            {formatDistanceToNow(
                                                invite.expiresAt,
                                                {
                                                    addSuffix: true,
                                                },
                                            )}
                                        </>
                                    ) : (
                                        "Never"
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
