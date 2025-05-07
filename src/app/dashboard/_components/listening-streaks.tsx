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
import { getUserStreaks, getUsersOverallStreaks } from "@/server/lib";
import { Flame } from "lucide-react";
import { unstable_cacheLife as cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import "server-only";

type StreakItem = {
    id: string;
    name: string;
    imageUrl: string;
    streak: number;
};

/**
 * Loading skeleton for streak cards
 */
export function StreakSkeleton() {
    return (
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
                    <TableHead className="w-[30%]">Streak</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: 3 }).map((_, index) => (
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
    );
}

/**
 * Server component to display artist listening streaks
 */
export async function ArtistStreaks({
    userId,
    limit = 3,
}: {
    userId: string;
    limit?: number;
}) {
    "use cache";

    cacheLife("hours");

    // Get artist streaks using the new getUserStreaks function
    const topArtistStreaks = await getUserStreaks(userId, limit, "artist");

    // Convert to the format needed for the component
    const streakItems: StreakItem[] = topArtistStreaks.map((streak) => ({
        id: streak.id,
        name: streak.name ?? "",
        imageUrl: streak.imageUrl ?? "",
        streak: streak.streakLength,
    }));

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[70%]">
                        <div className="flex items-center gap-1">
                            <span>Artist</span>
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
                    <TableHead className="w-[30%]">
                        <div className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                            <span>Streak</span>
                        </div>
                    </TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {streakItems.length > 0 ? (
                    streakItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex min-h-10 items-start gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:min-h-12 sm:gap-4"
                                    href={`https://open.spotify.com/artist/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-10 w-10 flex-shrink-0 xs:h-12 xs:w-12"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 flex-shrink-0 bg-muted xs:h-12 xs:w-12"></div>
                                    )}
                                    <span className="line-clamp-2 break-words text-xs sm:text-sm">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <span className="text-xs sm:text-sm">
                                    {item.streak} days
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
                            No artist streaks
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

/**
 * Server component to display track listening streaks
 */
export async function TrackStreaks({
    userId,
    limit = 3,
}: {
    userId: string;
    limit?: number;
}) {
    "use cache";

    cacheLife("hours");

    // Get track streaks using the new getUserStreaks function
    const topTrackStreaks = await getUserStreaks(userId, limit, "track");

    // Convert to the format needed for the component
    const streakItems: StreakItem[] = topTrackStreaks.map((streak) => ({
        id: streak.id,
        name: streak.name ?? "",
        imageUrl: streak.imageUrl ?? "",
        streak: streak.streakLength,
    }));

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[70%]">
                        <div className="flex items-center gap-1">
                            <span>Track</span>
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
                    <TableHead className="w-[30%]">
                        <div className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                            <span>Streak</span>
                        </div>
                    </TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {streakItems.length > 0 ? (
                    streakItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex min-h-10 items-start gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:min-h-12 sm:gap-2"
                                    href={`https://open.spotify.com/track/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-10 w-10 flex-shrink-0 xs:h-12 xs:w-12"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 flex-shrink-0 bg-muted xs:h-12 xs:w-12"></div>
                                    )}
                                    <span className="line-clamp-2 break-words text-xs sm:text-sm">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <span className="text-xs sm:text-sm">
                                    {item.streak} days
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
                            No track streaks
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

/**
 * Server component to display album listening streaks
 */
export async function AlbumStreaks({
    userId,
    limit = 3,
}: {
    userId: string;
    limit?: number;
}) {
    "use cache";

    cacheLife("hours");

    // Get album streaks using the new getUserStreaks function
    const topAlbumStreaks = await getUserStreaks(userId, limit, "album");

    // Convert to the format needed for the component
    const streakItems: StreakItem[] = topAlbumStreaks.map((streak) => ({
        id: streak.id,
        name: streak.name ?? "",
        imageUrl: streak.imageUrl ?? "",
        streak: streak.streakLength,
    }));

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[70%]">
                        <div className="flex items-center gap-1">
                            <span>Album</span>
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
                    <TableHead className="w-[30%]">
                        <div className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                            <span>Streak</span>
                        </div>
                    </TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {streakItems.length > 0 ? (
                    streakItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex min-h-10 items-start gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:min-h-12 sm:gap-2"
                                    href={`https://open.spotify.com/album/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-10 w-10 flex-shrink-0 xs:h-12 xs:w-12"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 flex-shrink-0 bg-muted xs:h-12 xs:w-12"></div>
                                    )}
                                    <span className="line-clamp-2 break-words text-xs sm:text-sm">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <span className="text-xs sm:text-sm">
                                    {item.streak} days
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
                            No album streaks
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

/**
 * Server component to display overall listening streak
 */
export async function OverallListeningStreak({ userId }: { userId: string }) {
    "use cache";

    cacheLife("hours");

    // Get the user's overall listening streak using the new function
    const result = await getUsersOverallStreaks([userId]);

    // Use the streak length or default to 0 if no streak found
    const streak = result?.get(userId)?.streakLength ?? 0;

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900 sm:h-10 sm:w-10">
                <Flame className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />
            </div>
            <div>
                <div className="text-lg font-bold sm:text-xl">{streak}</div>
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
