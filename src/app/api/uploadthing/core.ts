import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    streamingHistoryUploader: f({
        "application/json": {
            maxFileSize: "16MB",
            maxFileCount: 10,
        },
    })
        .middleware(async ({ files }) => {
            // Check if the user is authenticated
            const user = await currentUser();

            // eslint-disable-next-line @typescript-eslint/only-throw-error
            if (!user) throw new UploadThingError("Unauthorized");

            // Check if any files don't have the correct name
            // Should be Streaming_History_Audio_<number/_/->.json (for extended files)
            const fileNameRegex = /^Streaming_History_Audio_[\d\-_]+\.json$/;

            for (const file of files) {
                if (!fileNameRegex.test(file.name))
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw new UploadThingError("Invalid file name");
            }

            if (files.length === 0)
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw new UploadThingError("No files uploaded");

            return { userId: user.id };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // This code RUNS ON YOUR SERVER after upload
            console.log("Upload complete for userId:", metadata.userId);

            console.log("file url", file.url);
            console.log("file details", file);

            // Add the file upload to the database
            await db.insert(schema.streamingUploads).values({
                userId: metadata.userId,
                fileUrl: file.appUrl,
                fileName: file.name,
            });

            // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
