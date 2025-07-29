import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvitesTable } from "./invites-table";
import { getInvites } from "../actions";

export async function InvitesSection() {
    const invites = await getInvites();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invite Management</CardTitle>
            </CardHeader>
            <CardContent>
                <InvitesTable invites={invites} />
            </CardContent>
        </Card>
    );
}
