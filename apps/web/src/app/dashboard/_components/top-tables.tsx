import "server-only";

import { PercentageBadge } from "@/components/percentage-badge";
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/server/db";
import {
    albums,
    artists,
    artistTracks,
    listeningHistory,
    tracks,
} from "@/server/db/schema";
import {
    calculateComparisons,
    type DateRange,
    getPrevDateRange,
    getRankChangeTooltip,
    getTimeFilters,
} from "@/server/lib";
import { and, asc, count, desc, eq, gte, sum } from "drizzle-orm";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { MusicItem } from "./music-item";

export function SkeletonTopTable({ limit }: Readonly<{ limit: number }>) {
    return (
        <Table className="ss-data-table ss-ranking-table">
            <TableHeader>
                <TableHeadRow>
                    <TableHead>
                        <Skeleton className="my-1 h-6 w-12 rounded-lg sm:h-8 sm:w-16" />
                    </TableHead>
                    <TableHead>
                        <Skeleton className="my-1 h-6 w-28 rounded-lg sm:h-8 sm:w-52" />
                    </TableHead>
                    <TableHead>
                        <Skeleton className="my-1 h-6 w-12 rounded-lg sm:h-8 sm:w-16" />
                    </TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: limit }, (_, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <Skeleton className="h-5 w-8 rounded-lg sm:h-6 sm:w-12" />
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 sm:gap-4">
                                <Skeleton className="h-9 w-9 rounded-lg sm:h-12 sm:w-12" />
                                <Skeleton className="h-5 w-20 rounded-lg sm:h-6 sm:w-32" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-5 w-8 rounded-lg sm:h-6 sm:w-12" />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export async function TopArtists({
    userId,
    dateRange,
    limit,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
    limit: number;
}>) {
    "use cache";

    const timeFilters = getTimeFilters(dateRange);
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    // Current period top artists
    const topArtists = await db
        .select({
            count: count(),
            artist: artists.name,
            imageUrl: artists.imageUrl,
            artistId: artists.id,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .innerJoin(artistTracks, eq(tracks.id, artistTracks.trackId))
        .innerJoin(artists, eq(artistTracks.artistId, artists.id))
        .where(
            and(
                timeFilters,
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.progressMs, 30 * 1000),
                eq(artistTracks.isPrimaryArtist, true),
            ),
        )
        .groupBy(artists.id)
        .orderBy(
            desc(count()),
            desc(sum(listeningHistory.progressMs)),
            asc(artists.name),
        )
        .limit(limit);

    // Previous period top artists
    const prevTopArtists = await db
        .select({
            count: count(),
            artist: artists.name,
            artistId: artists.id,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .innerJoin(artistTracks, eq(tracks.id, artistTracks.trackId))
        .innerJoin(artists, eq(artistTracks.artistId, artists.id))
        .where(
            and(
                prevTimeFilters,
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.progressMs, 30 * 1000),
                eq(artistTracks.isPrimaryArtist, true),
            ),
        )
        .groupBy(artists.id)
        .orderBy(
            desc(count()),
            desc(sum(listeningHistory.progressMs)),
            asc(artists.name),
        )
        .limit(limit * 2);

    // Calculate rank and count changes
    const artistComparisons = calculateComparisons(
        topArtists,
        prevTopArtists,
        "artistId",
        "count",
    );

    return (
        <Table className="ss-data-table ss-ranking-table">
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[20%] xs:w-[15%]">Rank</TableHead>
                    <TableHead className="w-[50%] xs:w-[60%]">
                        <div className="flex items-center gap-1">
                            <span>Artist</span>
                        </div>
                    </TableHead>
                    <TableHead className="w-[30%] xs:w-[25%]">Plays</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {artistComparisons.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="ss-ranking-empty">
                            No artists in this period. Try a different date
                            range.
                        </TableCell>
                    </TableRow>
                )}
                {artistComparisons.map((artist, index) => (
                    <TableRow key={artist.artistId}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {index + 1}
                                {artist.rankChange !== null && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                {artist.rankChange > 0 ? (
                                                    <ArrowUp className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                                                ) : artist.rankChange < 0 ? (
                                                    <ArrowDown className="h-3 w-3 text-red-600 sm:h-4 sm:w-4" />
                                                ) : (
                                                    <Minus className="h-3 w-3 text-gray-500 sm:h-4 sm:w-4" />
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {getRankChangeTooltip(
                                                    artist.rankChange,
                                                    artist.previousRank,
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <MusicItem
                                type="artist"
                                id={artist.artistId}
                                name={artist.artist}
                                imageUrl={artist.imageUrl}
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
                                <span className="text-xs sm:text-sm">
                                    {artist.count}
                                </span>
                                <PercentageBadge
                                    percentChange={artist.percentChange}
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export async function TopTracks({
    userId,
    dateRange,
    limit,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
    limit: number;
}>) {
    "use cache";

    const timeFilters = getTimeFilters(dateRange);
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    // Current period top tracks
    const topTracks = await db
        .select({
            count: count(),
            track: tracks.name,
            imageUrl: albums.imageUrl,
            trackId: tracks.id,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .where(
            and(
                timeFilters,
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        )
        .groupBy(tracks.id, albums.imageUrl)
        .orderBy(
            desc(count()),
            desc(sum(listeningHistory.progressMs)),
            asc(tracks.name),
        )
        .limit(limit);

    // Previous period top tracks
    const prevTopTracks = await db
        .select({
            count: count(),
            track: tracks.name,
            trackId: tracks.id,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .where(
            and(
                prevTimeFilters,
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        )
        .groupBy(tracks.id)
        .orderBy(
            desc(count()),
            desc(sum(listeningHistory.progressMs)),
            asc(tracks.name),
        )
        .limit(limit * 2);

    // Calculate rank and count changes
    const trackComparisons = calculateComparisons(
        topTracks,
        prevTopTracks,
        "trackId",
        "count",
    );

    return (
        <Table className="ss-data-table ss-ranking-table">
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[20%] xs:w-[15%]">Rank</TableHead>
                    <TableHead className="w-[50%] xs:w-[60%]">
                        <div className="flex items-center gap-1">
                            <span>Track</span>
                        </div>
                    </TableHead>
                    <TableHead className="w-[30%] xs:w-[25%]">Plays</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {trackComparisons.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="ss-ranking-empty">
                            No tracks in this period. Try a different date
                            range.
                        </TableCell>
                    </TableRow>
                )}
                {trackComparisons.map((track, index) => (
                    <TableRow key={track.trackId}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {index + 1}
                                {track.rankChange !== null && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                {track.rankChange > 0 ? (
                                                    <ArrowUp className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                                                ) : track.rankChange < 0 ? (
                                                    <ArrowDown className="h-3 w-3 text-red-600 sm:h-4 sm:w-4" />
                                                ) : (
                                                    <Minus className="h-3 w-3 text-gray-500 sm:h-4 sm:w-4" />
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {getRankChangeTooltip(
                                                    track.rankChange,
                                                    track.previousRank,
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <MusicItem
                                type="track"
                                id={track.trackId}
                                name={track.track}
                                imageUrl={track.imageUrl}
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
                                <span className="text-xs sm:text-sm">
                                    {track.count}
                                </span>
                                <PercentageBadge
                                    percentChange={track.percentChange}
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export async function TopAlbums({
    userId,
    dateRange,
    limit,
}: Readonly<{
    userId: string;
    dateRange: DateRange;
    limit: number;
}>) {
    "use cache";

    const timeFilters = getTimeFilters(dateRange);
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    // Current period top albums
    const topAlbums = await db
        .select({
            count: count(),
            album: albums.name,
            imageUrl: albums.imageUrl,
            albumId: albums.id,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .where(
            and(
                timeFilters,
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        )
        .groupBy(albums.id, albums.imageUrl)
        .orderBy(
            desc(count()),
            desc(sum(listeningHistory.progressMs)),
            asc(albums.name),
        )
        .limit(limit);

    // Previous period top albums
    const prevTopAlbums = await db
        .select({
            count: count(),
            album: albums.name,
            albumId: albums.id,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .where(
            and(
                prevTimeFilters,
                eq(listeningHistory.userId, userId),
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        )
        .groupBy(albums.id)
        .orderBy(
            desc(count()),
            desc(sum(listeningHistory.progressMs)),
            asc(albums.name),
        )
        .limit(limit * 2);

    // Calculate rank and count changes
    const albumComparisons = calculateComparisons(
        topAlbums,
        prevTopAlbums,
        "albumId",
        "count",
    );

    return (
        <Table className="ss-data-table ss-ranking-table">
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[20%] xs:w-[15%]">Rank</TableHead>
                    <TableHead className="w-[50%] xs:w-[60%]">
                        <div className="flex items-center gap-1">
                            <span>Album</span>
                        </div>
                    </TableHead>
                    <TableHead className="w-[30%] xs:w-[25%]">Plays</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {albumComparisons.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="ss-ranking-empty">
                            No albums in this period. Try a different date
                            range.
                        </TableCell>
                    </TableRow>
                )}
                {albumComparisons.map((album, index) => (
                    <TableRow key={album.albumId}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {index + 1}
                                {album.rankChange !== null && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                {album.rankChange > 0 ? (
                                                    <ArrowUp className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                                                ) : album.rankChange < 0 ? (
                                                    <ArrowDown className="h-3 w-3 text-red-600 sm:h-4 sm:w-4" />
                                                ) : (
                                                    <Minus className="h-3 w-3 text-gray-500 sm:h-4 sm:w-4" />
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {getRankChangeTooltip(
                                                    album.rankChange,
                                                    album.previousRank,
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <MusicItem
                                type="album"
                                id={album.albumId}
                                name={album.album}
                                imageUrl={album.imageUrl}
                                userId={userId}
                                dateRange={dateRange}
                            />
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
                                <span className="text-xs sm:text-sm">
                                    {album.count}
                                </span>
                                <PercentageBadge
                                    percentChange={album.percentChange}
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
