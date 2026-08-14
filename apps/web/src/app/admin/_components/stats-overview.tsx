import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/server/db";
import {
    friends,
    invites,
    listeningHistory,
    streamingUploads,
    users,
} from "@/server/db/schema";
import { count, eq, max, sql } from "drizzle-orm";

function formatNumber(value: number) {
    return new Intl.NumberFormat("en").format(value);
}

function formatDate(value: Date | null) {
    if (!value) return "No listening data";

    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export async function StatsOverview() {
    const [userRows, activityRows, uploadRows, inviteRows, friendRows] =
        await Promise.all([
            db
                .select({
                    total: count(),
                    enabled:
                        sql<number>`COUNT(*) FILTER (WHERE ${users.enabled} = true)`.mapWith(
                            Number,
                        ),
                    premium:
                        sql<number>`COUNT(*) FILTER (WHERE ${users.premiumUser} = true)`.mapWith(
                            Number,
                        ),
                    newThisWeek:
                        sql<number>`COUNT(*) FILTER (WHERE ${users.createdAt} >= NOW() - INTERVAL '7 days')`.mapWith(
                            Number,
                        ),
                })
                .from(users),
            db
                .select({
                    listensToday:
                        sql<number>`COUNT(*) FILTER (WHERE ${listeningHistory.playedAt} >= DATE_TRUNC('day', NOW()))`.mapWith(
                            Number,
                        ),
                    activeUsersDay:
                        sql<number>`COUNT(DISTINCT ${listeningHistory.userId}) FILTER (WHERE ${listeningHistory.playedAt} >= NOW() - INTERVAL '24 hours')`.mapWith(
                            Number,
                        ),
                    activeUsersWeek:
                        sql<number>`COUNT(DISTINCT ${listeningHistory.userId}) FILTER (WHERE ${listeningHistory.playedAt} >= NOW() - INTERVAL '7 days')`.mapWith(
                            Number,
                        ),
                    latestListen: max(listeningHistory.playedAt),
                })
                .from(listeningHistory),
            db
                .select({
                    pending:
                        sql<number>`COUNT(*) FILTER (WHERE ${streamingUploads.processed} = false AND ${streamingUploads.invalidFile} = false)`.mapWith(
                            Number,
                        ),
                    invalid:
                        sql<number>`COUNT(*) FILTER (WHERE ${streamingUploads.invalidFile} = true)`.mapWith(
                            Number,
                        ),
                })
                .from(streamingUploads),
            db
                .select({ count: count() })
                .from(invites)
                .where(eq(invites.status, "active")),
            db
                .select({ count: count() })
                .from(friends)
                .where(eq(friends.status, "pending")),
        ]);

    const userStats = userRows[0] ?? {
        total: 0,
        enabled: 0,
        premium: 0,
        newThisWeek: 0,
    };
    const activityStats = activityRows[0] ?? {
        listensToday: 0,
        activeUsersDay: 0,
        activeUsersWeek: 0,
        latestListen: null,
    };
    const uploadStats = uploadRows[0] ?? { pending: 0, invalid: 0 };
    const trackingRate =
        userStats.total > 0
            ? Math.round((userStats.enabled / userStats.total) * 100)
            : 0;
    const disabledUsers = userStats.total - userStats.enabled;

    const stats = [
        {
            title: "Registered users",
            value: formatNumber(userStats.total),
            description: `${formatNumber(userStats.newThisWeek)} joined in the last 7 days`,
        },
        {
            title: "Tracking enabled",
            value: formatNumber(userStats.enabled),
            description: `${trackingRate}% of all users · ${formatNumber(disabledUsers)} disabled`,
        },
        {
            title: "Active users",
            value: formatNumber(activityStats.activeUsersDay),
            description: `${formatNumber(activityStats.activeUsersWeek)} active in the last 7 days`,
        },
        {
            title: "Listens today",
            value: formatNumber(activityStats.listensToday),
            description: `Latest: ${formatDate(activityStats.latestListen)}`,
        },
        {
            title: "Premium polling",
            value: formatNumber(userStats.premium),
            description: "Users checked every 20 seconds",
        },
        {
            title: "Import queue",
            value: formatNumber(uploadStats.pending),
            description: `${formatNumber(uploadStats.invalid)} invalid uploads`,
            needsAttention: uploadStats.pending > 10 || uploadStats.invalid > 0,
        },
        {
            title: "Active invites",
            value: formatNumber(inviteRows[0]?.count ?? 0),
            description: "Invite codes available for use",
        },
        {
            title: "Pending friend requests",
            value: formatNumber(friendRows[0]?.count ?? 0),
            description: "Requests waiting for a response",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Service overview</h2>
                    <p className="text-muted-foreground text-sm">
                        Current usage, tracking activity, and work queues.
                    </p>
                </div>
                <Badge variant="outline">Live database data</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <Card
                        key={stat.title}
                        className={
                            stat.needsAttention
                                ? "border-amber-500/60 bg-amber-500/5"
                                : undefined
                        }
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-muted-foreground text-sm font-medium">
                                    {stat.title}
                                </CardTitle>
                                {stat.needsAttention ? (
                                    <Badge variant="outline">Check</Badge>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stat.value}
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
