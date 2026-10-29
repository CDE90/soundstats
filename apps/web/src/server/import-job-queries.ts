import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@soundstats/database";
import { importJobSummary } from "../lib/import-history.ts";

type Database = PostgresJsDatabase<typeof schema>;

export async function getImportJobs(db: Database, userId: string) {
    const records = await db
        .select({
            id: schema.streamingUploads.id,
            fileName: schema.streamingUploads.fileName,
            processed: schema.streamingUploads.processed,
            invalidFile: schema.streamingUploads.invalidFile,
            failedAt: schema.streamingUploads.failedAt,
            processedAt: schema.streamingUploads.processedAt,
            processingStartedAt: schema.streamingUploads.processingStartedAt,
            nextRetryAt: schema.streamingUploads.nextRetryAt,
            importedFrom: schema.streamingUploads.importedFrom,
            importedTo: schema.streamingUploads.importedTo,
            createdAt: schema.streamingUploads.createdAt,
            updatedAt: schema.streamingUploads.updatedAt,
            storageDeletedAt: schema.streamingUploads.storageDeletedAt,
        })
        .from(schema.streamingUploads)
        .where(eq(schema.streamingUploads.userId, userId))
        .orderBy(desc(schema.streamingUploads.createdAt))
        .limit(100);
    return records.map((record) => importJobSummary(record));
}

export async function retryImportJob(db: Database, userId: string, id: bigint) {
    const retried = await db
        .update(schema.streamingUploads)
        .set({
            attemptCount: 0,
            lastError: null,
            nextRetryAt: null,
            failedAt: null,
            processingStartedAt: null,
        })
        .where(
            and(
                eq(schema.streamingUploads.id, id),
                eq(schema.streamingUploads.userId, userId),
                eq(schema.streamingUploads.processed, false),
                eq(schema.streamingUploads.invalidFile, false),
                isNotNull(schema.streamingUploads.failedAt),
                isNull(schema.streamingUploads.processingStartedAt),
                isNull(schema.streamingUploads.storageDeletedAt),
            ),
        )
        .returning({ id: schema.streamingUploads.id });
    return retried.length > 0;
}
