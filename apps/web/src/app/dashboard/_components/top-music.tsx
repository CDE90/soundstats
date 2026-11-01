import "server-only";
import {
    MusicCollection,
    MusicCollectionSkeleton,
} from "@/components/music-collection";
import { db as defaultDatabase } from "@/server/db";
import type { ReportingDatabase } from "@/server/reporting-database";
import {
    topArtistsQuery,
    topTracksQuery,
    topAlbumsQuery,
} from "@/server/dashboard-music-queries";
import {
    calculateComparisons,
    type DateRange,
    getPrevDateRange,
    getTimeFilters,
} from "@/server/lib";

export function TopMusicSkeleton({ limit }: Readonly<{ limit: number }>) {
    return <MusicCollectionSkeleton count={limit} />;
}

export async function TopArtists({
    database = defaultDatabase,
    userId,
    dateRange,
    limit,
}: Readonly<{
    database?: ReportingDatabase;
    userId: string;
    dateRange: DateRange;
    limit: number;
}>) {
    const timeFilters = getTimeFilters(dateRange);
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    const topArtists = await topArtistsQuery(
        database,
        userId,
        timeFilters,
        limit,
    );
    const prevTopArtists = await topArtistsQuery(
        database,
        userId,
        prevTimeFilters,
        limit * 2,
    );

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
    database = defaultDatabase,
    userId,
    dateRange,
    limit,
}: Readonly<{
    database?: ReportingDatabase;
    userId: string;
    dateRange: DateRange;
    limit: number;
}>) {
    const timeFilters = getTimeFilters(dateRange);
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    const topTracks = await topTracksQuery(
        database,
        userId,
        timeFilters,
        limit,
        true,
    );
    const prevTopTracks = await topTracksQuery(
        database,
        userId,
        prevTimeFilters,
        limit * 2,
        false,
    );

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
    database = defaultDatabase,
    userId,
    dateRange,
    limit,
}: Readonly<{
    database?: ReportingDatabase;
    userId: string;
    dateRange: DateRange;
    limit: number;
}>) {
    const timeFilters = getTimeFilters(dateRange);
    const prevDateRange = getPrevDateRange(dateRange);
    const prevTimeFilters = getTimeFilters(prevDateRange);

    const topAlbums = await topAlbumsQuery(
        database,
        userId,
        timeFilters,
        limit,
    );
    const prevTopAlbums = await topAlbumsQuery(
        database,
        userId,
        prevTimeFilters,
        limit * 2,
    );

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
