"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { getFeedScope } from "./feed-state";

export interface Friend {
    userId: string;
    name: string;
    imageUrl?: string;
}

interface FriendsFilterProps {
    friends: Friend[];
    currentUserId: string;
    currentUserName: string;
    currentUserImageUrl?: string;
}

export function FriendsFilter({
    friends,
    currentUserId,
    currentUserName,
    currentUserImageUrl,
}: FriendsFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const allUsers = [
        {
            userId: currentUserId,
            name: currentUserName,
            imageUrl: currentUserImageUrl,
        },
        ...friends,
    ];
    const allIds = allUsers.map((user) => user.userId);
    const selected = getFeedScope(searchParams.get("filter"), allIds).userIds;
    const [draft, setDraft] = useState(new Set(selected));

    function applyFilter() {
        const params = new URLSearchParams(searchParams);
        if (draft.size === allIds.length) params.delete("filter");
        else params.set("filter", [...draft].join(",") || "__none__");
        setOpen(false);
        startTransition(() => {
            router.push(`/feed${params.size ? `?${params}` : ""}`, {
                scroll: false,
            });
        });
    }

    const text =
        selected.length === 0
            ? "No people selected"
            : selected.length === allIds.length
              ? "Everyone"
              : `${selected.length} of ${allIds.length} people`;

    return (
        <div>
            <DropdownMenu
                open={open}
                onOpenChange={(next) => {
                    if (next) setDraft(new Set(selected));
                    setOpen(next);
                }}
            >
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={pending}
                        aria-busy={pending}
                    >
                        <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                        {pending ? "Updating people…" : text}
                        <ChevronDown
                            className="ml-2 h-4 w-4"
                            aria-hidden="true"
                        />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-72 max-w-[calc(100vw-24px)]"
                >
                    <DropdownMenuLabel>People in your feed</DropdownMenuLabel>
                    <p className="px-2 pb-2 text-xs text-muted-foreground">
                        Applies to recent and live activity.
                    </p>
                    <DropdownMenuItem
                        onSelect={(event) => {
                            event.preventDefault();
                            setDraft(new Set(allIds));
                        }}
                    >
                        Select everyone
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(event) => {
                            event.preventDefault();
                            setDraft(new Set());
                        }}
                    >
                        Select nobody
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="max-h-64 overflow-y-auto">
                        {allUsers.map((user) => (
                            <DropdownMenuCheckboxItem
                                key={user.userId}
                                checked={draft.has(user.userId)}
                                onSelect={(event) => event.preventDefault()}
                                onCheckedChange={(checked) => {
                                    setDraft((previous) => {
                                        const next = new Set(previous);
                                        if (checked) next.add(user.userId);
                                        else next.delete(user.userId);
                                        return next;
                                    });
                                }}
                                className="gap-3 py-2"
                            >
                                <Avatar
                                    className="h-6 w-6 shrink-0"
                                    aria-hidden="true"
                                >
                                    <AvatarImage src={user.imageUrl} alt="" />
                                    <AvatarFallback>
                                        {user.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 break-words text-sm">
                                    {user.name}
                                    {user.userId === currentUserId && " (You)"}
                                </span>
                            </DropdownMenuCheckboxItem>
                        ))}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={applyFilter}
                        className="justify-center bg-primary text-primary-foreground focus:bg-primary/90 focus:text-primary-foreground"
                    >
                        Apply filter
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {pending && (
                <p className="mt-2 text-sm text-muted-foreground" role="status">
                    Updating recent and live activity…
                </p>
            )}
        </div>
    );
}
