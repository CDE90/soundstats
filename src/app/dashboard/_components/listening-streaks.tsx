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
import { db } from "@/server/db";
import {
    albums,
    artists,
    artistTracks,
    listeningHistory,
    tracks,
} from "@/server/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { Flame } from "lucide-react";
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
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-12 w-12 rounded" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-4 w-16" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// Helper to compute consecutive-day streak ending at most recent play date
const computeStreak = (dates: Set<string>): number => {
    if (dates.size === 0) return 0;
    // find latest date
    const current = Array.from(dates)
        .map((d) => new Date(d))
        .reduce((a, b) => (a > b ? a : b));
    let streak = 0;
    while (true) {
        const iso = current.toISOString().slice(0, 10);
        if (dates.has(iso)) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
};

/**
 * Helper function to find top streaks for a given set of dates
 */
function findTopStreaks(
    itemDates: Map<string, Set<string>>,
    limit = 3,
): { id: string; streak: number }[] {
    const streaks: { id: string; streak: number }[] = [];

    itemDates.forEach((dates, id) => {
        const s = computeStreak(dates);
        streaks.push({ id, streak: s });
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

    // Artist-level streaks: fetch artistId per play
    const artistPlays = await db
        .select({
            artistId: artistTracks.artistId,
            playedAt: listeningHistory.playedAt,
        })
        .from(listeningHistory)
        .innerJoin(
            artistTracks,
            eq(listeningHistory.trackId, artistTracks.trackId),
        )
        .where(eq(listeningHistory.userId, userId))
        .orderBy(asc(listeningHistory.playedAt));

    const artistDates = new Map<string, Set<string>>();
    artistPlays.forEach(({ artistId, playedAt }) => {
        const date = playedAt.toISOString().slice(0, 10);
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
                    streakItems.map((item, index) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex h-12 items-center gap-2 text-wrap underline-offset-4 hover:underline xs:gap-4"
                                    href={`https://open.spotify.com/artist/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-12 w-12 rounded"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded bg-muted"></div>
                                    )}
                                    <span className="line-clamp-2 xs:line-clamp-none">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    <span>{item.streak} days</span>
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

    // Fetch listening history for track-level streaks
    const trackPlays = await db
        .select({
            trackId: listeningHistory.trackId,
            playedAt: listeningHistory.playedAt,
        })
        .from(listeningHistory)
        .where(eq(listeningHistory.userId, userId))
        .orderBy(asc(listeningHistory.playedAt));

    // Group unique dates per track
    const trackDates = new Map<string, Set<string>>();
    trackPlays.forEach(({ trackId, playedAt }) => {
        const date = playedAt.toISOString().slice(0, 10);
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
                    streakItems.map((item, index) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex h-12 items-center gap-2 text-wrap underline-offset-4 hover:underline xs:gap-4"
                                    href={`https://open.spotify.com/track/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-12 w-12 rounded"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded bg-muted"></div>
                                    )}
                                    <span className="line-clamp-2 xs:line-clamp-none">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    <span>{item.streak} days</span>
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

    // Album-level streaks: fetch albumId per play
    const albumPlays = await db
        .select({
            albumId: tracks.albumId,
            playedAt: listeningHistory.playedAt,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .where(eq(listeningHistory.userId, userId))
        .orderBy(asc(listeningHistory.playedAt));

    const albumDates = new Map<string, Set<string>>();
    albumPlays.forEach(({ albumId, playedAt }) => {
        if (!albumId) return;
        const date = playedAt.toISOString().slice(0, 10);
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
                    streakItems.map((item, index) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Link
                                    className="flex h-12 items-center gap-2 text-wrap underline-offset-4 hover:underline xs:gap-4"
                                    href={`https://open.spotify.com/album/${item.id}`}
                                    target="_blank"
                                >
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.name}
                                            width={48}
                                            height={48}
                                            className="h-12 w-12 rounded"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded bg-muted"></div>
                                    )}
                                    <span className="line-clamp-2 xs:line-clamp-none">
                                        {item.name}
                                    </span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    <span>{item.streak} days</span>
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

    // Fetch all listening history to compute daily streak
    const listens = await db
        .select({
            playedAt: listeningHistory.playedAt,
        })
        .from(listeningHistory)
        .where(eq(listeningHistory.userId, userId))
        .orderBy(asc(listeningHistory.playedAt));

    // Group all dates to find consecutive days of listening
    const dates = new Set<string>();
    listens.forEach(({ playedAt }) => {
        const date = playedAt.toISOString().slice(0, 10);
        dates.add(date);
    });

    // Compute the overall listening streak
    const streak = computeStreak(dates);

    return (
        <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
                <div className="text-xl font-bold">{streak}</div>
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
        <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
                <Skeleton className="mb-1 h-5 w-14" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );
}
