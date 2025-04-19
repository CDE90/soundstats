import { PercentageBadge } from "@/components/percentage-badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableHeadRow,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDuration } from "@/lib/utils";
import { getRankChangeTooltip } from "@/server/lib";
import { clerkClient } from "@clerk/nextjs/server";
import { ArrowDown, ArrowUp, Clock, Flame, Hash, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import "server-only";
type SortBy = "Playtime" | "Count" | "Streak";

interface LeaderboardUser {
    userId: string;
    metric: number;
    playtime?: number;
    count?: number;
    streak?: number;
    percentChange: number | null;
    rankChange: number | null;
    previousRank: number | null;
}

// Get user data from Clerk
async function getUserData(userIds: string[]) {
    const client = await clerkClient();
    const { data: userData } = await client.users.getUserList({
        userId: userIds,
        limit: userIds.length,
    });
    return userData;
}

export default async function LeaderboardTable({
    userComparisons,
    sortBy,
}: {
    userComparisons: LeaderboardUser[];
    sortBy: SortBy;
}) {
    // Extract user IDs for Clerk fetching
    const userIds = userComparisons.map((user) => user.userId);

    // Get user profile data
    const userData = await getUserData(userIds);

    // Get metric order with the sorted one first
    const metricInfo = [
        { type: "Playtime", icon: <Clock className="h-4 w-4" /> },
        { type: "Count", icon: <Hash className="h-4 w-4" /> },
        { type: "Streak", icon: <Flame className="h-4 w-4 text-orange-500" /> },
    ];

    // Reorder metrics to have the sorted one first
    const orderedMetrics = [
        metricInfo.find((m) => m.type === sortBy)!,
        ...metricInfo.filter((m) => m.type !== sortBy),
    ];

    return (
        <div className="overflow-x-auto">
            <Table className="min-w-full">
                <TableHeader>
                    <TableHeadRow>
                        <TableHead className="w-16 min-w-16">Rank</TableHead>
                        <TableHead className="w-[22%] min-w-36 xs:w-[25%]">
                            User
                        </TableHead>

                        {/* Always show all metrics in separate columns, with sorted one first */}
                        {orderedMetrics.map((metric) => {
                            // Set minimum widths based on the metric type
                            const minWidthClass =
                                metric.type === "Playtime"
                                    ? "min-w-40"
                                    : "min-w-28";

                            // Give more width to the sorted column
                            const widthClass =
                                sortBy === metric.type ? "w-[24%]" : "w-[19%]";

                            return (
                                <TableHead
                                    key={metric.type}
                                    className={`${widthClass} ${minWidthClass}`}
                                >
                                    <div className="flex items-center gap-1">
                                        {metric.icon}
                                        <span
                                            className={
                                                sortBy === metric.type
                                                    ? "font-bold"
                                                    : ""
                                            }
                                        >
                                            {metric.type}
                                        </span>
                                    </div>
                                </TableHead>
                            );
                        })}
                    </TableHeadRow>
                </TableHeader>
                <TableBody>
                    {userComparisons.map((user, index) => {
                        const clerkUser = userData.find(
                            (innerUser) => innerUser.id === user.userId,
                        );
                        return (
                            <TableRow key={user.userId}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {index + 1}
                                        {user.rankChange !== null && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        {user.rankChange > 0 ? (
                                                            <ArrowUp className="h-4 w-4 text-green-600" />
                                                        ) : user.rankChange <
                                                          0 ? (
                                                            <ArrowDown className="h-4 w-4 text-red-600" />
                                                        ) : (
                                                            <Minus className="h-4 w-4 text-gray-500" />
                                                        )}
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {getRankChangeTooltip(
                                                            user.rankChange,
                                                            user.previousRank,
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Link
                                        className="flex h-12 items-center gap-2 text-wrap underline-offset-4 hover:underline xs:gap-4"
                                        href={`/dashboard?user=${user.userId}`}
                                    >
                                        {clerkUser?.imageUrl ? (
                                            <Image
                                                src={clerkUser?.imageUrl}
                                                alt={`${clerkUser?.firstName}'s profile picture`}
                                                width={48}
                                                height={48}
                                                className="h-10 w-10 rounded-full xs:h-12 xs:w-12"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-muted xs:h-12 xs:w-12"></div>
                                        )}
                                        <span className="truncate">
                                            {clerkUser?.firstName ?? "Unknown"}
                                        </span>
                                    </Link>
                                </TableCell>

                                {/* Metrics in the same order as headers */}
                                {orderedMetrics.map((metric) => {
                                    const metricType = metric.type as SortBy;
                                    let displayValue = "";

                                    // Get the correct value for this metric
                                    if (metricType === "Playtime") {
                                        displayValue = formatDuration(
                                            user.playtime ?? 0,
                                            false,
                                        );
                                    } else if (metricType === "Count") {
                                        displayValue = Number(
                                            user.count ?? 0,
                                        ).toLocaleString();
                                    } else {
                                        // Streak
                                        displayValue = `${Number(user.streak ?? 0).toLocaleString()} days`;
                                    }

                                    return (
                                        <TableCell key={metricType}>
                                            <div
                                                className={`flex flex-col items-start gap-1 xs:flex-col sm:flex-row sm:items-center sm:gap-2 ${sortBy === metricType ? "font-bold" : ""}`}
                                            >
                                                <span>{displayValue}</span>
                                                {sortBy === metricType &&
                                                    user.percentChange !==
                                                        null && (
                                                        <PercentageBadge
                                                            percentChange={
                                                                user.percentChange
                                                            }
                                                        />
                                                    )}
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
