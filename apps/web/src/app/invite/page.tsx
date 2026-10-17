import { PageHeading, PageLoading } from "@/components/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateInviteForm } from "./_components/create-invite-form";
import { InviteList } from "./_components/invite-list";
import { getMyInvites } from "./actions";
import { checkAuth } from "../friends/check-auth";
import { currentUser } from "@clerk/nextjs/server";
import { captureServerPageView } from "@/lib/posthog";
import { Suspense } from "react";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Invite Friends",
    description: "Invite your friends to join you on SoundStats.",
};

async function InvitePageContent() {
    const user = await currentUser();
    await captureServerPageView(user);

    await checkAuth();

    const { invites = [], error } = await getMyInvites();

    const activeInvites = invites.filter(
        (invite) => invite.status === "active",
    );

    return (
        <div className="ss-page ss-page-social">
            <PageHeading
                title="Bring your friends."
                description="Share a link to SoundStats. When someone joins, you’ll automatically become friends."
            >
                {activeInvites.length > 0 && (
                    <span className="ss-count-badge">
                        {activeInvites.length} active{" "}
                        {activeInvites.length === 1 ? "invite" : "invites"}
                    </span>
                )}
            </PageHeading>

            {error && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <p className="text-destructive">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="create" className="mb-8 w-full">
                <TabsList className="ss-tabs mb-8">
                    <TabsTrigger value="create">Create an invite</TabsTrigger>
                    <TabsTrigger value="manage">
                        Your invites
                        {invites.length > 0 && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {invites.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="create">
                    <CreateInviteForm />
                </TabsContent>

                <TabsContent value="manage">
                    <InviteList invites={invites} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function InvitePageSkeleton() {
    return (
        <PageLoading
            title="Bring your friends."
            description="Create and manage your invite links."
        />
    );
}

export default function InvitePage() {
    return (
        <Suspense fallback={<InvitePageSkeleton />}>
            <InvitePageContent />
        </Suspense>
    );
}
