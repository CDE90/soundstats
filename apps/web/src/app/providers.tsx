"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import SuspendedPostHogPageView from "./PostHogPageView";
import { useEffect } from "react";

export function CSPostHogProvider({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    useEffect(() => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
            api_host: "/ingest",
            ui_host: "https://eu.posthog.com",
            person_profiles: "always", // or 'always' to create profiles for anonymous users as well
            capture_pageview: false,
            capture_pageleave: true, // Enable pageleave capture
        });
    }, []);

    return (
        <PostHogProvider client={posthog}>
            <SuspendedPostHogPageView />
            {children}
        </PostHogProvider>
    );
}
