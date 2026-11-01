import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";

export const migrationsFolder = fileURLToPath(
    new URL("../drizzle/", import.meta.url),
);

// One transaction owns the lock, schema changes, and Drizzle journal writes.
// Concurrent web/worker starts cannot race, and a disconnect releases the lock.
export async function runMigrations({
    databaseUrl = process.env.DATABASE_URL,
    folder = migrationsFolder,
    migrationsSchema = "drizzle",
    signal,
} = {}) {
    if (!databaseUrl)
        throw new Error("DATABASE_URL is required before startup.");
    signal?.throwIfAborted();
    const migrations = readMigrationFiles({ migrationsFolder: folder });
    if (!migrations.length)
        throw new Error("No registered database migrations found.");
    const sql = postgres(databaseUrl, {
        max: 1,
        connect_timeout: 15,
        onnotice: () => {},
    });
    let currentQuery;
    const abort = () => currentQuery?.cancel();
    const execute = async (query) => {
        signal?.throwIfAborted();
        currentQuery = query;
        try {
            return await query;
        } finally {
            currentQuery = undefined;
        }
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
        return await sql.begin(async (tx) => {
            await execute(tx`SET LOCAL lock_timeout = '120s'`);
            await execute(tx`SELECT pg_advisory_xact_lock(1936684404, 1)`);
            signal?.throwIfAborted();
            const [baseline] = await execute(
                tx`SELECT to_regclass('streaming_uploads') AS uploads`,
            );
            if (!baseline.uploads) {
                throw new Error(
                    "SoundStats schema is missing. Initialize a fresh database explicitly with pnpm db:push, then restart. Startup never creates the baseline schema automatically.",
                );
            }
            await execute(
                tx`CREATE SCHEMA IF NOT EXISTS ${tx(migrationsSchema)}`,
            );
            const journal = tx(`${migrationsSchema}.__drizzle_migrations`);
            await execute(
                tx`CREATE TABLE IF NOT EXISTS ${journal} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
            );
            const [latest] = await execute(
                tx`SELECT created_at FROM ${journal} ORDER BY created_at DESC LIMIT 1`,
            );
            let applied = 0;
            for (const migration of migrations) {
                if (
                    latest &&
                    Number(latest.created_at) >= migration.folderMillis
                )
                    continue;
                signal?.throwIfAborted();
                for (const statement of migration.sql)
                    await execute(tx.unsafe(statement));
                await execute(
                    tx`INSERT INTO ${journal} (hash, created_at) VALUES (${migration.hash}, ${migration.folderMillis})`,
                );
                applied++;
            }
            signal?.throwIfAborted();
            return applied;
        });
    } finally {
        signal?.removeEventListener("abort", abort);
        await sql.end({ timeout: 5 });
    }
}

export function reportMigrationError(error) {
    // Never print the connection URL or driver error object (which can hold SQL).
    let message =
        error instanceof Error ? error.message : "Unknown database error";
    if (process.env.DATABASE_URL)
        message = message.replaceAll(process.env.DATABASE_URL, "[database]");
    console.error(
        `[database] Migration failed. Application was not started. ${message}`,
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    try {
        const applied = await runMigrations();
        console.log(
            `[database] Ready (${applied} migration${applied === 1 ? "" : "s"} applied).`,
        );
    } catch (error) {
        reportMigrationError(error);
        process.exitCode = 1;
    }
}
