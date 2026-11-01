import { PageHeading } from "@/components/page-layout";
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
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Friends",
    description: "Manage your friends and see what they're listening to.",
};

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
        <div className="ss-page ss-page-social">
            <PageHeading
                title="Friends"
                description="Good music is even better with good company."
            >
                {pendingReceived.length > 0 && (
                    <span className="ss-count-badge">
                        {pendingReceived.length} pending{" "}
                        {pendingReceived.length === 1 ? "request" : "requests"}
                    </span>
                )}
                <Button asChild>
                    <Link href="/invite">
                        <Share2 aria-hidden="true" />
                        Invite friends
                    </Link>
                </Button>
            </PageHeading>

            {error && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <p className="text-destructive">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="friends" className="mb-8 w-full">
                <TabsList className="ss-tabs mb-8">
                    <TabsTrigger value="friends">
                        Your friends
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
                    <TabsTrigger value="find">Find friends</TabsTrigger>
                </TabsList>

                <TabsContent value="friends">
                    <FriendsList
                        friends={friends}
                        title="Your friends"
                        emptyMessage="Find a friend by name or email, or share an invite link to start listening together."
                    />

                    <PendingRequestsList
                        requests={pendingSent}
                        title="Requests you’ve sent"
                        emptyMessage="You don't have any pending sent friend requests."
                    />
                </TabsContent>

                <TabsContent value="requests">
                    <FriendRequestsList
                        requests={pendingReceived}
                        title="Friend requests"
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
