import {
    getCurrentlyPlaying,
    getRecentlyPlayedTracks,
} from "@/server/spotify/spotify";
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
    const recentlyPlayed = await getRecentlyPlayedTracks(accessToken, 30);

    const recentlyPlayedTracks = recentlyPlayed.map((item) => ({
        trackName: item.track.name,
        artistName: item.track.artists[0]?.name,
        playedAt: item.played_at,
    }));

    console.log(`Fetched ${recentlyPlayedTracks.length} tracks`);

    let firstDate = new Date(Date.now());
    let lastDate = new Date(0);

    recentlyPlayedTracks.forEach((item) => {
        const date = new Date(item.playedAt);
        if (date < firstDate) {
            firstDate = date;
        }
        if (date > lastDate) {
            lastDate = date;
        }
    });

    console.log(firstDate);
    console.log(lastDate);

    return (
        <div className="p-4">
            <h1 className="mb-2 text-2xl font-bold">Debug</h1>
            <p>Your user ID is {userId}</p>
            <p>Listening to {nowListening?.item.name}</p>
            <pre>{JSON.stringify(recentlyPlayedTracks, null, 2)}</pre>
            <pre>{JSON.stringify(nowListening, null, 2)}</pre>
        </div>
    );
}
