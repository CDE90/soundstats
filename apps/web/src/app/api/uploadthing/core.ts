import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { importSelectionError } from "@/lib/import-history";

const f = createUploadthing();

function logUploadEvent(
    level: "log" | "error",
    event: string,
    fields: Record<string, unknown>,
) {
    console[level](
        JSON.stringify({
            timestamp: new Date().toISOString(),
            component: "upload-api",
            event,
            ...fields,
        }),
    );
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    streamingHistoryUploader: f({
        blob: {
            maxFileSize: "64MB",
            maxFileCount: 20,
        },
    })
        .middleware(async ({ files }) => {
            const { userId } = await auth();

            // eslint-disable-next-line @typescript-eslint/only-throw-error
            if (!userId) throw new UploadThingError("Unauthorized");

            const validationError = importSelectionError(files);
            if (validationError)
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw new UploadThingError(validationError);

            return { userId };
        })
        .onUploadError(({ error, fileKey }) => {
            logUploadEvent("error", "upload_failed", {
                fileKey,
                stage: "storage",
                outcome: "failed",
                error: error.message,
            });
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                await db.insert(schema.streamingUploads).values({
                    userId: metadata.userId,
                    fileUrl: file.ufsUrl,
                    fileKey: file.key,
                    fileName: file.name,
                });
                logUploadEvent("log", "upload_queued", {
                    fileKey: file.key,
                    fileName: file.name,
                    userId: metadata.userId,
                    stage: "queue",
                    outcome: "success",
                });
            } catch (error) {
                logUploadEvent("error", "upload_queue_failed", {
                    fileKey: file.key,
                    fileName: file.name,
                    userId: metadata.userId,
                    stage: "queue",
                    outcome: "failed",
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                throw error;
            }

            // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
