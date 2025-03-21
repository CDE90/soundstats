import { env } from "@/env.js";
import { type User } from "@clerk/nextjs/server";
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
            flushAt: 1, // Immediately send events
            flushInterval: 0, // Don't batch events
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
