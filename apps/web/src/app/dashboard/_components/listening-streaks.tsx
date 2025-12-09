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
import Image from "next/image";
import Link from "next/link";
import { StreakNotExtendedTooltip } from "@/components/streak";
import "server-only";

/**
 * Loading skeleton for streak cards
 */
export function StreakSkeleton({
    isTabbed = false,
}: { isTabbed?: boolean } = {}) {
    const heightClass = isTabbed ? "max-h-[320px]" : "max-h-[450px]";

    return (
        <div
            className={`relative scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 ${heightClass} overflow-y-auto pr-1`}
        >
            <div className="sticky top-0 z-10 bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableHeadRow>
                            <TableHead className="w-[70%]">
                                <div className="flex items-center gap-1">
                                    <span>Item</span>
                                    <Link
                                        href="https://open.spotify.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center opacity-80 transition-opacity hover:opacity-100"
                                    >
                                        <Image
                                            src="/spotify-assets/Spotify_Icon_RGB_Black.png"
                                            alt="Spotify"
                                            width={21}
                                            height={21}
                                            className="ml-1 dark:hidden"
                                        />
                                        <Image
                                            src="/spotify-assets/Spotify_Icon_RGB_White.png"
                                            alt="Spotify"
                                            width={21}
                                            height={21}
                                            className="ml-1 hidden dark:block"
                                        />
                                    </Link>
                                </div>
                            </TableHead>
                            <TableHead className="w-[30%] min-w-[80px]">
                                Streak
                            </TableHead>
                        </TableHeadRow>
                    </TableHeader>
                </Table>
            </div>
            <Table>
                <TableBody>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Skeleton className="h-10 w-10 xs:h-12 xs:w-12" />
                                    <Skeleton className="h-4 w-20 sm:w-28" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Skeleton className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <Skeleton className="h-4 w-12 sm:w-16" />
                                </div>
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
}: {
    userId: string;
    type: StreakType;
    limit?: number;
    isTabbed?: boolean;
    endDate?: Date;
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

    // Map type to the title and URL path
    const typeMap = {
        artist: { title: "Artist", urlPath: "artist" },
        track: { title: "Track", urlPath: "track" },
        album: { title: "Album", urlPath: "album" },
    };

    const { title, urlPath } = typeMap[type];
    const emptyMessage = `No ${type.toLowerCase()} streaks`;

    // Use a taller container when in tabbed mode
    const heightClass = isTabbed ? "max-h-[320px]" : "max-h-[450px]";

    return (
        <div
            className={`relative scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 ${heightClass} overflow-y-auto pr-1`}
        >
            <div className="sticky top-0 z-10 bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        <TableHeadRow>
                            <TableHead className="w-[70%]">
                                <div className="flex items-center gap-1">
                                    <span>{title}</span>
                                    <Link
                                        href="https://open.spotify.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center opacity-80 transition-opacity hover:opacity-100"
                                    >
                                        <Image
                                            src="/spotify-assets/Spotify_Icon_RGB_Black.png"
                                            alt="Spotify"
                                            width={21}
                                            height={21}
                                            className="ml-1 dark:hidden"
                                        />
                                        <Image
                                            src="/spotify-assets/Spotify_Icon_RGB_White.png"
                                            alt="Spotify"
                                            width={21}
                                            height={21}
                                            className="ml-1 hidden dark:block"
                                        />
                                    </Link>
                                </div>
                            </TableHead>
                            <TableHead className="w-[30%] min-w-[80px]">
                                <div className="flex items-center gap-1">
                                    <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                                    <span>Streak</span>
                                </div>
                            </TableHead>
                        </TableHeadRow>
                    </TableHeader>
                </Table>
            </div>
            <Table>
                <TableBody>
                    {streakItems.length > 0 ? (
                        streakItems.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <Link
                                        className="flex min-h-10 items-center gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:min-h-12 sm:gap-2"
                                        href={`https://open.spotify.com/${urlPath}/${item.id}`}
                                        target="_blank"
                                    >
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.name}
                                                width={48}
                                                height={48}
                                                className="h-10 w-10 flex-shrink-0 rounded-[2px] xs:h-12 xs:w-12 sm:rounded-[4px]"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 flex-shrink-0 rounded-[2px] bg-muted xs:h-12 xs:w-12 sm:rounded-[4px]"></div>
                                        )}
                                        <span className="line-clamp-2 break-words text-xs sm:text-sm">
                                            {item.name}
                                        </span>
                                    </Link>
                                </TableCell>
                                <TableCell className="min-w-[80px]">
                                    <span className="flex flex-row items-center gap-1 text-xs sm:text-sm">
                                        {!item.isExtendedToday ? (
                                            <StreakNotExtendedTooltip />
                                        ) : null}
                                        <span className="whitespace-nowrap">
                                            {item.streak} days
                                        </span>
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={2}
                                className="text-center text-muted-foreground"
                            >
                                {emptyMessage}
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
}: {
    userId: string;
    limit?: number;
    endDate?: Date;
}) {
    return (
        <GenericStreaks
            userId={userId}
            type="artist"
            limit={limit}
            endDate={endDate}
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
}: {
    userId: string;
    limit?: number;
    endDate?: Date;
}) {
    return (
        <GenericStreaks
            userId={userId}
            type="track"
            limit={limit}
            endDate={endDate}
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
}: {
    userId: string;
    limit?: number;
    endDate?: Date;
}) {
    return (
        <GenericStreaks
            userId={userId}
            type="album"
            limit={limit}
            endDate={endDate}
        />
    );
}

/**
 * Server component to display overall listening streak
 */
export async function OverallListeningStreak({
    userId,
    endDate,
}: {
    userId: string;
    endDate?: Date;
}) {
    "use cache";

    cacheLife("hours");

    // Get the user's overall listening streak using the new function
    const result = await getUsersOverallStreaks([userId], endDate);

    // Use the streak length or default to 0 if no streak found
    const streak = result?.get(userId)?.streakLength ?? 0;

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
