import { getSpotifyAccount } from "@/server/lib";
import { RedirectToSignIn } from "@clerk/nextjs";
import { auth, clerkClient } from "@clerk/nextjs/server";

export default async function Layout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { userId } = await auth();

    if (!userId) {
        return <RedirectToSignIn />;
    }

    const apiClient = await clerkClient();
    const spotifyAccount = await getSpotifyAccount(apiClient, userId);

    if (!spotifyAccount) {
        // Shouldn't happen, but just in case
        return <RedirectToSignIn />;
    }

    return <>{children}</>;
}
