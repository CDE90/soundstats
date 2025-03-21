import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FriendRequestsList,
    FriendsList,
    PendingRequestsList,
} from "./_components/friend-list";
import { UserSearch } from "./_components/user-search";
import { getFriends } from "./actions";
import { checkAuth } from "./check-auth";
import { currentUser } from "@clerk/nextjs/server";
import { captureServerPageView } from "@/lib/posthog";

// export const dynamic = "force-dynamic";

export default async function FriendsPage() {
    const user = await currentUser();
    await captureServerPageView(user);

    // Check if user is authenticated
    await checkAuth();

    // Fetch all friend data
    const {
        friends = [],
        pendingReceived = [],
        pendingSent = [],
        error,
    } = await getFriends();

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6 flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold">Friends</h1>
                {pendingReceived.length > 0 && (
                    <div className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                        {pendingReceived.length} pending request
                        {pendingReceived.length > 1 ? "s" : ""}
                    </div>
                )}
            </div>

            {error && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <p className="text-destructive">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="friends" className="mb-8 w-full">
                <TabsList className="mb-6 grid w-full grid-cols-3">
                    <TabsTrigger value="friends">
                        My Friends
                        {friends.length > 0 && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {friends.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="requests">
                        Requests
                        {pendingReceived.length > 0 && (
                            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                {pendingReceived.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="find">Find Friends</TabsTrigger>
                </TabsList>

                <TabsContent value="friends">
                    <FriendsList
                        friends={friends}
                        title="My Friends"
                        emptyMessage="You don't have any friends yet. Add some friends to get started!"
                    />

                    <PendingRequestsList
                        requests={pendingSent}
                        title="Pending Sent Requests"
                        emptyMessage="You don't have any pending sent friend requests."
                    />
                </TabsContent>

                <TabsContent value="requests">
                    <FriendRequestsList
                        requests={pendingReceived}
                        title="Friend Requests"
                        emptyMessage="You don't have any pending friend requests."
                    />
                </TabsContent>

                <TabsContent value="find">
                    <UserSearch />
                </TabsContent>
            </Tabs>
        </div>
    );
}
