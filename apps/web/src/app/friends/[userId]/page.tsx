import { type Metadata } from "next";
import { PageHeading } from "@/components/page-layout";
import { redirect } from "next/navigation";
import { getUserFriends } from "../actions";
import { UserFriendsView } from "./_components/user-friends-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Users } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Friends" };

interface UserFriendsPageProps {
    params: Promise<{ userId: string }>;
}

export default async function UserFriendsPage({
    params,
}: UserFriendsPageProps) {
    const { userId } = await params;

    const result = await getUserFriends(userId);

    if ("error" in result) {
        // Handle specific error cases with user-friendly messages
        if (result.error === "Cannot view your own friends list") {
            redirect("/friends");
        }

        if (result.error === "You must be friends to view their friends list") {
            return (
                <div className="ss-page ss-page-social">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/friends">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Friends
                                </Link>
                            </Button>
                        </div>

                        <PageHeading
                            title="This friends list is private."
                            description="Become friends with this person to see their connections."
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                    <Lock className="h-5 w-5" />
                                    Private Friends List
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="py-8 text-center">
                                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                    <p className="mb-4 text-muted-foreground">
                                        This user&apos;s friends list is
                                        private. You need to be friends with
                                        them to see who they&apos;re connected
                                        with.
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href="/friends">
                                                Find Friends
                                            </Link>
                                        </Button>
                                        <Button asChild>
                                            <Link href="/dashboard">
                                                Go to Dashboard
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        }

        // For other errors, redirect to friends page
        redirect("/friends");
    }

    if (!result.userInfo) {
        redirect("/friends");
    }

    return (
        <div className="ss-page ss-page-social">
            <UserFriendsView
                userInfo={result.userInfo}
                friends={result.friends}
            />
        </div>
    );
}
