"use client";

import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { acceptInvite } from "../../actions";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";

interface AcceptInviteButtonProps {
    inviteCode: string;
    inviterName: string;
    isAuthenticated: boolean;
}

export function AcceptInviteButton({
    inviteCode,
    inviterName,
    isAuthenticated,
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
            const result = await acceptInvite(inviteCode);

            if ("error" in result) {
                setError(result.error ?? "An unknown error occurred");
            } else if ("success" in result) {
                setSuccess(true);

                // Redirect immediately to avoid the page revalidating and showing "invalid invite"
                router.replace("/friends");
            }
        });
    };

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
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
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
                            Accepting Invite...
                        </>
                    ) : (
                        <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Accept Invite & Become Friends
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
                        Sign In to Accept Invite
                    </Button>
                </SignInButton>
            )}
        </div>
    );
}
