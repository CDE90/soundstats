import { getSpotifyAccount } from "@/server/lib";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function checkAuth() {
    const { userId } = await auth();

    if (!userId) {
        return false;
    }

    const apiClient = await clerkClient();
    const spotifyAccount = await getSpotifyAccount(apiClient, userId);

    if (!spotifyAccount) {
        // Shouldn't happen, but just in case
        return false;
    }

    return true;
}
