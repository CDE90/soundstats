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
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import "server-only";

type SortBy = "Playtime" | "Count";

interface LeaderboardUser {
    userId: string;
    metric: number;
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

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[20%] xs:w-[15%]">Rank</TableHead>
                    <TableHead className="w-[40%] xs:w-[50%]">User</TableHead>
                    <TableHead className="w-[40%] xs:w-[35%]">
                        {sortBy}
                    </TableHead>
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
                                                    ) : user.rankChange < 0 ? (
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
                                    ) : null}
                                    <span className="truncate">
                                        {clerkUser?.firstName ?? "Unknown"}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
                                    <span>
                                        {sortBy === "Playtime"
                                            ? formatDuration(user.metric)
                                            : Number(
                                                  user.metric,
                                              ).toLocaleString()}
                                    </span>
                                    <PercentageBadge
                                        percentChange={user.percentChange}
                                    />
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
