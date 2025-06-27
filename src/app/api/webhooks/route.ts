import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSpotifyAccount, setUserTracking } from "@/server/lib";

export async function POST(req: NextRequest) {
    try {
        const evt = await verifyWebhook(req);

        // Do something with payload
        const { id } = evt.data;
        const eventType = evt.type;
        console.log(
            `Received webhook with ID ${id} and event type of ${eventType}`,
        );

        if (evt.type === "user.created") {
            const userId = evt.data.id;
            console.log("New user created:", userId);

            const apiClient = await clerkClient();
            const spotifyAccount = await getSpotifyAccount(apiClient, userId);

            if (spotifyAccount) {
                console.log(
                    `Spotify account found for user ${userId}: ${spotifyAccount.id}`,
                );
                await setUserTracking(true, userId, spotifyAccount.externalId);
                console.log(`User tracking enabled for user ${userId}.`);
            } else {
                console.log(`No Spotify account found for user ${userId}.`);
            }
        }

        return new Response("Webhook received", { status: 200 });
    } catch (err) {
        console.error("Error verifying webhook:", err);
        return new Response("Error verifying webhook", { status: 400 });
    }
}
