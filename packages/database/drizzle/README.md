# Import job progress upgrade

This repository previously managed its schema with `db:push` and had no
versioned migration journal. `0000_import_job_progress` is the first registered
Drizzle migration. It adds three nullable columns to the existing
`streaming_uploads` table; it does not recreate tables or alter existing history.
The accompanying snapshot records the complete current schema so future
`db:generate` runs can compare against a correct baseline. The SQL deliberately
contains only the additive upgrade for existing databases.

For an existing SoundStats database, run `pnpm db:migrate` with its normal
database configuration **before deploying the updated web app and service**.
For a fresh database, initialize the full schema using `pnpm db:push`, then run
`pnpm db:migrate` to register the upgrade. The additive statements use
`IF NOT EXISTS`, so that sequence is safe.

`processing_started_at` is an expiring worker claim. Claims older than 30 minutes
may be reclaimed on the next scheduled processing run. A worker must lock and
verify its claim before replacing listening history; an older worker cannot
complete a job after another worker has reclaimed it. Success stores the imported
date range and completion timestamp atomically with the listening data.

The migration and queue queries are exercised only against an explicitly supplied
`TEST_DATABASE_URL` by `apps/web/tests/import-job-queries.test.mjs`, within an
isolated schema. No production or app database migration is applied by tests.
