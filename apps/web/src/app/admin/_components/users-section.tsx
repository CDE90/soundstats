import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "./users-table";
import { getUsers } from "../actions";

export async function UsersSection() {
    const users = await getUsers();

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
                <UsersTable users={users} />
            </CardContent>
        </Card>
    );
}
