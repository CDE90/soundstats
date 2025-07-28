"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    updateUserStatus,
    updateUserPremium,
    updateUserAdmin,
} from "../actions";

interface UserToggleSwitchProps {
    userId: string;
    checked: boolean;
    type: "enabled" | "premium" | "admin";
}

export function UserToggleSwitch({
    userId,
    checked,
    type,
}: UserToggleSwitchProps) {
    const [isPending, startTransition] = useTransition();
    const [optimisticChecked, setOptimisticChecked] = useState(checked);

    const handleToggle = () => {
        const newValue = !optimisticChecked;
        setOptimisticChecked(newValue);

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
                setOptimisticChecked(!newValue);
                toast.error(`Failed to update user ${type} status`);
            }
        });
    };

    return (
        <Switch
            checked={optimisticChecked}
            onCheckedChange={handleToggle}
            disabled={isPending}
        />
    );
}
