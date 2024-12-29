import "server-only";

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
import { type DateRange, getTimeFilters } from "@/server/lib";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

export function SkeletonTopTable({ limit }: Readonly<{ limit: number }>) {
    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead>
                        <Skeleton className="my-1 h-8 w-16 rounded-lg" />
                    </TableHead>
                    <TableHead>
                        <Skeleton className="my-1 h-8 w-52 rounded-lg" />
                    </TableHead>
                    <TableHead>
                        <Skeleton className="my-1 h-8 w-16 rounded-lg" />
                    </TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: limit }, (_, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            <Skeleton className="h-6 w-12 rounded-lg" />
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <Skeleton className="h-6 w-32 rounded-lg" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <Skeleton className="h-6 w-12 rounded-lg" />
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

    const topArtists = await db
        .select({
            count: sql<number>`count(*)`,
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
            desc(sql`count(*)`),
            desc(sql`sum(${listeningHistory.progressMs})`),
            asc(artists.name),
        )
        .limit(limit);

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Count</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {topArtists.map((artist, index) => (
                    <TableRow key={artist.artistId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                            <Link
                                className="flex h-12 items-center gap-4 text-wrap underline-offset-4 hover:underline"
                                href={`https://open.spotify.com/artist/${artist.artistId}`}
                                target="_blank"
                            >
                                {artist.imageUrl ? (
                                    <Image
                                        src={artist.imageUrl}
                                        alt={artist.artist}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12"
                                    />
                                ) : null}
                                {artist.artist}
                            </Link>
                        </TableCell>
                        <TableCell>{artist.count}</TableCell>
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

    const topTracks = await db
        .select({
            count: sql<number>`count(*)`,
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
            desc(sql`count(*)`),
            desc(sql`sum(${listeningHistory.progressMs})`),
            asc(tracks.name),
        )
        .limit(limit);

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Count</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {topTracks.map((track, index) => (
                    <TableRow key={track.trackId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                            <Link
                                className="flex items-center gap-4 text-wrap underline-offset-4 hover:underline"
                                href={`https://open.spotify.com/track/${track.trackId}`}
                                target="_blank"
                            >
                                {track.imageUrl ? (
                                    <Image
                                        src={track.imageUrl}
                                        alt={track.track}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12"
                                    />
                                ) : null}
                                {track.track}
                            </Link>
                        </TableCell>
                        <TableCell>{track.count}</TableCell>
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

    const topAlbums = await db
        .select({
            count: sql<number>`count(*)`,
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
            desc(sql`count(*)`),
            desc(sql`sum(${listeningHistory.progressMs})`),
            asc(albums.name),
        )
        .limit(limit);

    return (
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Album</TableHead>
                    <TableHead>Count</TableHead>
                </TableHeadRow>
            </TableHeader>
            <TableBody>
                {topAlbums.map((album, index) => (
                    <TableRow key={album.albumId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                            <Link
                                className="flex h-12 items-center gap-4 text-wrap underline-offset-4 hover:underline"
                                href={`https://open.spotify.com/album/${album.albumId}`}
                                target="_blank"
                            >
                                {album.imageUrl ? (
                                    <Image
                                        src={album.imageUrl}
                                        alt={album.album}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12"
                                    />
                                ) : null}
                                {album.album}
                            </Link>
                        </TableCell>
                        <TableCell>{album.count}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
