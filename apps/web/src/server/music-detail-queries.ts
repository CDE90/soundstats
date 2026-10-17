import * as schema from "@soundstats/database";
import { and, asc, count, desc, eq, exists, gte, lte, sql } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { MusicDetailContext, MusicEntityType } from "../lib/music-details";

type Database = PostgresJsDatabase<typeof schema>;
const {
    artists,
    artistTracks,
    artistAlbums,
    tracks,
    albums,
    listeningHistory,
} = schema;

export async function getMusicEntity(
    db: Database,
    type: MusicEntityType,
    id: string,
) {
    if (type === "artist") {
        const [artist] = await db
            .select()
            .from(artists)
            .where(eq(artists.id, id))
            .limit(1);
        return artist
            ? { ...artist, album: null, albumId: null, artists: [] }
            : null;
    }

    if (type === "album") {
        const [album] = await db
            .select({
                id: albums.id,
                name: albums.name,
                imageUrl: albums.imageUrl,
            })
            .from(albums)
            .where(eq(albums.id, id))
            .limit(1);
        if (!album) return null;
        const albumArtists = await db
            .select({ id: artists.id, name: artists.name })
            .from(artistAlbums)
            .innerJoin(artists, eq(artistAlbums.artistId, artists.id))
            .where(eq(artistAlbums.albumId, id))
            .orderBy(asc(artists.name));
        return { ...album, album: null, albumId: null, artists: albumArtists };
    }

    const [track] = await db
        .select({
            id: tracks.id,
            name: tracks.name,
            imageUrl: albums.imageUrl,
            album: albums.name,
            albumId: tracks.albumId,
        })
        .from(tracks)
        .leftJoin(albums, eq(tracks.albumId, albums.id))
        .where(eq(tracks.id, id))
        .limit(1);
    if (!track) return null;

    const trackArtists = await db
        .select({ id: artists.id, name: artists.name })
        .from(artistTracks)
        .innerJoin(artists, eq(artistTracks.artistId, artists.id))
        .where(eq(artistTracks.trackId, id))
        .orderBy(desc(artistTracks.isPrimaryArtist), asc(artists.name));
    return { ...track, artists: trackArtists };
}

export async function getMusicDetailStats(
    db: Database,
    type: MusicEntityType,
    id: string,
    { userId, dateRange }: MusicDetailContext,
) {
    // EXISTS counts each play once, including tracks with several credited artists.
    const entityFilter =
        type === "track"
            ? eq(listeningHistory.trackId, id)
            : type === "album"
              ? exists(
                    db
                        .select({ id: tracks.id })
                        .from(tracks)
                        .where(
                            and(
                                eq(tracks.id, listeningHistory.trackId),
                                eq(tracks.albumId, id),
                            ),
                        ),
                )
              : exists(
                    db
                        .select({ id: artistTracks.trackId })
                        .from(artistTracks)
                        .where(
                            and(
                                eq(
                                    artistTracks.trackId,
                                    listeningHistory.trackId,
                                ),
                                eq(artistTracks.artistId, id),
                            ),
                        ),
                );
    const lifetimeFilter = and(
        eq(listeningHistory.userId, userId),
        gte(listeningHistory.progressMs, 30_000),
        entityFilter,
    );
    const periodFilter = and(
        lifetimeFilter,
        gte(listeningHistory.playedAt, dateRange.from),
        lte(listeningHistory.playedAt, dateRange.to),
    );
    const monthly =
        dateRange.to.getTime() - dateRange.from.getTime() > 366 * 86_400_000;
    const bucket = monthly ? sql`'month'` : sql`'day'`;
    const step = monthly ? sql`'1 month'::interval` : sql`'1 day'::interval`;
    const bucketDate = sql`date_trunc(${bucket}, ${listeningHistory.playedAt} AT TIME ZONE 'UTC')`;
    const activity = db.$with("activity").as(
        db
            .select({
                date: bucketDate.as("date"),
                playtime:
                    sql<number>`sum(${listeningHistory.progressMs}) / 1000.0`
                        .mapWith(Number)
                        .as("playtime"),
            })
            .from(listeningHistory)
            .where(periodFilter)
            .groupBy(bucketDate),
    );

    const [summaryRows, lifetimeRows, dailyPlaytime, recentPlays, topTracks] =
        await Promise.all([
            db
                .select({
                    plays: count(),
                    minutes:
                        sql<number>`coalesce(sum(${listeningHistory.progressMs}), 0) / 60000.0`.mapWith(
                            Number,
                        ),
                    uniqueTracks:
                        sql<number>`count(distinct ${listeningHistory.trackId})`.mapWith(
                            Number,
                        ),
                    listeningDays:
                        sql<number>`count(distinct (${listeningHistory.playedAt} AT TIME ZONE 'UTC')::date)`.mapWith(
                            Number,
                        ),
                })
                .from(listeningHistory)
                .where(periodFilter),
            db
                .select({
                    firstPlayedAt:
                        sql<Date | null>`min(${listeningHistory.playedAt})`.mapWith(
                            listeningHistory.playedAt,
                        ),
                    lastPlayedAt:
                        sql<Date | null>`max(${listeningHistory.playedAt})`.mapWith(
                            listeningHistory.playedAt,
                        ),
                })
                .from(listeningHistory)
                .where(lifetimeFilter),
            db
                .with(activity)
                .select({
                    date: sql<string>`to_char(series.day, 'YYYY-MM-DD')`,
                    playtime:
                        sql<number>`coalesce(${activity.playtime}, 0)`.mapWith(
                            Number,
                        ),
                })
                .from(
                    sql`generate_series(date_trunc(${bucket}, ${dateRange.from.toISOString()}::timestamptz AT TIME ZONE 'UTC'), date_trunc(${bucket}, ${dateRange.to.toISOString()}::timestamptz AT TIME ZONE 'UTC'), ${step}) AS series(day)`,
                )
                .leftJoin(activity, sql`${activity.date} = series.day`)
                .orderBy(sql`series.day`),
            db
                .select({
                    id: sql<string>`${listeningHistory.id}::text`,
                    trackId: tracks.id,
                    name: tracks.name,
                    playedAt: listeningHistory.playedAt,
                    progressMs: listeningHistory.progressMs,
                })
                .from(listeningHistory)
                .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
                .where(periodFilter)
                .orderBy(
                    desc(listeningHistory.playedAt),
                    desc(listeningHistory.id),
                )
                .limit(25),
            type !== "track"
                ? db
                      .select({
                          id: tracks.id,
                          name: tracks.name,
                          plays: count(),
                          minutes:
                              sql<number>`sum(${listeningHistory.progressMs}) / 60000.0`.mapWith(
                                  Number,
                              ),
                      })
                      .from(listeningHistory)
                      .innerJoin(
                          tracks,
                          eq(listeningHistory.trackId, tracks.id),
                      )
                      .where(periodFilter)
                      .groupBy(tracks.id)
                      .orderBy(
                          desc(count()),
                          desc(sql`sum(${listeningHistory.progressMs})`),
                          asc(tracks.name),
                          asc(tracks.id),
                      )
                      .limit(10)
                : Promise.resolve([]),
        ]);

    return {
        summary: summaryRows[0]!,
        lifetime: lifetimeRows[0]!,
        dailyPlaytime,
        monthly,
        recentPlays,
        topTracks,
    };
}
