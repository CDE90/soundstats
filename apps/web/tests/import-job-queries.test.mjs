import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@soundstats/database";
import {
    getImportJobs,
    retryImportJob,
} from "../src/server/import-job-queries.ts";
import {
    claimUpload,
    activeUploadClaim,
} from "../../service/src/lib/import-claims.ts";

const url = process.env.TEST_DATABASE_URL;
const sql = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
const db = sql ? drizzle(sql, { schema }) : null;
const fixture = `import_jobs_${process.pid}`;

before(async () => {
    if (!sql) return;
    await sql.unsafe(`CREATE SCHEMA "${fixture}"`);
    await sql.unsafe(`SET search_path TO "${fixture}"`);
    await sql.unsafe(`CREATE TABLE streaming_uploads (
        id bigserial PRIMARY KEY, user_id text NOT NULL, file_url text NOT NULL,
        file_key text, file_name text NOT NULL, processed boolean NOT NULL DEFAULT false,
        invalid_file boolean NOT NULL DEFAULT false, attempt_count integer NOT NULL DEFAULT 0,
        last_error text, next_retry_at timestamptz, failed_at timestamptz, processed_at timestamptz,
        storage_deleted_at timestamptz, storage_delete_attempt_count integer NOT NULL DEFAULT 0,
        storage_delete_last_error text, storage_delete_next_retry_at timestamptz,
        storage_delete_failed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz
    )`);
    const migration = {
        migrationsFolder: fileURLToPath(
            new URL("../../../packages/database/drizzle", import.meta.url),
        ),
        migrationsSchema: fixture,
    };
    // Exercise the registered journal upgrade on the pre-existing queue schema
    // and a second deploy; never use the application database configuration.
    await migrate(db, migration);
    await migrate(db, migration);
});

after(async () => {
    if (!sql) return;
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${fixture}" CASCADE`);
    await sql.end();
});

test(
    "import history survives reload, isolates owners and retains partial-batch failure",
    { skip: !url },
    async () => {
        await db.insert(schema.streamingUploads).values([
            {
                userId: "self",
                fileName: "complete.json",
                fileUrl: "https://storage/private",
                fileKey: "secret",
                processed: true,
                processedAt: new Date(),
                importedFrom: new Date("2024-01-01T00:00:00Z"),
                importedTo: new Date("2024-12-31T00:00:00Z"),
            },
            {
                userId: "self",
                fileName: "failed.json",
                fileUrl: "https://storage/private",
                failedAt: new Date(),
                lastError: "sensitive upstream details",
            },
            {
                userId: "other",
                fileName: "other.json",
                fileUrl: "https://storage/private",
            },
        ]);
        const first = await getImportJobs(db, "self");
        const reload = await getImportJobs(db, "self");
        assert.deepEqual(first, reload);
        assert.equal(first.length, 2);
        assert.deepEqual(first.map((job) => job.state).sort(), [
            "completed",
            "failed",
        ]);
        assert.match(
            first.find((job) => job.state === "completed").dashboardHref,
            /from=2024-01-01&to=2024-12-31/,
        );
        assert.doesNotMatch(
            JSON.stringify(first),
            /sensitive|https:\/\/storage|secret|other.json/,
        );
        assert.deepEqual(await getImportJobs(db, "unknown"), []);
    },
);

test(
    "retry is owner-scoped, atomic and allowed only for retained terminal failures",
    { skip: !url },
    async () => {
        const [failed, invalid, complete, deleted, queued] = await db
            .insert(schema.streamingUploads)
            .values([
                {
                    userId: "owner",
                    fileName: "retry.json",
                    fileUrl: "https://example.test",
                    failedAt: new Date(),
                    attemptCount: 5,
                },
                {
                    userId: "owner",
                    fileName: "invalid.json",
                    fileUrl: "https://example.test",
                    invalidFile: true,
                    failedAt: new Date(),
                },
                {
                    userId: "owner",
                    fileName: "done.json",
                    fileUrl: "https://example.test",
                    processed: true,
                },
                {
                    userId: "owner",
                    fileName: "deleted.json",
                    fileUrl: "https://example.test",
                    failedAt: new Date(),
                    storageDeletedAt: new Date(),
                },
                {
                    userId: "owner",
                    fileName: "queued.json",
                    fileUrl: "https://example.test",
                },
            ])
            .returning();
        assert.equal(await retryImportJob(db, "other", failed.id), false);
        for (const row of [invalid, complete, deleted, queued])
            assert.equal(await retryImportJob(db, "owner", row.id), false);
        const outcomes = await Promise.all([
            retryImportJob(db, "owner", failed.id),
            retryImportJob(db, "owner", failed.id),
        ]);
        assert.deepEqual(outcomes.sort(), [false, true]);
        const [retried] = await db
            .select()
            .from(schema.streamingUploads)
            .where(eq(schema.streamingUploads.id, failed.id));
        assert.equal(retried.attemptCount, 0);
        assert.equal(retried.failedAt, null);
        assert.equal(retried.processingStartedAt, null);
    },
);

test(
    "worker claims exclude simultaneous workers, recover crashes and reject stale completion",
    { skip: !url },
    async () => {
        const [pending] = await db
            .insert(schema.streamingUploads)
            .values({
                userId: "worker",
                fileName: "worker.json",
                fileUrl: "https://example.test",
            })
            .returning();
        const now = new Date();
        const [first, second] = await Promise.all([
            claimUpload(db, pending.id, now),
            claimUpload(db, pending.id, now),
        ]);
        assert.equal([first, second].filter(Boolean).length, 1);
        const old = first ?? second;
        const later = new Date(
            now.getTime() + schema.IMPORT_PROCESSING_LEASE_MS + 1,
        );
        const recovered = await claimUpload(db, pending.id, later);
        assert.ok(recovered);
        const staleUpdate = await db
            .update(schema.streamingUploads)
            .set({ processed: true })
            .where(activeUploadClaim(old))
            .returning();
        assert.equal(staleUpdate.length, 0);
        const complete = await db
            .update(schema.streamingUploads)
            .set({
                processed: true,
                processedAt: later,
                processingStartedAt: null,
            })
            .where(activeUploadClaim(recovered))
            .returning();
        assert.equal(complete.length, 1);
        assert.equal(await claimUpload(db, pending.id, later), undefined);
        const [waiting] = await db
            .insert(schema.streamingUploads)
            .values({
                userId: "worker",
                fileName: "waiting.json",
                fileUrl: "https://example.test",
                nextRetryAt: later,
            })
            .returning();
        assert.equal(await claimUpload(db, waiting.id, now), undefined);
    },
);
