import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getListeningActivityStats } from "../../actions";
import { Clock, Headphones, Users, BarChart3 } from "lucide-react";

export async function ListeningActivityStats() {
    const stats = await getListeningActivityStats();

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Headphones className="h-4 w-4" />
                            Total Listens
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalListens.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            All time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Total Hours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalListeningHours.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Hours listened
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            Avg Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.avgSessionMinutes}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Minutes per session
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Active Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.activeUsersWeek}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Users active this week
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Daily Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {stats.dailyActivity.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <h4 className="mb-2 text-sm font-medium">
                                        Recent Activity
                                    </h4>
                                    <div className="space-y-1">
                                        {stats.dailyActivity
                                            .slice(-7)
                                            .map((day, index) => (
                                                <div
                                                    key={index}
                                                    className="flex justify-between text-sm"
                                                >
                                                    <span>
                                                        {new Date(
                                                            day.date,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                    <span>
                                                        {day.count} listens
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="mb-2 text-sm font-medium">
                                        Summary
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span>
                                                Total Days with Activity:
                                            </span>
                                            <span>
                                                {stats.dailyActivity.length}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Avg Daily Listens:</span>
                                            <span>
                                                {stats.dailyActivity.length > 0
                                                    ? Math.round(
                                                          stats.dailyActivity.reduce(
                                                              (sum, day) =>
                                                                  sum +
                                                                  day.count,
                                                              0,
                                                          ) /
                                                              stats
                                                                  .dailyActivity
                                                                  .length,
                                                      )
                                                    : 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Peak Day:</span>
                                            <span>
                                                {Math.max(
                                                    0,
                                                    ...stats.dailyActivity.map(
                                                        (d) => d.count,
                                                    ),
                                                )}{" "}
                                                listens
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No recent activity data available
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
