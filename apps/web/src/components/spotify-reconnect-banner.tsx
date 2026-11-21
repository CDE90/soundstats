"use client";

import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/nextjs";
import { Loader2, Unplug } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

const COPY = {
    title: "Spotify tracking is paused",
    bodyWithDate:
        "Spotify asks you to reconnect every six months, so your listening hasn’t been recorded since {date}. Your earlier history is safe.",
    bodyNoDate:
        "Spotify asks you to reconnect every six months, so your listening isn’t currently being recorded. Your earlier history is safe.",
    button: "Reconnect Spotify",
    buttonPending: "Reconnecting…",
    error: "Couldn’t reconnect to Spotify. Try signing out and back in instead.",
    fallbackButton: "Sign out",
    importLine: {
        before: "You can fill any gap later by ",
        link: "importing your Spotify history",
        after: ".",
    },
};

export function SpotifyReconnectBanner({ since }: { since: string | null }) {
    const titleId = useId();
    const { user } = useUser();
    const clerk = useClerk();
    const [pending, setPending] = useState(false);
    const [failed, setFailed] = useState(false);

    async function reconnect() {
        setPending(true);
        setFailed(false);
        try {
            const account = user?.externalAccounts.find(
                (item) => item.provider === "spotify",
            );
            if (!account) {
                throw new Error("No Spotify account on this user");
            }
            const updated = await account.reauthorize({
                redirectUrl: window.location.href,
            });
            const redirect =
                updated.verification?.externalVerificationRedirectURL;
            if (!redirect) {
                throw new Error("Clerk returned no Spotify redirect");
            }
            window.location.assign(redirect.href);
        } catch (error) {
            console.error("Could not start reconnecting Spotify:", error);
            setPending(false);
            setFailed(true);
        }
    }

    async function signOutAndBackIn() {
        setPending(true);
        // Signing in with Spotify again also renews access.
        await clerk.signOut({ redirectUrl: window.location.pathname });
    }

    const body = since
        ? COPY.bodyWithDate.replace("{date}", since)
        : COPY.bodyNoDate;

    return (
        <section className="ss-reconnect" aria-labelledby={titleId}>
            <div className="ss-reconnect-inner">
                <Unplug aria-hidden="true" />
                <div className="ss-reconnect-text">
                    <h2 id={titleId}>{COPY.title}</h2>
                    <p>{body}</p>
                    <p className="ss-reconnect-import">
                        {COPY.importLine.before}
                        <Link href="/import">{COPY.importLine.link}</Link>
                        {COPY.importLine.after}
                    </p>
                    {failed && (
                        <p className="ss-reconnect-error" role="alert">
                            {COPY.error}
                        </p>
                    )}
                </div>
                <div className="ss-reconnect-actions">
                    {failed ? (
                        <Button
                            type="button"
                            disabled={pending}
                            onClick={() => void signOutAndBackIn()}
                        >
                            {pending && (
                                <Loader2
                                    className="animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            {COPY.fallbackButton}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={pending || !user}
                            onClick={() => void reconnect()}
                        >
                            {pending && (
                                <Loader2
                                    className="animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            {pending ? COPY.buttonPending : COPY.button}
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
