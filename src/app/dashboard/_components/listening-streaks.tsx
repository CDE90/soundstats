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
import { computeStreak } from "@/lib/utils";
import { db } from "@/server/db";
import {
    albums,
    artists,
    artistTracks,
    listeningHistory,
    tracks,
} from "@/server/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
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
                    <TableHead className="w-[70%]">Item</TableHead>
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
 * Helper function to find top streaks for a given set of dates
 */
function findTopStreaks(
    itemDates: Map<string, Set<string>>,
    limit = 3,
): { id: string; streak: number }[] {
    const streaks: { id: string; streak: number }[] = [];

    // Streak calculation now handles the today check internally

    itemDates.forEach((dates, id) => {
        // Use computeStreak with today requirement
        const s = computeStreak(dates, true);
        if (s > 0) {
            streaks.push({ id, streak: s });
        }
    });

    return streaks.sort((a, b) => b.streak - a.streak).slice(0, limit);
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

    // We only need recent history for current streak calculation
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 100); // 100 days is enough for streaks

    // Artist-level streaks: fetch artistId per play with date (optimized)
    const artistPlays = await db
        .select({
            artistId: artistTracks.artistId,
            date: sql<string>`DATE(${listeningHistory.playedAt})`, // Get just the date part
        })
        .from(listeningHistory)
        .innerJoin(
            artistTracks,
            eq(listeningHistory.trackId, artistTracks.trackId),
        )
        .where(
            and(
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.playedAt, startDate), // Only fetch recent history
            ),
        )
        .groupBy(
            artistTracks.artistId,
            sql`DATE(${listeningHistory.playedAt})`,
        ); // Get distinct dates per artist

    const artistDates = new Map<string, Set<string>>();
    artistPlays.forEach(({ artistId, date }) => {
        if (!artistDates.has(artistId)) artistDates.set(artistId, new Set());
        artistDates.get(artistId)!.add(date);
    });

    const topArtistStreaks = findTopStreaks(artistDates, limit);

    // Fetch metadata for top streak artists
    const streakItems: StreakItem[] = [];

    if (topArtistStreaks.length > 0) {
        const artistIds = topArtistStreaks.map((item) => item.id);

        const artistsInfo = await db
            .select({
                id: artists.id,
                name: artists.name,
                imageUrl: artists.imageUrl,
            })
            .from(artists)
            .where(
                artistIds.length > 0
                    ? inArray(artists.id, artistIds)
                    : undefined,
            );

        for (const streak of topArtistStreaks) {
            const artist = artistsInfo.find((a) => a.id === streak.id);
            if (artist && streak.streak > 0) {
                streakItems.push({
                    id: streak.id,
                    name: artist.name,
                    imageUrl: artist.imageUrl ?? "",
                    streak: streak.streak,
                });
            }
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[70%]">Artist</TableHead>
                    <TableHead className="w-[30%]">Streak</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {streakItems.length > 0 ? (
                    streakItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex h-10 items-center gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:h-12 sm:gap-4"
                                    href={`https://open.spotify.com/artist/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-10 w-10 xs:h-12 xs:w-12"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 bg-muted xs:h-12 xs:w-12"></div>
                                    )}
                                    <span className="line-clamp-2 text-xs xs:line-clamp-none sm:text-sm">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm">
                                        {item.streak} days
                                    </span>
                                </div>
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

    // We only need recent history for current streak calculation
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 100); // 100 days is enough for streaks

    // Fetch track-level streaks with optimized query
    const trackPlays = await db
        .select({
            trackId: listeningHistory.trackId,
            date: sql<string>`DATE(${listeningHistory.playedAt})`, // Get just the date part
        })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.playedAt, startDate), // Only fetch recent history
            ),
        )
        .groupBy(
            listeningHistory.trackId,
            sql`DATE(${listeningHistory.playedAt})`,
        ); // Get distinct dates per track

    // Group unique dates per track
    const trackDates = new Map<string, Set<string>>();
    trackPlays.forEach(({ trackId, date }) => {
        if (!trackDates.has(trackId)) trackDates.set(trackId, new Set());
        trackDates.get(trackId)!.add(date);
    });

    const topTrackStreaks = findTopStreaks(trackDates, limit);

    // Fetch metadata for top streak tracks
    const streakItems: StreakItem[] = [];

    if (topTrackStreaks.length > 0) {
        const trackIds = topTrackStreaks.map((item) => item.id);

        const tracksInfo = await db
            .select({
                id: tracks.id,
                name: tracks.name,
                imageUrl: albums.imageUrl,
            })
            .from(tracks)
            .leftJoin(albums, eq(tracks.albumId, albums.id))
            .where(
                trackIds.length > 0 ? inArray(tracks.id, trackIds) : undefined,
            );

        for (const streak of topTrackStreaks) {
            const track = tracksInfo.find((t) => t.id === streak.id);
            if (track && streak.streak > 0) {
                streakItems.push({
                    id: streak.id,
                    name: track.name,
                    imageUrl: track.imageUrl ?? "",
                    streak: streak.streak,
                });
            }
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[70%]">Track</TableHead>
                    <TableHead className="w-[30%]">Streak</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {streakItems.length > 0 ? (
                    streakItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex h-10 items-center gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:xs:gap-4 sm:h-12 sm:gap-2"
                                    href={`https://open.spotify.com/track/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-10 w-10 xs:h-12 xs:w-12"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 bg-muted xs:h-12 xs:w-12"></div>
                                    )}
                                    <span className="line-clamp-2 text-xs xs:line-clamp-none sm:text-sm">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm">
                                        {item.streak} days
                                    </span>
                                </div>
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

    // We only need recent history for current streak calculation
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 100); // 100 days is enough for streaks

    // Album-level streaks: fetch albumId per play with optimized query
    const albumPlays = await db
        .select({
            albumId: tracks.albumId,
            date: sql<string>`DATE(${listeningHistory.playedAt})`, // Get just the date part
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .where(
            and(
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.playedAt, startDate), // Only fetch recent history
            ),
        )
        .groupBy(tracks.albumId, sql`DATE(${listeningHistory.playedAt})`); // Get distinct dates per album

    const albumDates = new Map<string, Set<string>>();
    albumPlays.forEach(({ albumId, date }) => {
        if (!albumId) return;
        if (!albumDates.has(albumId)) albumDates.set(albumId, new Set());
        albumDates.get(albumId)!.add(date);
    });

    const topAlbumStreaks = findTopStreaks(albumDates, limit);

    // Fetch metadata for top streak albums
    const streakItems: StreakItem[] = [];

    if (topAlbumStreaks.length > 0) {
        const albumIds = topAlbumStreaks.map((item) => item.id);

        const albumsInfo = await db
            .select({
                id: albums.id,
                name: albums.name,
                imageUrl: albums.imageUrl,
            })
            .from(albums)
            .where(
                albumIds.length > 0 ? inArray(albums.id, albumIds) : undefined,
            );

        for (const streak of topAlbumStreaks) {
            const album = albumsInfo.find((a) => a.id === streak.id);
            if (album && streak.streak > 0) {
                streakItems.push({
                    id: streak.id,
                    name: album.name,
                    imageUrl: album.imageUrl ?? "",
                    streak: streak.streak,
                });
            }
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[70%]">Album</TableHead>
                    <TableHead className="w-[30%]">Streak</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {streakItems.length > 0 ? (
                    streakItems.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex h-10 items-center gap-1 text-wrap underline-offset-4 hover:underline xs:gap-3 sm:xs:gap-4 sm:h-12 sm:gap-2"
                                    href={`https://open.spotify.com/album/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-10 w-10 xs:h-12 xs:w-12"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 bg-muted xs:h-12 xs:w-12"></div>
                                    )}
                                    <span className="line-clamp-2 text-xs xs:line-clamp-none sm:text-sm">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Flame className="h-3 w-3 text-orange-500 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm">
                                        {item.streak} days
                                    </span>
                                </div>
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

    // We only need to get dates for the last ~100 days to calculate current streak
    // This is much more efficient than fetching all history
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 100); // 100 days should be enough for any reasonable streak

    // Get distinct dates with activity in the last 100 days
    const recentListens = await db
        .select({
            date: sql<string>`DATE(${listeningHistory.playedAt})`, // Get just the date part
        })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.playedAt, startDate),
            ),
        )
        .groupBy(sql`DATE(${listeningHistory.playedAt})`); // Get distinct dates

    // Convert to a set of date strings
    const dates = new Set<string>();
    recentListens.forEach(({ date }) => {
        dates.add(date);
    });

    // Compute the overall listening streak
    const streak = computeStreak(dates, true);

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
