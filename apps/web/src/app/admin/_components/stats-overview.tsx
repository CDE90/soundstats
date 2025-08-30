import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import { users, invites, friends } from "@/server/db/schema";
import { count, eq } from "drizzle-orm";

export async function StatsOverview() {
    const [
        totalUsersResult,
        enabledUsersResult,
        premiumUsersResult,
        adminUsersResult,
        activeInvitesResult,
        friendshipRequestsResult,
    ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db
            .select({ count: count() })
            .from(users)
            .where(eq(users.enabled, true)),
        db
            .select({ count: count() })
            .from(users)
            .where(eq(users.premiumUser, true)),
        db
            .select({ count: count() })
            .from(users)
            .where(eq(users.isAdmin, true)),
        db
            .select({ count: count() })
            .from(invites)
            .where(eq(invites.status, "active")),
        db
            .select({ count: count() })
            .from(friends)
            .where(eq(friends.status, "pending")),
    ]);

    const stats = [
        {
            title: "Total Users",
            value: totalUsersResult[0]?.count ?? 0,
            description: "All registered users",
        },
        {
            title: "Active Users",
            value: enabledUsersResult[0]?.count ?? 0,
            description: "Enabled users",
        },
        {
            title: "Premium Users",
            value: premiumUsersResult[0]?.count ?? 0,
            description: "Users with premium access",
        },
        {
            title: "Admin Users",
            value: adminUsersResult[0]?.count ?? 0,
            description: "Users with admin privileges",
        },
        {
            title: "Active Invites",
            value: activeInvitesResult[0]?.count ?? 0,
            description: "Available invite codes",
        },
        {
            title: "Pending Friends",
            value: friendshipRequestsResult[0]?.count ?? 0,
            description: "Pending friend requests",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {stat.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {stat.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
