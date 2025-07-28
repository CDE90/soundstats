import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatformGrowthStats } from "../../actions";
import { TrendingUp, Users, Music, Calendar } from "lucide-react";

export async function PlatformGrowthStats() {
    const stats = await getPlatformGrowthStats();

    return (
        <div className="space-y-6">
            {/* Content Library Overview */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Music className="h-4 w-4" />
                            Total Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.contentGrowth.totalTracks.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            +{stats.contentGrowth.recentTracks} this month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Total Artists
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.contentGrowth.totalArtists.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            +{stats.contentGrowth.recentArtists} this month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Total Albums
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.contentGrowth.totalAlbums.toLocaleString()}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            +{stats.contentGrowth.recentAlbums} this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* User Growth */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            User Growth (Last 90 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.userGrowth.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">
                                                Total New Users
                                            </div>
                                            <div className="text-lg font-semibold">
                                                {stats.userGrowth.reduce(
                                                    (sum, day) =>
                                                        sum + day.newUsers,
                                                    0,
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">
                                                Daily Average
                                            </div>
                                            <div className="text-lg font-semibold">
                                                {Math.round(
                                                    stats.userGrowth.reduce(
                                                        (sum, day) =>
                                                            sum + day.newUsers,
                                                        0,
                                                    ) / stats.userGrowth.length,
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="mb-2 text-sm font-medium">
                                            Recent Registrations
                                        </h4>
                                        <div className="space-y-1">
                                            {stats.userGrowth
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
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            +{day.newUsers}
                                                        </Badge>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No user growth data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Listening Activity Growth */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            Listening Activity (Last 90 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.listeningGrowth.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">
                                                Total Listens
                                            </div>
                                            <div className="text-lg font-semibold">
                                                {stats.listeningGrowth
                                                    .reduce(
                                                        (sum, day) =>
                                                            sum +
                                                            day.totalListens,
                                                        0,
                                                    )
                                                    .toLocaleString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">
                                                Peak Day
                                            </div>
                                            <div className="text-lg font-semibold">
                                                {Math.max(
                                                    ...stats.listeningGrowth.map(
                                                        (d) => d.totalListens,
                                                    ),
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="mb-2 text-sm font-medium">
                                            Recent Activity
                                        </h4>
                                        <div className="space-y-1">
                                            {stats.listeningGrowth
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
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">
                                                                {
                                                                    day.totalListens
                                                                }{" "}
                                                                listens
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                {
                                                                    day.uniqueUsers
                                                                }{" "}
                                                                users
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No listening activity data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
