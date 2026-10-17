"use client";

import { EmptyState } from "@/components/page-layout";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import {
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
} from "../actions";

type FriendInfo = {
    relationshipId: bigint;
    userId: string;
    name: string;
    imageUrl?: string;
    initiatedByMe: boolean;
    createdAt: Date;
};

export function FriendCard({
    friend,
    onAction,
}: {
    friend: FriendInfo;
    onAction?: () => void;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleRemove = async () => {
        if (
            window.confirm(
                `Are you sure you want to remove ${friend.name} from your friends?`,
            )
        ) {
            setIsLoading(true);
            await removeFriend(friend.relationshipId);
            setIsLoading(false);
            if (onAction) onAction();
        }
    };

    return (
        <Card className="ss-person-row">
            <CardContent className="p-6">
                <div className="ss-person-row-inner">
                    <div className="ss-person-identity">
                        <Link href={`/friends/${friend.userId}`}>
                            <Avatar className="h-12 w-12 cursor-pointer transition-opacity hover:opacity-80">
                                <AvatarImage
                                    src={friend.imageUrl}
                                    alt={friend.name}
                                />
                                <AvatarFallback>
                                    {friend.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <Link
                                href={`/friends/${friend.userId}`}
                                className="hover:underline"
                            >
                                <h3 className="font-medium">{friend.name}</h3>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                                Friends since{" "}
                                {format(
                                    new Date(friend.createdAt),
                                    "MMM d, yyyy",
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="ss-person-actions">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard?user=${friend.userId}`}>
                                Listening stats
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            disabled={isLoading}
                        >
                            {isLoading ? "Removing..." : "Remove"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function FriendRequestCard({
    request,
    onAction,
}: {
    request: FriendInfo;
    onAction?: () => void;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleAccept = async () => {
        setIsLoading(true);
        await acceptFriendRequest(request.relationshipId);
        setIsLoading(false);
        if (onAction) onAction();
    };

    const handleReject = async () => {
        setIsLoading(true);
        await rejectFriendRequest(request.relationshipId);
        setIsLoading(false);
        if (onAction) onAction();
    };

    return (
        <Card className="ss-person-row">
            <CardContent className="p-6">
                <div className="ss-person-row-inner">
                    <div className="ss-person-identity">
                        <Avatar className="h-12 w-12">
                            <AvatarImage
                                src={request.imageUrl}
                                alt={request.name}
                            />
                            <AvatarFallback>
                                {request.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium">{request.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                Sent you a request on{" "}
                                {format(
                                    new Date(request.createdAt),
                                    "MMM d, yyyy",
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleAccept}
                            disabled={isLoading}
                        >
                            Accept
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReject}
                            disabled={isLoading}
                        >
                            Decline
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function PendingRequestCard({
    request,
    onAction,
}: {
    request: FriendInfo;
    onAction?: () => void;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleCancel = async () => {
        setIsLoading(true);
        await rejectFriendRequest(request.relationshipId);
        setIsLoading(false);
        if (onAction) onAction();
    };

    return (
        <Card className="ss-person-row">
            <CardContent className="p-6">
                <div className="ss-person-row-inner">
                    <div className="ss-person-identity">
                        <Avatar className="h-12 w-12">
                            <AvatarImage
                                src={request.imageUrl}
                                alt={request.name}
                            />
                            <AvatarFallback>
                                {request.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium">{request.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                Request sent on{" "}
                                {format(
                                    new Date(request.createdAt),
                                    "MMM d, yyyy",
                                )}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        Cancel Request
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function FriendsList({
    friends,
    title,
    emptyMessage,
}: {
    friends: FriendInfo[];
    title: string;
    emptyMessage: string;
}) {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAction = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <div className="ss-people-list mb-10" key={refreshKey}>
            <h2 className="mb-4 text-2xl font-bold">{title}</h2>
            {friends.length === 0 ? (
                <EmptyState
                    title="Nothing here yet."
                    description={emptyMessage}
                />
            ) : (
                friends.map((friend) => (
                    <FriendCard
                        key={friend.relationshipId}
                        friend={friend}
                        onAction={handleAction}
                    />
                ))
            )}
        </div>
    );
}

export function FriendRequestsList({
    requests,
    title,
    emptyMessage,
}: {
    requests: FriendInfo[];
    title: string;
    emptyMessage: string;
}) {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAction = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <div className="ss-people-list mb-10" key={refreshKey}>
            <h2 className="mb-4 text-2xl font-bold">{title}</h2>
            {requests.length === 0 ? (
                <EmptyState
                    title="Nothing here yet."
                    description={emptyMessage}
                />
            ) : (
                requests.map((request) => (
                    <FriendRequestCard
                        key={request.relationshipId}
                        request={request}
                        onAction={handleAction}
                    />
                ))
            )}
        </div>
    );
}

export function PendingRequestsList({
    requests,
    title,
    emptyMessage,
}: {
    requests: FriendInfo[];
    title: string;
    emptyMessage: string;
}) {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAction = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <div className="ss-people-list mb-10" key={refreshKey}>
            <h2 className="mb-4 text-2xl font-bold">{title}</h2>
            {requests.length === 0 ? (
                <EmptyState
                    title="Nothing here yet."
                    description={emptyMessage}
                />
            ) : (
                requests.map((request) => (
                    <PendingRequestCard
                        key={request.relationshipId}
                        request={request}
                        onAction={handleAction}
                    />
                ))
            )}
        </div>
    );
}
