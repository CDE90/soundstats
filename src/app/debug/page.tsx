import { captureServerPageView } from "@/lib/posthog";
import { getCurrentlyPlaying } from "@/server/spotify/spotify";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { connection } from "next/server";

export default async function DebugPage() {
    await connection();
    const { userId } = await auth();

    const user = await currentUser();
    await captureServerPageView(user);

    if (!userId) {
        return <p>You are not signed in.</p>;
    }

    const clerkTokenResponse = await (
        await clerkClient()
    ).users.getUserOauthAccessToken(userId, "spotify");

    if (!clerkTokenResponse.data) {
        return <p>Error getting access token.</p>;
    }

    const data = clerkTokenResponse.data[0]!;
    const accessToken = data.token;

    const nowListening = await getCurrentlyPlaying(accessToken);

    return (
        <div className="p-4">
            <h1 className="mb-2 text-2xl font-bold">Debug</h1>
            <p>Your user ID is {userId}</p>
            <p>Listening to {nowListening?.item.name}</p>
            <pre>{JSON.stringify(nowListening, null, 2)}</pre>
        </div>
    );
}
