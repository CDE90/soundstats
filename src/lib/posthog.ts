import { env } from "@/env.js";
import { type User } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { PostHog } from "posthog-node";

// Create a PostHog client for server-side event tracking
let serverPostHog: PostHog | null = null;

// Type-safe wrapper for PostHog
export function getServerPostHog() {
    if (!serverPostHog) {
        // Safely handle env variables
        const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;
        const posthogHost = env.NEXT_PUBLIC_POSTHOG_HOST;

        serverPostHog = new PostHog(posthogKey, {
            host: posthogHost,
        });
    }
    return serverPostHog;
}

// Helper function to capture server-side events for authenticated users
export async function captureAuthenticatedEvent(
    userId: string,
    eventName: string,
    properties?: Record<string, unknown>,
    userProperties?: Partial<User>,
) {
    console.log("Capturing event:", eventName, properties);
    try {
        const client = getServerPostHog();
        if (!client) return;

        // Add additional properties for better tracking
        const eventProperties = {
            source: "server",
            ...properties,
        };

        // If user properties are provided, identify the user
        if (userProperties) {
            client.identify({
                distinctId: userId,
                properties: {
                    email: userProperties.emailAddresses?.[0]?.emailAddress,
                    name: `${userProperties.firstName ?? ""} ${userProperties.lastName ?? ""}`.trim(),
                    username: userProperties.username,
                },
            });
        }

        // Capture the event
        client.capture({
            distinctId: userId,
            event: eventName,
            properties: eventProperties,
        });
    } catch (error) {
        // Silently fail if there's an error with PostHog
        console.error("PostHog tracking error:", error);
    }
}

// Utility function to capture server-side page views in each page component
export async function captureServerPageView(user: User | null) {
    if (!user) return null;

    try {
        // Get headers - directly returns ReadonlyHeaders object
        const headersList = await headers();
        const pathname =
            headersList.get("x-pathname") ??
            headersList.get("x-invoke-path") ??
            "/";
        const referrer = headersList.get("referer") ?? "";
        const url = headersList.get("x-url") ?? "";

        // Skip tracking for API routes, static assets, etc.
        if (
            pathname.startsWith("/api/") ||
            pathname.startsWith("/_next/") ||
            /\.(jpg|jpeg|png|gif|svg|css|js|ico|webp|mp3|mp4|webm|woff|woff2|ttf|otf|eot)$/.exec(
                pathname,
            )
        ) {
            return null;
        }

        // Capture the server-side page view event
        await captureAuthenticatedEvent(
            user.id,
            "server_page_view",
            {
                path: pathname,
                url,
                referrer,
                source: "server-component",
            },
            user,
        );
    } catch (error) {
        // Silently fail - don't block rendering if tracking fails
        console.error("Error tracking server page view:", error);
    }

    return null;
}
