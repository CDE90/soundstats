"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";
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
        <Card className="mb-4">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage
                                src={friend.imageUrl}
                                alt={friend.name}
                            />
                            <AvatarFallback>
                                {friend.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium">{friend.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                Friends since{" "}
                                {format(
                                    new Date(friend.createdAt),
                                    "MMM d, yyyy",
                                )}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemove}
                        disabled={isLoading}
                    >
                        {isLoading ? "Removing..." : "Remove Friend"}
                    </Button>
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
        <Card className="mb-4">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
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
        <Card className="mb-4">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
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
        <div className="mb-8" key={refreshKey}>
            <h2 className="mb-4 text-2xl font-bold">{title}</h2>
            {friends.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            {emptyMessage}
                        </p>
                    </CardContent>
                </Card>
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
        <div className="mb-8" key={refreshKey}>
            <h2 className="mb-4 text-2xl font-bold">{title}</h2>
            {requests.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            {emptyMessage}
                        </p>
                    </CardContent>
                </Card>
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
        <div className="mb-8" key={refreshKey}>
            <h2 className="mb-4 text-2xl font-bold">{title}</h2>
            {requests.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-center text-muted-foreground">
                            {emptyMessage}
                        </p>
                    </CardContent>
                </Card>
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
