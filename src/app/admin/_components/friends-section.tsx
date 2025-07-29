import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FriendsTable } from "./friends-table";
import { getFriendshipsWithUsers } from "../actions";

export async function FriendsSection() {
    const friendships = await getFriendshipsWithUsers();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Friends & Relationships</CardTitle>
            </CardHeader>
            <CardContent>
                <FriendsTable friendships={friendships} />
            </CardContent>
        </Card>
    );
}
