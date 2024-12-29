import "server-only";

import { db } from "@/server/db";
import { artistTracks, listeningHistory } from "@/server/db/schema";
import { and, eq, gte, sql, type SQL } from "drizzle-orm";

export async function TotalMinutes({
    userId,
    timeFilters,
}: Readonly<{
    userId: string;
    timeFilters: SQL<unknown> | undefined;
}>) {
    const totalProgressMs = await db
        .select({
            duration: sql<number>`sum(${listeningHistory.progressMs})`,
        })
        .from(listeningHistory)
        .where(and(eq(listeningHistory.userId, userId), timeFilters));

    let totalMinutes = 0;
    if (totalProgressMs) {
        totalMinutes = totalProgressMs[0]!.duration / 60000;
    }

    return (
        <p className="text-lg font-semibold">
            {Math.round(totalMinutes).toLocaleString()}
        </p>
    );
}

export async function TotalArtists({
    userId,
    timeFilters,
}: Readonly<{
    userId: string;
    timeFilters: SQL<unknown> | undefined;
}>) {
    const totalArtistsCount = await db
        .select({
            countArtists: sql<number>`count(distinct ${artistTracks.artistId})`,
        })
        .from(listeningHistory)
        .innerJoin(
            artistTracks,
            eq(listeningHistory.trackId, artistTracks.trackId),
        )
        .where(
            and(
                eq(listeningHistory.userId, userId),
                timeFilters,
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        );

    let totalArtists = 0;
    if (totalArtistsCount) {
        totalArtists = totalArtistsCount[0]!.countArtists;
    }

    return (
        <p className="text-lg font-semibold">{totalArtists.toLocaleString()}</p>
    );
}

export async function TotalTracks({
    userId,
    timeFilters,
}: Readonly<{
    userId: string;
    timeFilters: SQL<unknown> | undefined;
}>) {
    const totalTracksCount = await db
        .select({
            countTracks: sql<number>`count(distinct ${listeningHistory.trackId})`,
        })
        .from(listeningHistory)
        .where(
            and(
                eq(listeningHistory.userId, userId),
                timeFilters,
                gte(listeningHistory.progressMs, 30 * 1000),
            ),
        );

    let totalTracks = 0;
    if (totalTracksCount) {
        totalTracks = totalTracksCount[0]!.countTracks;
    }

    return (
        <p className="text-lg font-semibold">{totalTracks.toLocaleString()}</p>
    );
}
