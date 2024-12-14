import { Card } from "@/components/Card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRoot,
    TableRow,
} from "@/components/Table";
import { DateSelector } from "@/components/ui/DateSelector";
import { db } from "@/server/db";
import {
    albums,
    artists,
    artistTracks,
    listeningHistory,
    tracks,
} from "@/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[]>>;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect("/login");
    }

    const actualParams = await searchParams;

    // @ts-expect-error this is fine
    const searchParamsCopy = new URLSearchParams(actualParams);

    // Get the start date and end date from the search params
    const startDate = searchParamsCopy.get("from")
        ? new Date(searchParamsCopy.get("from")!)
        : new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const endDate = searchParamsCopy.get("to")
        ? new Date(searchParamsCopy.get("to")!)
        : new Date();
    endDate.setHours(23, 59, 59, 999);

    const timeFilters = and(
        gte(listeningHistory.playedAt, startDate),
        lte(listeningHistory.playedAt, endDate),
    );

    const topArtists = await db
        .select({
            count: sql<number>`count(*)`,
            artist: artists.name,
            imageUrl: artists.imageUrl,
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
            ),
        )
        .groupBy(artists.id)
        .orderBy(desc(sql`count(*)`), asc(artists.name))
        .limit(10);

    const topTracks = await db
        .select({
            count: sql<number>`count(*)`,
            track: tracks.name,
            imageUrl: albums.imageUrl,
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
        .orderBy(desc(sql`count(*)`), asc(tracks.name))
        .limit(10);

    return (
        <div className="p-4">
            <h1 className="mb-2 text-2xl font-bold">Dashboard</h1>
            <p className="mb-2">
                {startDate.toISOString()} - {endDate.toISOString()}
            </p>
            <DateSelector baseUrl={"http://localhost:3000"} className="mb-2" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <h2 className="mb-2 text-xl font-bold">Top Artists</h2>
                    <TableRoot>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Rank</TableHeaderCell>
                                    <TableHeaderCell>Artist</TableHeaderCell>
                                    <TableHeaderCell>Count</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {topArtists.map((artist, index) => (
                                    <TableRow
                                        key={
                                            artist.artist +
                                            (artist.imageUrl ?? "")
                                        }
                                    >
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                {artist.imageUrl ? (
                                                    <Image
                                                        src={artist.imageUrl}
                                                        alt={artist.artist}
                                                        width={50}
                                                        height={50}
                                                    />
                                                ) : null}
                                                {artist.artist}
                                            </div>
                                        </TableCell>
                                        <TableCell>{artist.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableRoot>
                </Card>
                <Card>
                    <h2 className="mb-2 text-xl font-bold">Top Tracks</h2>
                    <TableRoot>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Rank</TableHeaderCell>
                                    <TableHeaderCell>Track</TableHeaderCell>
                                    <TableHeaderCell>Count</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {topTracks.map((track, index) => (
                                    <TableRow
                                        key={
                                            track.track + (track.imageUrl ?? "")
                                        }
                                    >
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                {track.imageUrl ? (
                                                    <Image
                                                        src={track.imageUrl}
                                                        alt={track.track}
                                                        width={50}
                                                        height={50}
                                                    />
                                                ) : null}
                                                {track.track}
                                            </div>
                                        </TableCell>
                                        <TableCell>{track.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableRoot>
                </Card>
            </div>
        </div>
    );
}
