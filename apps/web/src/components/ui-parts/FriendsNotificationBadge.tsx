"use client";

import { useEffect, useState } from "react";
import { getPendingFriendRequestCount } from "@/app/friends/actions";
import { useUser } from "@clerk/nextjs";

interface FriendsNotificationBadgeProps {
    className?: string;
}

export function FriendsNotificationBadge({
    className,
}: FriendsNotificationBadgeProps) {
    const [count, setCount] = useState(0);
    const { isSignedIn } = useUser();

    useEffect(() => {
        if (!isSignedIn) {
            setCount(0);
            return;
        }

        const fetchCount = async () => {
            try {
                const result = await getPendingFriendRequestCount();
                setCount(result.count);
            } catch {
                setCount(0);
            }
        };

        void fetchCount();
    }, [isSignedIn]);

    if (!isSignedIn || count === 0) {
        return null;
    }

    return (
        <span className={`relative ml-1.5 inline-flex ${className}`}>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
            <span className="sr-only">
                {count} pending friend request{count !== 1 ? "s" : ""}
            </span>
        </span>
    );
}
