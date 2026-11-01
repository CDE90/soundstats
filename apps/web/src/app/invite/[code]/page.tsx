import { PageHeading } from "@/components/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AcceptInviteButton } from "./_components/accept-invite-button";
import { getInviteByCode, getInviteViewerState } from "../actions";
import { auth } from "@clerk/nextjs/server";
import { Users, Disc3, Headphones } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { connection } from "next/server";
import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "You're invited",
    description: "You have been invited to join SoundStats.",
};

export default async function InvitePage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    await connection();
    const { code } = await params;
    const { userId } = await auth();
    const result = await getInviteByCode(code);

    if ("error" in result) {
        return (
            <div className="ss-page ss-page-narrow">
                <PageHeading
                    title="Invite unavailable."
                    description={result.error}
                />
                <Button asChild>
                    <Link href="/">Back to SoundStats</Link>
                </Button>
            </div>
        );
    }
    const { invite, inviterName, inviterImage } = result;
    const relationship = await getInviteViewerState(invite.createdBy);

    return (
        <div className="ss-page ss-invite-landing">
            <PageHeading
                title={
                    relationship === "owner"
                        ? "Your invite."
                        : relationship === "friends"
                          ? "You’re already connected."
                          : relationship === "pending"
                            ? "A request is pending."
                            : "You’re invited."
                }
                description={
                    relationship === "owner"
                        ? "Share this link to bring friends into your listening circle."
                        : `${inviterName} wants to share their listening with you.`
                }
            />
            <div className="ss-invite-welcome-layout">
                <Card>
                    <CardContent className="p-7 sm:p-9">
                        <Avatar className="mb-6 h-20 w-20">
                            <AvatarImage src={inviterImage} alt={inviterName} />
                            <AvatarFallback>
                                {inviterName
                                    .split(" ")
                                    .map((name) => name[0])
                                    .join("")}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="mb-3">
                            {relationship === "owner"
                                ? "Bring friends into your circle."
                                : relationship === "friends"
                                  ? `Explore ${inviterName}’s listening.`
                                  : `Join ${inviterName}’s circle.`}
                        </h2>
                        <p className="mb-6 text-sm leading-7 text-muted-foreground">
                            {relationship === "owner"
                                ? "People who use this link can become friends with you. Manage its usage limit or disable it from your invites."
                                : relationship === "friends"
                                  ? "You already share music statistics and listening activity. Open their listening to explore more."
                                  : relationship === "pending"
                                    ? "Review your existing friend request to continue. You don’t need to accept this invite as well."
                                    : "Accepting this invite makes you friends on SoundStats. You’ll be able to see each other’s music statistics and listening activity."}
                        </p>
                        <div className="mb-7 flex flex-wrap gap-2">
                            <Badge variant="secondary">{invite.code}</Badge>
                            {invite.name && (
                                <Badge variant="outline">{invite.name}</Badge>
                            )}
                        </div>
                        <dl className="ss-invite-facts mb-8">
                            <div>
                                <dt>Uses</dt>
                                <dd>
                                    {invite.currentUses}
                                    {invite.maxUses
                                        ? ` / ${invite.maxUses}`
                                        : " / unlimited"}
                                </dd>
                            </div>
                            <div>
                                <dt>Created</dt>
                                <dd>
                                    {formatDistanceToNow(invite.createdAt, {
                                        addSuffix: true,
                                    })}
                                </dd>
                            </div>
                            <div>
                                <dt>Expires</dt>
                                <dd>
                                    {invite.expiresAt
                                        ? formatDistanceToNow(
                                              invite.expiresAt,
                                              { addSuffix: true },
                                          )
                                        : "Never"}
                                </dd>
                            </div>
                        </dl>
                        <AcceptInviteButton
                            inviteCode={invite.code}
                            inviterName={inviterName}
                            isAuthenticated={!!userId}
                            relationship={relationship}
                            inviterId={invite.createdBy}
                        />
                    </CardContent>
                </Card>
                <aside className="ss-invite-intro">
                    <h2>A shared soundtrack.</h2>
                    <div>
                        <Headphones aria-hidden="true" />
                        <h3>See what’s playing.</h3>
                        <p>
                            Catch the tracks your friends are listening to in
                            your feed.
                        </p>
                    </div>
                    <div>
                        <Disc3 aria-hidden="true" />
                        <h3>Explore their favourites.</h3>
                        <p>
                            Get to know the artists, tracks, and albums they
                            return to.
                        </p>
                    </div>
                    <div>
                        <Users aria-hidden="true" />
                        <h3>Compare your listening.</h3>
                        <p>
                            Find your place on the leaderboard and discover more
                            friends.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
