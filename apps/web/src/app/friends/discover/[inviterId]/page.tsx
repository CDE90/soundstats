import { redirect } from "next/navigation";
import { getUserFriends } from "../../actions";
import { FriendDiscoveryView } from "./_components/friend-discovery-view";

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
        <div className="container mx-auto max-w-4xl py-8">
            <FriendDiscoveryView
                inviterInfo={result.userInfo}
                friends={result.friends}
            />
        </div>
    );
}
