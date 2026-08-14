import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersSection } from "./users-section";
import { InvitesSection } from "./invites-section";
import { FriendsSection } from "./friends-section";
import { StatsOverview } from "./stats-overview";
import { AnalyticsSection } from "./analytics-section";
import Link from "next/link";

type AdminTab = "overview" | "users" | "invites" | "friends" | "analytics";
type AnalyticsView = "activity" | "content" | "users" | "growth";

const tabs: Array<{ value: AdminTab; label: string }> = [
    { value: "overview", label: "Overview" },
    { value: "users", label: "Users" },
    { value: "invites", label: "Invites" },
    { value: "friends", label: "Friends" },
    { value: "analytics", label: "Analytics" },
];

export function AdminDashboard({
    activeTab,
    analyticsView,
}: {
    activeTab: AdminTab;
    analyticsView: AnalyticsView;
}) {
    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Monitor service activity and manage SoundStats.
                </p>
            </div>

            <Tabs value={activeTab}>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} asChild>
                            <Link
                                prefetch={false}
                                href={
                                    tab.value === "overview"
                                        ? "/admin"
                                        : `/admin?tab=${tab.value}`
                                }
                            >
                                {tab.label}
                            </Link>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {activeTab === "overview" ? (
                    <TabsContent value="overview" className="mt-6">
                        <StatsOverview />
                    </TabsContent>
                ) : null}

                {activeTab === "users" ? (
                    <TabsContent value="users" className="mt-6">
                        <UsersSection />
                    </TabsContent>
                ) : null}

                {activeTab === "invites" ? (
                    <TabsContent value="invites" className="mt-6">
                        <InvitesSection />
                    </TabsContent>
                ) : null}

                {activeTab === "friends" ? (
                    <TabsContent value="friends" className="mt-6">
                        <FriendsSection />
                    </TabsContent>
                ) : null}

                {activeTab === "analytics" ? (
                    <TabsContent value="analytics" className="mt-6">
                        <AnalyticsSection activeView={analyticsView} />
                    </TabsContent>
                ) : null}
            </Tabs>
        </div>
    );
}
