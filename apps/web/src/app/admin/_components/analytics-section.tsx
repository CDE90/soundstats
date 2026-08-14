import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListeningActivityStats } from "./analytics/listening-activity-stats";
import { TopContentStats } from "./analytics/top-content-stats";
import { UserBehaviorStats } from "./analytics/user-behavior-stats";
import { PlatformGrowthStats } from "./analytics/platform-growth-stats";
import Link from "next/link";

type AnalyticsView = "activity" | "content" | "users" | "growth";

const views: Array<{ value: AnalyticsView; label: string }> = [
    { value: "activity", label: "Activity" },
    { value: "content", label: "Top Content" },
    { value: "users", label: "User Behavior" },
    { value: "growth", label: "Growth" },
];

export async function AnalyticsSection({
    activeView,
}: {
    activeView: AnalyticsView;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeView} className="w-full">
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
                        {views.map((view) => (
                            <TabsTrigger
                                key={view.value}
                                value={view.value}
                                asChild
                            >
                                <Link
                                    href={`/admin?tab=analytics&view=${view.value}`}
                                    prefetch={false}
                                >
                                    {view.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {activeView === "activity" ? (
                        <TabsContent value="activity" className="mt-6">
                            <ListeningActivityStats />
                        </TabsContent>
                    ) : null}

                    {activeView === "content" ? (
                        <TabsContent value="content" className="mt-6">
                            <TopContentStats />
                        </TabsContent>
                    ) : null}

                    {activeView === "users" ? (
                        <TabsContent value="users" className="mt-6">
                            <UserBehaviorStats />
                        </TabsContent>
                    ) : null}

                    {activeView === "growth" ? (
                        <TabsContent value="growth" className="mt-6">
                            <PlatformGrowthStats />
                        </TabsContent>
                    ) : null}
                </Tabs>
            </CardContent>
        </Card>
    );
}
