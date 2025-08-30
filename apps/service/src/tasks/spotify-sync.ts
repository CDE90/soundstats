import { db } from "../db";
import { clerkClient } from "../clerk";
import { env } from "../env";

export async function syncSpotifyData() {
    try {
        console.log("Starting Spotify data sync...");

        // Get all users from Clerk
        const usersResponse = await clerkClient.users.getUserList();
        const users = usersResponse.data;

        // For each user, fetch their Spotify data and update the database
        for (const user of users) {
            // TODO: Implement Spotify API integration
            // This would involve:
            // 1. Getting the user's Spotify access token from Clerk metadata
            // 2. Fetching their current listening data
            // 3. Updating the database with new tracks/artists/albums

            console.log(
                `Processing user: ${user.emailAddresses[0]?.emailAddress}`,
            );
        }

        console.log("Spotify data sync completed");
    } catch (error) {
        console.error("Error during Spotify data sync:", error);
    }
}
