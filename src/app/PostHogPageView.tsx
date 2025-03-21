"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { usePostHog } from "posthog-js/react";

// 👉 Import the necessary Clerk hooks
import { useAuth, useUser } from "@clerk/nextjs";

export function PostHogPageView(): null {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const posthog = usePostHog();

    // 👉 Add the hooks into the component
    const { isSignedIn, userId } = useAuth();
    const { user } = useUser();

    // Track pageviews
    useEffect(() => {
        if (pathname && posthog) {
            let url = window.origin + pathname;
            if (searchParams.toString()) {
                url = url + `?${searchParams.toString()}`;
            }

            // Only track for authenticated users
            if (isSignedIn && userId) {
                posthog.capture("client_page_view", {
                    $current_url: url,
                    path: pathname,
                    search_params: searchParams.toString(),
                    user_id: userId,
                    source: "client",
                });
            }
        }
    }, [pathname, searchParams, posthog, isSignedIn, userId]);

    // Track user identification
    useEffect(() => {
        // 👉 Check the sign in status and user info,
        //    and identify the user if they aren't already
        if (isSignedIn && userId && user && !posthog._isIdentified()) {
            // 👉 Identify the user with more properties
            posthog.identify(userId, {
                email: user.primaryEmailAddress?.emailAddress,
                username: user.username,
                name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
                has_image: !!user.imageUrl,
                created_at: user.createdAt,
                verified:
                    user.emailAddresses?.some(
                        (email) => email.verification?.status === "verified",
                    ) || false,
            });

            // Track user_identified event
            posthog.capture("user_identified", {
                source: "client",
                user_id: userId,
            });
        }

        // 👉 Reset the user if they sign out
        if (!isSignedIn && posthog._isIdentified()) {
            posthog.reset();

            // Track user_signed_out event
            posthog.capture("user_signed_out", {
                source: "client",
            });
        }
    }, [posthog, user, isSignedIn, userId]);

    return null;
}

export default function SuspendedPostHogPageView() {
    return (
        <Suspense fallback={null}>
            <PostHogPageView />
        </Suspense>
    );
}
