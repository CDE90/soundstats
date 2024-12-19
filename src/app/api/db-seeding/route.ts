// This endpoint is basically used for anything I need it for.
// Currently, it is set up to correctly set whether each artist
// is the primary artist for that track

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
    getGlobalAccessToken,
    getSeveralTracks,
} from "@/server/spotify/spotify";
import type { Track } from "@/server/spotify/types";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    if (env.NODE_ENV === "production") {
        // Return 404 in production
        return new Response("Not found", { status: 404 });
    }
    // Otherwise, send the response from POST
    return POST(request);
}

export async function POST(request: Request) {
    const headers = request.headers;
    const token = headers.get("Authorization");

    if (env.NODE_ENV === "production") {
        if (!token) {
            return new Response("Unauthorized", { status: 401 });
        }

        const bearerToken = token.split(" ")[1];

        if (bearerToken !== env.SYNC_ENDPOINT_TOKEN) {
            return new Response("Unauthorized", { status: 401 });
        }
    }

    // Get the app access token
    const accessToken = (await getGlobalAccessToken())!;

    // Get all tracks
    const dbTracks = await db.select().from(schema.tracks);

    const trackChunkSize = 50;
    const tracks: Track[] = [];

    for (let i = 0; i < dbTracks.length; i += trackChunkSize) {
        console.log(`Fetching chunk ${i + 1} to ${i + trackChunkSize}`);
        const chunk = dbTracks.slice(i, i + trackChunkSize);
        const chunkIds = chunk.map((track) => track.id);
        const chunkTracks = await getSeveralTracks(accessToken, chunkIds);
        tracks.push(...(chunkTracks?.tracks ?? []));
    }

    // Now we need to update the artist_tracks table
    await Promise.all(
        tracks.map(async (track) => {
            const primaryArtist = track.artists[0];

            if (!primaryArtist) {
                return;
            }

            await db
                .update(schema.artistTracks)
                .set({
                    isPrimaryArtist: true,
                })
                .where(
                    and(
                        eq(schema.artistTracks.trackId, track.id),
                        eq(schema.artistTracks.artistId, primaryArtist.id),
                    ),
                );
        }),
    );

    return NextResponse.json({ success: true });
}
