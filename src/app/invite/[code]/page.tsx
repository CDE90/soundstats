import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AcceptInviteButton } from "./_components/accept-invite-button";
import { getInviteByCode } from "../actions";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Users, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { connection } from "next/server";

interface InvitePageProps {
    params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
    await connection();

    const { code } = await params;
    const { userId } = await auth();

    if (!userId) {
        redirect(
            `/sign-in?redirect_url=${encodeURIComponent(`/invite/${code}`)}`,
        );
    }

    const result = await getInviteByCode(code);

    if ("error" in result) {
        return (
            <div className="container mx-auto max-w-2xl px-4 py-8">
                <Card className="border-destructive/20">
                    <CardHeader>
                        <CardTitle className="text-destructive">
                            Invalid Invite
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{result.error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { invite, inviterName, inviterImage } = result;

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-8 text-center">
                <div className="mb-4">
                    <Users className="mx-auto h-12 w-12 text-primary" />
                </div>
                <h1 className="mb-2 text-3xl font-bold">
                    You&apos;re Invited to SoundStats!
                </h1>
                <p className="text-muted-foreground">
                    Join the community and discover music insights
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={inviterImage} alt={inviterName} />
                            <AvatarFallback>
                                {inviterName
                                    .split(" ")
                                    .map((n) => n.charAt(0))
                                    .join("")
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">
                                Invited by {inviterName}
                            </CardTitle>
                            <div className="mt-1 flex items-center gap-2">
                                <Badge variant="secondary">
                                    Code: {invite.code}
                                </Badge>
                                {invite.name && (
                                    <Badge variant="outline">
                                        {invite.name}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Uses:</span>
                            <span>
                                {invite.currentUses}
                                {invite.maxUses
                                    ? ` / ${invite.maxUses}`
                                    : " / ∞"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                Created:
                            </span>
                            <span>
                                {formatDistanceToNow(invite.createdAt, {
                                    addSuffix: true,
                                })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                Expires:
                            </span>
                            <span>
                                {invite.expiresAt
                                    ? formatDistanceToNow(invite.expiresAt, {
                                          addSuffix: true,
                                      })
                                    : "Never"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>What happens when you accept?</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            You&apos;ll automatically become friends with{" "}
                            {inviterName}
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            You&apos;ll be able to see each other&apos;s music
                            statistics
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            Compare your music taste and discover new artists
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            Join the SoundStats community and social features
                        </li>
                    </ul>

                    <AcceptInviteButton
                        inviteCode={invite.code}
                        inviterName={inviterName}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
