import { getCurrentlyPlaying } from "@/server/spotify/spotify";
import { auth, clerkClient } from "@clerk/nextjs/server";

export default async function DebugPage() {
    const { userId } = await auth();

    if (!userId) {
        return <p>You are not signed in.</p>;
    }

    const clerkTokenResponse = await (
        await clerkClient()
    ).users.getUserOauthAccessToken(userId, "oauth_spotify");

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
