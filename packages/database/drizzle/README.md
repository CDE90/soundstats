# Import job progress upgrade

This repository previously managed its schema with `db:push` and had no
versioned migration journal. `0000_import_job_progress` is the first registered
Drizzle migration. It adds three nullable columns to the existing
`streaming_uploads` table; it does not recreate tables or alter existing history.
The accompanying snapshot records the complete current schema so future
`db:generate` runs can compare against a correct baseline. The SQL deliberately
contains only the additive upgrade for existing databases.

Both applications now run registered migrations automatically before starting:
`pnpm dev`, `pnpm start`, each app's `dev`/`start`, and web `preview` use
`packages/database/runtime/start.mjs`. The wrapper loads the app's environment
first: web uses Next's own environment loader and normal `.env*` precedence;
service uses its existing dotenv behavior. Build commands do not migrate.

`runtime/migrate.mjs` reads migration assets relative to its own location, uses
only production dependencies (`postgres` and `drizzle-orm`), and writes the normal
Drizzle migration journal. A PostgreSQL transaction advisory lock serializes
concurrent web/worker starts. Pending SQL and journal entries commit together;
errors roll back and prevent the app process from launching. Lock acquisition
times out after 120 seconds so a blocked deployment fails visibly. Termination
cancels active migration SQL, rolls back, and releases the lock; after launch the
wrapper forwards termination signals, arguments, and the child's exit status.

For an existing SoundStats database, deploying and starting either application
applies pending additive upgrades before it serves requests or schedules jobs.
`pnpm db:migrate` remains available for an explicit migration with `DATABASE_URL`
already set. All startup instances must use the updated wrapper to share its
locking guarantee. Do not invoke `next start` or the service entrypoint directly
in deployment commands.

A fresh database deliberately fails startup with initialization instructions.
Initialize its full baseline explicitly using `pnpm db:push` with that database's
configuration, then start the application (or run `pnpm db:migrate`). Startup
never silently runs `db:push`. The additive statements use `IF NOT EXISTS`, so
the first startup also registers databases initialized from the current schema.

Runtime deployments must retain the workspace's `packages/database/runtime` and
`packages/database/drizzle` directories as well as production dependencies. The
database package's `files` manifest includes `dist`, `runtime`, and `drizzle` for
pack/deploy tooling. There is no runtime dependency on TypeScript sources,
`drizzle-kit`, a development dependency, or the current working directory when
resolving migration SQL. App scripts resolve the wrapper from their normal app
working directories in this workspace.

`processing_started_at` is an expiring worker claim. Claims older than 30 minutes
may be reclaimed on the next scheduled processing run. A worker must lock and
verify its claim before replacing listening history; an older worker cannot
complete a job after another worker has reclaimed it. Success stores the imported
date range and completion timestamp atomically with the listening data.

Run the startup integration suite with
`TEST_DATABASE_URL=postgres://... pnpm --filter @soundstats/database test:startup`.
It accepts only a local disposable PostgreSQL target with permission to create
and drop a temporary `startup_test_<pid>` database. Tests verify real migration
idempotency, concurrent startups, rollback before child launch, fresh database
failure, relocated production assets, app environment loading, argument/exit
handling, and cancellation/lock release. The temporary database is removed at
completion. Queue tests in `apps/web/tests/import-job-queries.test.mjs` use an
isolated schema on their explicitly supplied `TEST_DATABASE_URL`. These tests
never load an app's configured database.
