import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { getSpotifyAccount, setUserTracking } from "@/server/lib";
import { logger, withAxiom } from "@/lib/axiom/server";

export const POST = withAxiom(async (req: NextRequest) => {
    try {
        const evt = await verifyWebhook(req);

        const { id } = evt.data;
        const eventType = evt.type;

        logger.info("Webhook received", {
            webhookId: id,
            eventType: eventType,
        });

        if (evt.type === "user.created") {
            const userId = evt.data.id;
            logger.info("Processing user creation", {
                userId: userId,
                action: "user_created",
            });

            const apiClient = await clerkClient();
            const spotifyAccount = await getSpotifyAccount(apiClient, userId);

            if (spotifyAccount) {
                logger.info("Spotify account found for new user", {
                    userId: userId,
                    spotifyAccountId: spotifyAccount.id,
                    spotifyExternalId: spotifyAccount.externalId,
                });

                await setUserTracking(true, userId, spotifyAccount.externalId);

                logger.info("User tracking enabled", {
                    userId: userId,
                    spotifyExternalId: spotifyAccount.externalId,
                    trackingEnabled: true,
                });
            } else {
                logger.warn("No Spotify account found for new user", {
                    userId: userId,
                    action: "missing_spotify_account",
                });
            }
        }

        logger.info("Webhook processed successfully", {
            webhookId: id,
            eventType: eventType,
            status: "success",
        });

        return new Response("Webhook received", { status: 200 });
    } catch (err) {
        logger.error("Error processing webhook", {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
        });

        return new Response("Error verifying webhook", { status: 400 });
    }
});
