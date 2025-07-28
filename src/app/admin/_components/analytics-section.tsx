import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListeningActivityStats } from "./analytics/listening-activity-stats";
import { TopContentStats } from "./analytics/top-content-stats";
import { UserBehaviorStats } from "./analytics/user-behavior-stats";
import { PlatformGrowthStats } from "./analytics/platform-growth-stats";

export async function AnalyticsSection() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="activity" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="activity">
                            Listening Activity
                        </TabsTrigger>
                        <TabsTrigger value="content">Top Content</TabsTrigger>
                        <TabsTrigger value="users">User Behavior</TabsTrigger>
                        <TabsTrigger value="growth">
                            Platform Growth
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="activity" className="mt-6">
                        <ListeningActivityStats />
                    </TabsContent>

                    <TabsContent value="content" className="mt-6">
                        <TopContentStats />
                    </TabsContent>

                    <TabsContent value="users" className="mt-6">
                        <UserBehaviorStats />
                    </TabsContent>

                    <TabsContent value="growth" className="mt-6">
                        <PlatformGrowthStats />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
