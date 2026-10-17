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

    const { friends = [] } = await getFriends();

    const friendsList: Friend[] = friends.map((friend) => ({
        userId: friend.userId,
        name: friend.name,
        imageUrl: friend.imageUrl,
    }));

    const currentUserName = user.firstName
        ? `${user.firstName} ${user.lastName ?? ""}`.trim()
        : (user.emailAddresses[0]?.emailAddress ?? "You");

    const resolvedSearchParams = await searchParams;
    const filteredUserIds = resolvedSearchParams.filter
        ? resolvedSearchParams.filter.split(",").filter(Boolean)
        : undefined;

    const initialListens = await getRecentListens(0, 10, filteredUserIds);

    const isFiltered =
        filteredUserIds && filteredUserIds.length < friendsList.length + 1;
    const filterCount = filteredUserIds?.length ?? friendsList.length + 1;

    return (
        <div className="ss-page ss-feed-page">
            <PageHeading
                title="Feed"
                description={
                    isFiltered
                        ? `Showing activity from ${filterCount} ${filterCount === 1 ? "person" : "people"}.`
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
            <div className="ss-feed-layout">
                <div className="min-w-0">
                    <RecentListens initialState={initialListens} />
                </div>
                <aside className="ss-feed-sidebar">
                    <CurrentListeners />
                    <Link href="/friends" className="ss-feed-friends-link">
                        Find friends to add to your feed
                    </Link>
                </aside>
            </div>
        </div>
    );
}
