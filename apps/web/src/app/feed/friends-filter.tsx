"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const allUsers = useMemo(
        () => [
            {
                userId: currentUserId,
                name: currentUserName,
                imageUrl: currentUserImageUrl,
            },
            ...friends,
        ],
        [currentUserId, currentUserName, currentUserImageUrl, friends],
    );

    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
        new Set(allUsers.map((user) => user.userId)),
    );

    useEffect(() => {
        const filterParam = searchParams.get("filter");
        if (filterParam) {
            try {
                if (filterParam === "__none__") {
                    // Handle special "none selected" case
                    setSelectedUserIds(new Set());
                } else {
                    const filterIds = filterParam.split(",").filter(Boolean);
                    setSelectedUserIds(new Set(filterIds));
                }
            } catch {
                setSelectedUserIds(
                    new Set(allUsers.map((user) => user.userId)),
                );
            }
        } else {
            setSelectedUserIds(new Set(allUsers.map((user) => user.userId)));
        }
    }, [searchParams, allUsers]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const updateUrl = useCallback(
        (userIds: Set<string>, immediate = false) => {
            // Clear existing debounce
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            const performUpdate = () => {
                const params = new URLSearchParams(searchParams);

                if (userIds.size === allUsers.length) {
                    params.delete("filter");
                } else if (userIds.size === 0) {
                    // Use special value to indicate "none selected" instead of empty
                    params.set("filter", "__none__");
                } else {
                    params.set("filter", Array.from(userIds).join(","));
                }

                const newUrl = params.toString() ? `?${params.toString()}` : "";
                router.push(`/feed${newUrl}`);
            };

            if (immediate) {
                performUpdate();
            } else {
                // Debounce for 300ms to allow multiple quick selections
                debounceRef.current = setTimeout(performUpdate, 300);
            }
        },
        [router, searchParams, allUsers.length],
    );

    const handleUserToggle = (userId: string) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
        updateUrl(newSelected);
    };

    const handleSelectAll = () => {
        const allUserIds = new Set(allUsers.map((user) => user.userId));
        setSelectedUserIds(allUserIds);
        updateUrl(allUserIds, true); // Immediate update for bulk actions
    };

    const handleSelectNone = () => {
        const newSelected = new Set<string>();
        setSelectedUserIds(newSelected);
        updateUrl(newSelected, true); // Immediate update for bulk actions
    };

    const getFilterText = () => {
        if (selectedUserIds.size === 0) {
            return "No friends selected";
        }
        if (selectedUserIds.size === allUsers.length) {
            return "All friends";
        }
        return `${selectedUserIds.size} of ${allUsers.length} friends`;
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 text-sm">
                    <Users className="mr-2 h-4 w-4" />
                    {getFilterText()}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <div className="p-2">
                    <div className="mb-3 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            className="h-7 flex-1 text-xs"
                        >
                            Select All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectNone}
                            className="h-7 flex-1 text-xs"
                        >
                            Select None
                        </Button>
                    </div>

                    <DropdownMenuSeparator />

                    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                        {allUsers.map((user) => (
                            <DropdownMenuItem
                                key={user.userId}
                                className="flex cursor-pointer items-center gap-3 p-2"
                                onSelect={(e) => {
                                    e.preventDefault();
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleUserToggle(user.userId);
                                }}
                            >
                                <Checkbox
                                    checked={selectedUserIds.has(user.userId)}
                                    onCheckedChange={() =>
                                        handleUserToggle(user.userId)
                                    }
                                />
                                <Avatar className="h-6 w-6">
                                    <AvatarImage
                                        src={user.imageUrl}
                                        alt={user.name}
                                    />
                                    <AvatarFallback className="text-xs">
                                        {user.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                    {user.name}
                                    {user.userId === currentUserId && " (You)"}
                                </span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
