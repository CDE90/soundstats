import {
    albums,
    artists,
    artistTracks,
    listeningHistory,
    tracks,
} from "@soundstats/database";
import {
    and,
    asc,
    count,
    desc,
    eq,
    gte,
    isNotNull,
    sql,
    sum,
    type SQL,
} from "drizzle-orm";
import type { ReportingDatabase } from "./reporting-database";

// Drizzle 0.45 omits numeric offset(0) as falsy. Its SQL renderer accepts
// an SQL fragment here, so retain the literal PostgreSQL optimizer barrier.
const lookupOffset = sql`0` as unknown as number;

/** Reduce repeated plays before looking up anything in the much larger catalogue. */
function qualifyingTracks(
    database: ReportingDatabase,
    userId: string,
    filters: SQL | undefined,
) {
    return database
        .select({
            trackId: listeningHistory.trackId,
            plays: count().as("plays"),
            duration: sum(listeningHistory.progressMs).as("duration"),
        })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                filters,
                gte(listeningHistory.progressMs, 30_000),
            ),
        )
        .groupBy(listeningHistory.trackId)
        .as("track_listens");
}

/** Count grouped IDs so PostgreSQL can hash once rather than sort every play. */
export function totalTracksQuery(
    database: ReportingDatabase,
    userId: string,
    filters: SQL | undefined,
) {
    return database
        .select({ countTracks: count() })
        .from(qualifyingTracks(database, userId, filters));
}

export function totalArtistsQuery(
    database: ReportingDatabase,
    userId: string,
    filters: SQL | undefined,
) {
    const listens = qualifyingTracks(database, userId, filters);
    // OFFSET 0 is intentional: keep these lookups correlated so PostgreSQL cannot
    // flatten them into a hash/scan of every artist-track relationship.
    const credits = database
        .select({ artistId: artistTracks.artistId })
        .from(artistTracks)
        .where(eq(artistTracks.trackId, listens.trackId))
        .offset(lookupOffset)
        .as("credits");
    return database
        .select({
            countArtists:
                sql<number>`count(distinct ${credits.artistId})`.mapWith(
                    Number,
                ),
        })
        .from(listens)
        .innerJoinLateral(credits, sql`true`);
}

export function topArtistsQuery(
    database: ReportingDatabase,
    userId: string,
    filters: SQL | undefined,
    limit: number,
) {
    const listens = qualifyingTracks(database, userId, filters);
    const credits = database
        .select({ artistId: artistTracks.artistId })
        .from(artistTracks)
        .where(
            and(
                eq(artistTracks.trackId, listens.trackId),
                eq(artistTracks.isPrimaryArtist, true),
            ),
        )
        .offset(lookupOffset)
        .as("credits");
    const totals = database
        .select({
            artistId: credits.artistId,
            plays: sql<number>`sum(${listens.plays})`
                .mapWith(Number)
                .as("plays"),
            duration: sql`sum(${listens.duration})`.as("duration"),
        })
        .from(listens)
        .innerJoinLateral(credits, sql`true`)
        .groupBy(credits.artistId)
        .as("artist_totals");
    const metadata = database
        .select({
            id: artists.id,
            name: artists.name,
            imageUrl: artists.imageUrl,
        })
        .from(artists)
        .where(eq(artists.id, totals.artistId))
        .offset(lookupOffset)
        .as("metadata");
    return database
        .select({
            count: totals.plays,
            artist: metadata.name,
            imageUrl: metadata.imageUrl,
            artistId: totals.artistId,
        })
        .from(totals)
        .innerJoinLateral(metadata, sql`true`)
        .orderBy(desc(totals.plays), desc(totals.duration), asc(metadata.name))
        .limit(limit);
}

export function topTracksQuery(
    database: ReportingDatabase,
    userId: string,
    filters: SQL | undefined,
    limit: number,
    requireAlbum: boolean,
) {
    const listens = qualifyingTracks(database, userId, filters);
    const metadata = database
        .select({ id: tracks.id, name: tracks.name, albumId: tracks.albumId })
        .from(tracks)
        .where(eq(tracks.id, listens.trackId))
        .offset(lookupOffset)
        .as("metadata");
    const artwork = database
        .select({ id: albums.id, imageUrl: albums.imageUrl })
        .from(albums)
        .where(eq(albums.id, metadata.albumId))
        .offset(lookupOffset)
        .as("artwork");
    return (
        database
            .select({
                count: listens.plays,
                track: metadata.name,
                imageUrl: artwork.imageUrl,
                trackId: listens.trackId,
            })
            .from(listens)
            .innerJoinLateral(metadata, sql`true`)
            .leftJoinLateral(artwork, sql`true`)
            // Current cards require an album; previous ranks historically include
            // album-less tracks. Preserve that distinction for comparisons.
            .where(requireAlbum ? isNotNull(artwork.id) : undefined)
            .orderBy(
                desc(listens.plays),
                desc(listens.duration),
                asc(metadata.name),
            )
            .limit(limit)
    );
}

export function topAlbumsQuery(
    database: ReportingDatabase,
    userId: string,
    filters: SQL | undefined,
    limit: number,
) {
    const listens = qualifyingTracks(database, userId, filters);
    const metadata = database
        .select({ albumId: tracks.albumId })
        .from(tracks)
        .where(eq(tracks.id, listens.trackId))
        .offset(lookupOffset)
        .as("metadata");
    const totals = database
        .select({
            albumId: metadata.albumId,
            plays: sql<number>`sum(${listens.plays})`
                .mapWith(Number)
                .as("plays"),
            duration: sql`sum(${listens.duration})`.as("duration"),
        })
        .from(listens)
        .innerJoinLateral(metadata, sql`true`)
        .groupBy(metadata.albumId)
        .as("album_totals");
    const album = database
        .select({ id: albums.id, name: albums.name, imageUrl: albums.imageUrl })
        .from(albums)
        .where(eq(albums.id, totals.albumId))
        .offset(lookupOffset)
        .as("album_metadata");
    return database
        .select({
            count: totals.plays,
            album: album.name,
            imageUrl: album.imageUrl,
            albumId: album.id,
        })
        .from(totals)
        .innerJoinLateral(album, sql`true`)
        .orderBy(desc(totals.plays), desc(totals.duration), asc(album.name))
        .limit(limit);
}
