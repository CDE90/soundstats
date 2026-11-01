"use client";

import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { acceptInvite } from "../../actions";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import type { InviteRelationship } from "../../invite-validation";

interface AcceptInviteButtonProps {
    inviteCode: string;
    inviterName: string;
    isAuthenticated: boolean;
    relationship: InviteRelationship;
    inviterId: string;
}

export function AcceptInviteButton({
    inviteCode,
    inviterName,
    isAuthenticated,
    relationship,
    inviterId,
}: AcceptInviteButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string>("");
    const router = useRouter();

    const handleAccept = () => {
        if (!isAuthenticated) {
            return;
        }

        startTransition(async () => {
            setError("");
            try {
                const result = await acceptInvite(inviteCode);

                if ("error" in result) {
                    setError(result.error ?? "An unknown error occurred");
                } else if ("success" in result) {
                    setSuccess(true);

                    // Redirect to friend discovery page if inviterId is available, otherwise friends page
                    const redirectUrl = result.inviterId
                        ? `/friends/discover/${result.inviterId}`
                        : "/friends";
                    router.push(redirectUrl);
                }
            } catch {
                setError("The invite couldn’t be accepted. Please try again.");
            }
        });
    };

    if (relationship === "owner") {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    This is your invite. Copy its link from your invite
                    management page.
                </p>
                <Button asChild className="w-full">
                    <Link href="/invite">Manage your invites</Link>
                </Button>
            </div>
        );
    }
    if (relationship === "friends") {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    You’re already friends with {inviterName}.
                </p>
                <Button asChild className="w-full">
                    <Link
                        href={`/dashboard?user=${encodeURIComponent(inviterId)}`}
                    >
                        View their listening
                    </Link>
                </Button>
            </div>
        );
    }
    if (relationship === "pending") {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    A friend request is already pending between you and{" "}
                    {inviterName}.
                </p>
                <Button asChild className="w-full">
                    <Link href="/friends">Review friend requests</Link>
                </Button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">
                        Success! You&apos;re now friends with {inviterName}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <div
                    role="alert"
                    className="rounded-md border border-destructive/20 bg-destructive/10 p-3"
                >
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {isAuthenticated ? (
                <Button
                    onClick={handleAccept}
                    disabled={isPending}
                    className="w-full"
                    size="lg"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting invite...
                        </>
                    ) : (
                        <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Accept invite and become friends
                        </>
                    )}
                </Button>
            ) : (
                <SignInButton
                    forceRedirectUrl={`/invite/${inviteCode}`}
                    fallbackRedirectUrl={`/invite/${inviteCode}`}
                >
                    <Button className="w-full" size="lg">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Sign in to accept invite
                    </Button>
                </SignInButton>
            )}
        </div>
    );
}
