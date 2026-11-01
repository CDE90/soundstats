"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    updateUserStatus,
    updateUserPremium,
    updateUserAdmin,
} from "../actions";

interface UserToggleSwitchProps {
    userId: string;
    userName: string;
    checked: boolean;
    type: "enabled" | "premium" | "admin";
}

export function UserToggleSwitch({
    userId,
    userName,
    checked,
    type,
}: UserToggleSwitchProps) {
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        const newValue = !checked;

        startTransition(async () => {
            try {
                switch (type) {
                    case "enabled":
                        await updateUserStatus(userId, newValue);
                        break;
                    case "premium":
                        await updateUserPremium(userId, newValue);
                        break;
                    case "admin":
                        await updateUserAdmin(userId, newValue);
                        break;
                }
                toast.success(`User ${type} status updated successfully`);
            } catch {
                toast.error(`Failed to update user ${type} status`);
            }
        });
    };

    return (
        <Switch
            aria-label={`${type === "enabled" ? "Listening tracking" : type === "premium" ? "Premium polling" : "Admin access"} for ${userName}`}
            aria-busy={isPending}
            checked={checked}
            onCheckedChange={handleToggle}
            disabled={isPending}
        />
    );
}
