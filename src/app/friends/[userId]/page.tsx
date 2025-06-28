import { redirect } from "next/navigation";
import { getUserFriends } from "../actions";
import { UserFriendsView } from "./_components/user-friends-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Users } from "lucide-react";
import Link from "next/link";

interface UserFriendsPageProps {
    params: Promise<{ userId: string }>;
}

export default async function UserFriendsPage({ params }: UserFriendsPageProps) {
    const { userId } = await params;
    
    const result = await getUserFriends(userId);
    
    if ("error" in result) {
        // Handle specific error cases with user-friendly messages
        if (result.error === "Cannot view your own friends list") {
            redirect("/friends");
        }
        
        if (result.error === "You must be friends to view their friends list") {
            return (
                <div className="container mx-auto max-w-4xl py-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Link href="/friends">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Friends
                                </Button>
                            </Link>
                        </div>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                    <Lock className="h-5 w-5" />
                                    Private Friends List
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center py-8">
                                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-muted-foreground mb-4">
                                        This user&apos;s friends list is private. You need to be friends with them to see who they&apos;re connected with.
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <Link href="/friends">
                                            <Button variant="outline">
                                                Find Friends
                                            </Button>
                                        </Link>
                                        <Link href="/dashboard">
                                            <Button>
                                                Go to Dashboard
                                            </Button>
                                        </Link>
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
        <div className="container mx-auto max-w-4xl py-8">
            <UserFriendsView 
                userInfo={result.userInfo}
                friends={result.friends}
            />
        </div>
    );
}