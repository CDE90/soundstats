import { Skeleton } from "@/components/ui/skeleton";
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
    getUserStreaks,
    getUsersOverallStreaks,
    type StreakType,
} from "@/server/lib";
import { Flame } from "lucide-react";
import { cacheLife } from "next/cache";
import { StreakNotExtendedTooltip } from "@/components/streak";
import "server-only";
import { MusicItem } from "./music-item";

/**
 * Loading skeleton for streak cards
 */
export function StreakSkeleton({
    isTabbed = false,
}: { isTabbed?: boolean } = {}) {
    return (
        <div
            className={
                isTabbed
                    ? "ss-streak-table ss-streak-table-tabbed"
                    : "ss-streak-table"
            }
        >
            <Table className="ss-data-table">
                <TableHeader>
                    <TableHeadRow>
                        <TableHead>Music</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                    </TableHeadRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 5 }, (_, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-12 w-12" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <Skeleton className="ml-auto h-5 w-8" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * Unified server component to display listening streaks for artists, tracks, or albums
 */
export async function GenericStreaks({
    userId,
    type,
    limit = 100,
    isTabbed = false,
    endDate,
    startDate,
}: {
    userId: string;
    type: StreakType;
    limit?: number;
    isTabbed?: boolean;
    endDate?: Date;
    startDate?: Date;
}) {
    "use cache";

    cacheLife("hours");

    // Get streaks using the getUserStreaks function
    let streaksData = await getUserStreaks(userId, limit, type, endDate);

    // Limit to only streaks with more than 1 day
    streaksData = streaksData.filter((streak) => streak.streakLength > 1);

    // Convert to the format needed for the component
    const streakItems = streaksData.map((streak) => ({
        id: streak.id,
        name: streak.name ?? "",
        imageUrl: streak.imageUrl ?? "",
        streak: streak.streakLength,
        isExtendedToday: streak.isExtendedToday,
    }));

    const to = endDate ?? new Date();
    const from = startDate ?? new Date(to.getTime() - 30 * 86_400_000);
    const title = { artist: "Artist", track: "Track", album: "Album" }[type];

    return (
        <div
            className={
                isTabbed
                    ? "ss-streak-table ss-streak-table-tabbed"
                    : "ss-streak-table"
            }
        >
            <Table className="ss-data-table">
                <TableHeader>
                    <TableHeadRow>
                        <TableHead>{title}</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                    </TableHeadRow>
                </TableHeader>
                <TableBody>
                    {streakItems.length ? (
                        streakItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <MusicItem
                                        type={type}
                                        id={item.id}
                                        name={item.name}
                                        imageUrl={item.imageUrl || null}
                                        userId={userId}
                                        dateRange={{ from, to }}
                                    />
                                </TableCell>
                                <TableCell className="ss-streak-value">
                                    <span className="inline-flex items-center justify-end gap-1.5">
                                        {!item.isExtendedToday && (
                                            <StreakNotExtendedTooltip />
                                        )}
                                        <Flame
                                            size={14}
                                            className="text-primary"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {item.streak}
                                            <span className="sr-only">
                                                {" "}
                                                days
                                            </span>
                                        </span>
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={2} className="ss-table-empty">
                                No {type} streaks yet. Listen on consecutive
                                days to start one.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * Server component to display artist listening streaks
 */
export async function ArtistStreaks({
    userId,
    limit = 100,
    endDate,
    startDate,
}: {
    userId: string;
    limit?: number;
    endDate?: Date;
    startDate?: Date;
}) {
    return (
        <GenericStreaks
            userId={userId}
            type="artist"
            limit={limit}
            endDate={endDate}
            startDate={startDate}
        />
    );
}

/**
 * Server component to display track listening streaks
 */
export async function TrackStreaks({
    userId,
    limit = 100,
    endDate,
    startDate,
}: {
    userId: string;
    limit?: number;
    endDate?: Date;
    startDate?: Date;
}) {
    return (
        <GenericStreaks
            userId={userId}
            type="track"
            limit={limit}
            endDate={endDate}
            startDate={startDate}
        />
    );
}

/**
 * Server component to display album listening streaks
 */
export async function AlbumStreaks({
    userId,
    limit = 100,
    endDate,
    startDate,
}: {
    userId: string;
    limit?: number;
    endDate?: Date;
    startDate?: Date;
}) {
    return (
        <GenericStreaks
            userId={userId}
            type="album"
            limit={limit}
            endDate={endDate}
            startDate={startDate}
        />
    );
}

/**
 * Server component to display overall listening streak
 */
export async function OverallListeningStreak({
    userId,
    endDate,
    summary = false,
}: {
    userId: string;
    endDate?: Date;
    summary?: boolean;
}) {
    "use cache";

    cacheLife("hours");

    // Get the user's overall listening streak using the new function
    const result = await getUsersOverallStreaks([userId], endDate);

    // Use the streak length or default to 0 if no streak found
    const streak = result?.get(userId)?.streakLength ?? 0;

    if (summary) {
        return (
            <div className="flex flex-col items-start gap-1.5">
                <div className="flex items-center gap-2">
                    <p className="ss-metric-value">{streak}</p>
                    {streak > 0 && !result?.get(userId)?.isExtendedToday ? (
                        <StreakNotExtendedTooltip />
                    ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                    {streak === 1 ? "day" : "days"} in a row
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900 sm:h-10 sm:w-10">
                <Flame className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />
            </div>
            <div>
                <div className="flex flex-row items-center gap-1 text-lg font-bold sm:text-xl">
                    {streak}
                    {!result?.get(userId)?.isExtendedToday ? (
                        <StreakNotExtendedTooltip />
                    ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                    {streak === 1 ? "day" : "days"} in a row
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton loader for overall listening streak
 */
export function OverallListeningStreakSkeleton() {
    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-8 w-8 rounded-full sm:h-10 sm:w-10" />
            <div>
                <Skeleton className="mb-1 h-4 w-12 sm:h-5 sm:w-14" />
                <Skeleton className="h-3 w-16 sm:w-20" />
            </div>
        </div>
    );
}
