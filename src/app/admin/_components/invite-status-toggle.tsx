"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { updateInviteStatus } from "../actions";

interface InviteStatusToggleProps {
    inviteId: string;
    currentStatus: "active" | "used" | "expired" | "disabled";
}

export function InviteStatusToggle({
    inviteId,
    currentStatus,
}: InviteStatusToggleProps) {
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = (
        newStatus: "active" | "disabled" | "expired",
    ) => {
        startTransition(async () => {
            try {
                await updateInviteStatus(BigInt(inviteId), newStatus);
                toast.success(`Invite status updated to ${newStatus}`);
            } catch {
                toast.error("Failed to update invite status");
            }
        });
    };

    const availableActions = [
        {
            status: "active" as const,
            label: "Activate",
            disabled: currentStatus === "active",
        },
        {
            status: "disabled" as const,
            label: "Disable",
            disabled: currentStatus === "disabled",
        },
        {
            status: "expired" as const,
            label: "Expire",
            disabled: currentStatus === "expired",
        },
    ].filter((action) => !action.disabled);

    if (availableActions.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                    Actions
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {availableActions.map((action) => (
                    <DropdownMenuItem
                        key={action.status}
                        onClick={() => handleStatusChange(action.status)}
                    >
                        {action.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
