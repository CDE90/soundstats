import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersSection } from "./users-section";
import { InvitesSection } from "./invites-section";
import { FriendsSection } from "./friends-section";
import { StatsOverview } from "./stats-overview";
import { AnalyticsSection } from "./analytics-section";

export function AdminDashboard() {
    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Manage users, invites, relationships, and monitor site
                    statistics
                </p>
            </div>

            <StatsOverview />

            <Tabs defaultValue="users" className="mt-8">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="invites">Invites</TabsTrigger>
                    <TabsTrigger value="friends">Friends</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6">
                    <UsersSection />
                </TabsContent>

                <TabsContent value="invites" className="mt-6">
                    <InvitesSection />
                </TabsContent>

                <TabsContent value="friends" className="mt-6">
                    <FriendsSection />
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                    <AnalyticsSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}
