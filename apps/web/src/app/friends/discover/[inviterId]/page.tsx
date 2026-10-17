import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserFriends } from "../../actions";
import { FriendDiscoveryView } from "./_components/friend-discovery-view";

export const metadata: Metadata = { title: "Discover friends" };

interface FriendDiscoveryPageProps {
    params: Promise<{ inviterId: string }>;
}

export default async function FriendDiscoveryPage({
    params,
}: FriendDiscoveryPageProps) {
    const { inviterId } = await params;

    const result = await getUserFriends(inviterId);

    if ("error" in result) {
        // For discovery page, we should always have access since we just became friends
        // But handle edge cases by redirecting to friends page
        redirect("/friends");
    }

    if (!result.userInfo) {
        redirect("/friends");
    }

    return (
        <div className="ss-page ss-page-social">
            <FriendDiscoveryView
                inviterInfo={result.userInfo}
                friends={result.friends}
            />
        </div>
    );
}
