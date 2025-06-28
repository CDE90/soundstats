import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateInviteForm } from "./_components/create-invite-form";
import { InviteList } from "./_components/invite-list";
import { getMyInvites } from "./actions";
import { checkAuth } from "../friends/check-auth";
import { currentUser } from "@clerk/nextjs/server";
import { captureServerPageView } from "@/lib/posthog";
import { Share2 } from "lucide-react";
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
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6 flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                    <Share2 className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">Invite Friends</h1>
                </div>
                {activeInvites.length > 0 && (
                    <div className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                        {activeInvites.length} active invite
                        {activeInvites.length > 1 ? "s" : ""}
                    </div>
                )}
            </div>

            <div className="mb-6">
                <p className="text-muted-foreground">
                    Create invite links to help your friends join SoundStats and
                    connect with your music taste. They&apos;ll automatically
                    become your friend when they sign up!
                </p>
            </div>

            {error && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <p className="text-destructive">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="create" className="mb-8 w-full">
                <TabsList className="mb-6 grid w-full grid-cols-2">
                    <TabsTrigger value="create">Create Invite</TabsTrigger>
                    <TabsTrigger value="manage">
                        My Invites
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
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-6 flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                    <Share2 className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">Invite Friends</h1>
                </div>
            </div>
            <div className="mb-6">
                <p className="text-muted-foreground">Loading invite data...</p>
            </div>
        </div>
    );
}

export default function InvitePage() {
    return (
        <Suspense fallback={<InvitePageSkeleton />}>
            <InvitePageContent />
        </Suspense>
    );
}
