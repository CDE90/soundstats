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
            <div className="mx-auto max-w-2xl p-4">
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
        : user.emailAddresses[0]?.emailAddress ?? "You";

    const resolvedSearchParams = await searchParams;
    const filteredUserIds = resolvedSearchParams.filter
        ? resolvedSearchParams.filter.split(",").filter(Boolean)
        : undefined;

    const initialListens = await getRecentListens(0, 10, filteredUserIds);

    const isFiltered = filteredUserIds && filteredUserIds.length < friendsList.length + 1;
    const filterCount = filteredUserIds?.length ?? friendsList.length + 1;

    return (
        <div className="mx-auto max-w-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Feed</h1>
                    {isFiltered && (
                        <p className="text-sm text-muted-foreground">
                            Showing activity from {filterCount} friend{filterCount !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>
                <FriendsFilter
                    friends={friendsList}
                    currentUserId={user.id}
                    currentUserName={currentUserName}
                    currentUserImageUrl={user.imageUrl}
                />
            </div>
            <div className="space-y-8">
                <CurrentListeners />
                <RecentListens initialState={initialListens} />
            </div>
        </div>
    );
}
