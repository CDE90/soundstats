"use client";

import { EmptyState } from "@/components/page-layout";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
    requireActionSuccess,
    type SocialActionResult,
} from "../action-result";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

function useFriendAction(onAction?: () => void) {
    const [isLoading, setIsLoading] = useState(false);
    const [complete, setComplete] = useState(false);
    const run = async (
        action: () => Promise<SocialActionResult>,
        message: string,
    ) => {
        setIsLoading(true);
        try {
            requireActionSuccess(await action());
            setComplete(true);
            toast.success(message);
            onAction?.();
            return true;
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "The change couldn’t be saved. Please try again.",
            );
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    return { isLoading, complete, run };
}

export function FriendCard({
    friend,
    onAction,
}: {
    friend: FriendInfo;
    onAction?: () => void;
}) {
    const { isLoading, complete, run } = useFriendAction(onAction);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const handleRemove = async () => {
        if (
            await run(
                () => removeFriend(friend.relationshipId),
                `${friend.name} removed from friends.`,
            )
        ) {
            setConfirmOpen(false);
        }
    };
    if (complete) return null;

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
                        <AlertDialog
                            open={confirmOpen}
                            onOpenChange={setConfirmOpen}
                        >
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isLoading}
                                >
                                    Remove
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Remove {friend.name}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You’ll no longer share listening
                                        statistics or activity. You can send a
                                        new friend request later.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isLoading}>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={isLoading}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            void handleRemove();
                                        }}
                                    >
                                        {isLoading
                                            ? "Removing..."
                                            : "Remove friend"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
    const { isLoading, complete, run } = useFriendAction(onAction);
    const handleAccept = () =>
        run(
            () => acceptFriendRequest(request.relationshipId),
            `You’re now friends with ${request.name}.`,
        );
    const handleReject = () =>
        run(
            () => rejectFriendRequest(request.relationshipId),
            "Friend request declined.",
        );
    if (complete) return null;

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
                            onClick={() => {
                                void handleAccept();
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? "Saving..." : "Accept"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                void handleReject();
                            }}
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
    const { isLoading, complete, run } = useFriendAction(onAction);
    const handleCancel = () =>
        run(
            () => rejectFriendRequest(request.relationshipId),
            "Friend request cancelled.",
        );
    if (complete) return null;

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
                        onClick={() => {
                            void handleCancel();
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Cancelling..." : "Cancel request"}
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
    const router = useRouter();
    const handleAction = () => router.refresh();

    return (
        <div className="ss-people-list mb-10">
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
    const router = useRouter();
    const handleAction = () => router.refresh();

    return (
        <div className="ss-people-list mb-10">
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
    const router = useRouter();
    const handleAction = () => router.refresh();

    return (
        <div className="ss-people-list mb-10">
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
