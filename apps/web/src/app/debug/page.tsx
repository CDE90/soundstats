import { type Metadata } from "next";
import { PageHeading } from "@/components/page-layout";
import { captureServerPageView } from "@/lib/posthog";
import { getCurrentlyPlaying } from "@/server/spotify/spotify";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Playback diagnostics" };

export default async function DebugPage() {
    await connection();
    const { userId } = await auth();

    const user = await currentUser();
    await captureServerPageView(user);

    if (!userId) {
        return (
            <div className="ss-page">
                <PageHeading
                    title="Playback diagnostics"
                    description="Sign in to see your current playback information."
                />
            </div>
        );
    }

    const clerkTokenResponse = await (
        await clerkClient()
    ).users.getUserOauthAccessToken(userId, "spotify");

    if (!clerkTokenResponse.data[0]) {
        return (
            <div className="ss-page">
                <PageHeading
                    title="Playback diagnostics"
                    description="Connect your Spotify account to see playback information."
                />
            </div>
        );
    }

    const data = clerkTokenResponse.data[0]!;
    const accessToken = data.token;

    const nowListening = await getCurrentlyPlaying(accessToken);

    return (
        <div className="ss-page">
            <PageHeading
                title="Playback diagnostics"
                description="Your current Spotify playback information."
            />
            <p className="mb-2 break-all text-sm text-muted-foreground">
                User: {userId}
            </p>
            <p>Listening to {nowListening?.item.name}</p>
            <pre
                className="ss-code-panel"
                tabIndex={0}
                aria-label="Spotify playback response"
            >
                {JSON.stringify(nowListening, null, 2)}
            </pre>
        </div>
    );
}
