import { PageHeading } from "@/components/page-layout";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getRecentListens } from "./actions";
import { CurrentListeners } from "./current-listening";
import { RecentListens } from "./recent-listens";
import { FriendsFilter, type Friend } from "./friends-filter";
import { captureServerPageView } from "@/lib/posthog";
import { getFriends } from "@/app/friends/actions";
import { type Metadata } from "next";
import { Suspense } from "react";
import { getPublicUserDisplayName } from "@/lib/user-display";
import { Skeleton } from "@/components/ui/skeleton";
import { FEED_PAGE_SIZE, getFeedScope } from "./feed-state";
import { RefreshFeedButton } from "./refresh-feed-button";

export const metadata: Metadata = {
    title: "Feed",
    description: "See what your friends are listening to right now.",
};

export default async function FeedPage({
    searchParams,
}: {
    searchParams: Promise<{ filter?: string }>;
}) {
    const user = await currentUser();
    await captureServerPageView(user);

    if (!user) {
        return (
            <div className="ss-page ss-feed-page">
                <h1 className="mb-2 text-2xl font-bold">Feed</h1>
                <p>Please sign in to see your feed.</p>
            </div>
        );
    }

    const { friends = [], error: friendsError } = await getFriends();

    const friendsList: Friend[] = friends.map((friend) => ({
        userId: friend.userId,
        name: friend.name,
        imageUrl: friend.imageUrl,
    }));

    const currentUserName = getPublicUserDisplayName(user);
    const resolvedSearchParams = await searchParams;
    const scope = getFeedScope(resolvedSearchParams.filter, [
        user.id,
        ...friendsList.map((friend) => friend.userId),
    ]);
    let initialListens: Awaited<ReturnType<typeof getRecentListens>> = [];
    let initialError: string | null = null;
    try {
        initialListens = await getRecentListens(
            0,
            FEED_PAGE_SIZE,
            scope.userIds,
        );
    } catch {
        initialError = "Recent activity couldn’t load. Try again.";
    }

    return (
        <div className="ss-page ss-feed-page">
            <PageHeading
                title="Feed"
                description={
                    scope.isFiltered
                        ? `Showing activity from ${scope.userIds.length} ${scope.userIds.length === 1 ? "person" : "people"}.`
                        : "A shared soundtrack. See what your friends are playing."
                }
            >
                <FriendsFilter
                    friends={friendsList}
                    currentUserId={user.id}
                    currentUserName={currentUserName}
                    currentUserImageUrl={user.imageUrl}
                />
            </PageHeading>
            {friendsError && (
                <div role="alert" className="ss-surface mb-6 space-y-3 p-5">
                    <p>
                        Your friends couldn’t load. Only your own activity may
                        be available.
                    </p>
                    <RefreshFeedButton />
                </div>
            )}
            <div className="ss-feed-layout">
                <div className="min-w-0">
                    <RecentListens
                        key={`${scope.key}:${initialListens[0]?.id ?? initialError ?? "empty"}`}
                        initialState={initialListens}
                        initialError={initialError}
                        selectedUserIds={scope.userIds}
                        friendCount={friendsList.length}
                    />
                </div>
                <aside className="ss-feed-sidebar">
                    <Suspense
                        key={scope.key}
                        fallback={
                            <section
                                className="ss-listening-now"
                                role="status"
                                aria-label="Loading live activity"
                            >
                                <h2>Listening now</h2>
                                <Skeleton className="mt-5 h-32 w-full" />
                            </section>
                        }
                    >
                        <CurrentListeners selectedUserIds={scope.userIds} />
                    </Suspense>
                    <Link href="/friends" className="ss-feed-friends-link">
                        Find friends to add to your feed
                    </Link>
                </aside>
            </div>
        </div>
    );
}
