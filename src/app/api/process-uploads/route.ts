// POST /api/process-uploads
// This endpoint will trigger the refetching the potentially stale data for artists and albums

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getGlobalAccessToken } from "@/server/spotify/spotify";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

export async function GET(request: Request) {
    if (env.NODE_ENV === "production") {
        // Return 404 in production
        return new Response("Not found", { status: 404 });
    }
    // Otherwise, send the response from POST
    return POST(request);
}

/*
To correctly schedule, we need to add the following cron jobs:

    5 *\/6 * * * curl -X POST -H "Authorization: Bearer [token]" https://[domain]/api/process-uploads

*/

const fileSchema = z.array(
    z.object({
        endTime: z.string(),
        artistName: z.string(),
        trackName: z.string(),
        msPlayed: z.number(),
    }),
);
type FileData = z.infer<typeof fileSchema>;

// When the environment is production, this endpoint will be protected by a bearer token
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

    // Get the files that have been uploaded
    const files = await db
        .select()
        .from(schema.streamingUploads)
        .where(eq(schema.streamingUploads.processed, false))
        .orderBy(asc(schema.streamingUploads.createdAt))
        .limit(10);

    // Fetch the contents of each file
    const fileContents = await Promise.all(
        files.map(async (file) => {
            const response = await fetch(file.fileUrl);
            const text = await response.text();
            return {
                id: file.id,
                userId: file.userId,
                text,
            };
        }),
    );

    // Iterate through each file
    for (const file of fileContents) {
        let fileData: FileData;
        try {
            fileData = fileSchema.parse(JSON.parse(file.text));
        } catch {
            // Skip the file if it's not valid
            await db
                .update(schema.streamingUploads)
                .set({
                    invalidFile: true,
                    processed: true,
                })
                .where(eq(schema.streamingUploads.id, file.id));
            continue;
        }

        // TODO: process the file data
    }
}
