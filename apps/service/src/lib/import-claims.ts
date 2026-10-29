import { and, eq, isNull, lt, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@soundstats/database";

type Upload = typeof schema.streamingUploads.$inferSelect;

export function activeUploadClaim(upload: Upload) {
    return and(
        eq(schema.streamingUploads.id, upload.id),
        eq(schema.streamingUploads.userId, upload.userId),
        upload.processingStartedAt
            ? eq(
                  schema.streamingUploads.processingStartedAt,
                  upload.processingStartedAt,
              )
            : isNull(schema.streamingUploads.processingStartedAt),
    );
}

export function availableUploadClaim(now: Date) {
    return or(
        isNull(schema.streamingUploads.processingStartedAt),
        lt(
            schema.streamingUploads.processingStartedAt,
            new Date(now.getTime() - schema.IMPORT_PROCESSING_LEASE_MS),
        ),
    );
}

export function uploadRetryDue(now: Date) {
    return or(
        isNull(schema.streamingUploads.nextRetryAt),
        lte(schema.streamingUploads.nextRetryAt, now),
    );
}

export async function claimUpload(
    db: PostgresJsDatabase<typeof schema>,
    id: bigint,
    now = new Date(),
) {
    const [upload] = await db
        .update(schema.streamingUploads)
        .set({ processingStartedAt: now })
        .where(
            and(
                eq(schema.streamingUploads.id, id),
                eq(schema.streamingUploads.processed, false),
                eq(schema.streamingUploads.invalidFile, false),
                isNull(schema.streamingUploads.failedAt),
                availableUploadClaim(now),
                uploadRetryDue(now),
            ),
        )
        .returning();
    return upload;
}
