import { currentUser } from "@clerk/nextjs/server";
import { getRecentListens } from "./actions";
import { CurrentListeners } from "./current-listening";
import { RecentListens } from "./recent-listens";
import { captureServerPageView } from "@/lib/posthog";
import { logger } from "@/lib/axiom/server";
import { after } from "next/server";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Feed",
    description: "See what your friends are listening to right now.",
};

export default async function FeedPage() {
    const user = await currentUser();
    await captureServerPageView(user);

    logger.info("Feed page accessed", {
        userId: user?.id,
        hasUser: !!user,
    });

    const initialListens = await getRecentListens(0, 10);

    logger.info("Feed data loaded", {
        userId: user?.id,
        initialListensCount: initialListens.length,
    });

    after(async () => {
        await logger.flush();
    });

    return (
        <div className="mx-auto max-w-2xl p-4">
            <h1 className="mb-2 text-2xl font-bold">Feed</h1>
            <div className="space-y-8">
                <CurrentListeners />
                <RecentListens initialState={initialListens} />
            </div>
        </div>
    );
}
