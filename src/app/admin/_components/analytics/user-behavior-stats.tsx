import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getUserBehaviorStats } from "../../actions";
import { Crown, Activity, BarChart3 } from "lucide-react";

export async function UserBehaviorStats() {
    const stats = await getUserBehaviorStats();

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    return (
        <div className="space-y-6">
            {/* Top Users */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Most Active Users
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {stats.topUsers.length > 0 ? (
                            stats.topUsers.map((user, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                #{index + 1}
                                            </Badge>
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>
                                                    {user.userSpotifyId
                                                        ?.slice(0, 2)
                                                        .toUpperCase() ?? "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-medium">
                                                    {user.userSpotifyId ??
                                                        "Unknown User"}
                                                </div>
                                                {user.isPremium && (
                                                    <Crown className="h-3 w-3 text-yellow-500" />
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {user.playCount} total plays
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {formatDuration(
                                            user.totalListeningMs ?? 0,
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No user data available
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Premium vs Regular Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="h-4 w-4" />
                            Premium vs Regular Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.premiumVsRegular.length > 0 ? (
                                stats.premiumVsRegular.map((segment, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={
                                                        segment.isPremium
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {segment.isPremium
                                                        ? "Premium"
                                                        : "Regular"}
                                                </Badge>
                                                <span className="text-sm">
                                                    {segment.userCount} users
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex justify-between">
                                                <span>Total listening:</span>
                                                <span>
                                                    {formatDuration(
                                                        Number(
                                                            segment.totalListeningMs,
                                                        ) ?? 0,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Avg per user:</span>
                                                <span>
                                                    {formatDuration(
                                                        segment.userCount > 0
                                                            ? Math.round(
                                                                  (Number(
                                                                      segment.totalListeningMs,
                                                                  ) ?? 0) /
                                                                      segment.userCount,
                                                              )
                                                            : 0,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No user segment data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* User Activity Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            User Activity Distribution (Last 30 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.userActivityDistribution.length > 0 ? (
                                stats.userActivityDistribution.map(
                                    (bucket, index) => {
                                        const total =
                                            stats.userActivityDistribution.reduce(
                                                (sum, b) => sum + b.userCount,
                                                0,
                                            );
                                        const percentage =
                                            total > 0
                                                ? Math.round(
                                                      (bucket.userCount /
                                                          total) *
                                                          100,
                                                  )
                                                : 0;

                                        return (
                                            <div
                                                key={index}
                                                className="space-y-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        {bucket.bucket}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">
                                                            {bucket.userCount}{" "}
                                                            users
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {percentage}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-secondary">
                                                    <div
                                                        className="h-2 rounded-full bg-primary transition-all"
                                                        style={{
                                                            width: `${percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    },
                                )
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No activity distribution data available
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
