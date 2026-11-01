import { getSpotifyAccount } from "@/server/lib";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

export async function checkAuth(user?: User | null) {
    const { userId } = await auth();

    if (!userId) {
        return false;
    }

    // The dashboard already fetched this authenticated profile. Reuse it rather
    // than making a second Clerk request before every date change.
    if (user?.id === userId) {
        return user.externalAccounts.some(
            (account) => account.provider === "oauth_spotify",
        );
    }

    const apiClient = await clerkClient();
    const spotifyAccount = await getSpotifyAccount(apiClient, userId);

    if (!spotifyAccount) {
        // Shouldn't happen, but just in case
        return false;
    }

    return true;
}
