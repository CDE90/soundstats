import "server-only";
import { Skeleton } from "@/components/ui/skeleton";
import {
    MusicCollection,
    MusicCollectionSkeleton,
} from "@/components/music-collection";
import {
    getUserStreaks,
    getUsersOverallStreaks,
    type StreakType,
} from "@/server/lib";
import { Flame } from "lucide-react";
import { cacheLife } from "next/cache";
import { StreakNotExtendedTooltip } from "@/components/streak";

export function StreakSkeleton() {
    return <MusicCollectionSkeleton count={5} />;
}

export async function GenericStreaks({
    userId,
    type,
    limit = 100,
    endDate,
    startDate,
}: {
    userId: string;
    type: StreakType;
    limit?: number;
    endDate?: Date;
    startDate?: Date;
}) {
    "use cache";
    cacheLife("hours");
    const streaks = (await getUserStreaks(userId, limit, type, endDate)).filter(
        (streak) => streak.streakLength > 1,
    );
    const to = endDate ?? new Date();
    const from = startDate ?? new Date(to.getTime() - 30 * 86_400_000);
    return (
        <MusicCollection
            label={`${type[0]!.toUpperCase()}${type.slice(1)} streaks`}
            context={{ userId, dateRange: { from, to } }}
            emptyMessage={`No ${type} streaks yet.`}
            items={streaks.map((streak) => ({
                id: streak.id,
                name: streak.name ?? "Untitled",
                imageUrl: streak.imageUrl,
                type,
                streak: {
                    days: streak.streakLength,
                    extendedToday: streak.isExtendedToday,
                },
            }))}
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
