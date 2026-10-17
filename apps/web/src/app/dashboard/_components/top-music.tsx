import "server-only";
import {
    MusicCollection,
    MusicCollectionSkeleton,
} from "@/components/music-collection";
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
    getTimeFilters,
} from "@/server/lib";
import { and, asc, count, desc, eq, gte, sum } from "drizzle-orm";

export function TopMusicSkeleton({ limit }: Readonly<{ limit: number }>) {
    return <MusicCollectionSkeleton count={limit} />;
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
        <MusicCollection
            label="Top artists"
            context={{ userId, dateRange }}
            emptyMessage="No artists in this period."
            items={artistComparisons.map((item, index) => ({
                id: item.artistId,
                type: "artist",
                name: item.artist,
                imageUrl: item.imageUrl,
                rank: index + 1,
                plays: item.count,
                rankChange: item.rankChange,
                previousRank: item.previousRank,
                percentChange: item.percentChange,
            }))}
        />
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
        <MusicCollection
            label="Top tracks"
            context={{ userId, dateRange }}
            emptyMessage="No tracks in this period."
            items={trackComparisons.map((item, index) => ({
                id: item.trackId,
                type: "track",
                name: item.track,
                imageUrl: item.imageUrl,
                rank: index + 1,
                plays: item.count,
                rankChange: item.rankChange,
                previousRank: item.previousRank,
                percentChange: item.percentChange,
            }))}
        />
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
        <MusicCollection
            label="Top albums"
            context={{ userId, dateRange }}
            emptyMessage="No albums in this period."
            items={albumComparisons.map((item, index) => ({
                id: item.albumId,
                type: "album",
                name: item.album,
                imageUrl: item.imageUrl,
                rank: index + 1,
                plays: item.count,
                rankChange: item.rankChange,
                previousRank: item.previousRank,
                percentChange: item.percentChange,
            }))}
        />
    );
}
