# Dashboard performance fix · 1 November 2026

Production dashboard reports were slow after the freshness fix removed persistent caches. Read-only profiling reproduced the reported delay on the production admin listener's roughly 82,600 listens, against a catalogue containing roughly 700,000 tracks and 960,000 artist-track relationships.

## Cause and changes

The report's shared read-only transaction executes queries on one connection. Several plans repeatedly hashed the entire catalogue before joining a small listener-specific history subset. Thirty-day artist counts visited roughly 960,000 artist-track rows for about 900 qualifying listens. Artist/album streaks also joined and grouped the listener's full ten-year history for every date selection.

- Aggregate qualifying history per track before catalogue lookups. Correlated indexed lookups retain a literal `OFFSET 0` optimizer barrier so PostgreSQL cannot flatten them into whole-catalogue hash joins. Drizzle 0.45 drops numeric `.offset(0)`, so the helper deliberately supplies a typed SQL zero; SQL/plan regressions protect this behavior.
- Group track IDs before counting them, avoiding the larger distinct-text sort over every play. Preserve short-play thresholds, all collaborative artist credits in totals, primary artists in rankings, tie ordering, comparison limits and existing album-less track semantics.
- Compute the overall streak once per report. No entity streak can start before that run, so use its exact UTC start as the entity queries' lower bound. Skip entity queries entirely when the overall streak is zero. Tests include gaps, yesterday-only runs, short listens and streaks exceeding 1,000 days; there is no arbitrary history cap.
- Disable JIT only inside the reporting transaction. An all-time artist query spent about 465ms on JIT compilation in the measured plan; disabling it locally reduced that query from about 1.18s to 0.33s. The connection's setting is restored automatically when the transaction ends.
- Reuse the already authenticated Clerk profile for the Spotify gate and own-dashboard identity, removing two redundant profile lookups. Friend dashboards still require the existing permission check and fetch the friend's profile separately.

All sections still read one fresh repeatable-read snapshot and appear together. No persistent report cache, database schema change, new index or production configuration change is introduced.

## Production read-only benchmark

| Report       | Deployed code | Performance fix |
| ------------ | ------------: | --------------: |
| Last 30 days |        9.449s |          2.016s |
| All time     |       11.594s |          3.432s |

The benchmark invoked the actual reporting components and queries from this machine, using a connection restricted to read-only transactions and a statement timeout. PostgreSQL parallel workers were disabled to match the application. Both versions used the same listener, an end date of 31 October 2026 and the same period bounds. The reference source was the merged `main` implementation; source adapters replaced presentation boundaries only. No production rows were changed.

Normalized hashes of summary values, ranking/comparison rows, chart series and entity-streak items match exactly between versions for both periods. Streak items were normalized by ID because equal-length streaks do not specify an ID tie-breaker. These are single paired report timings including local-to-production database round trips; they exclude Clerk, routing, hydration and browser rendering. They establish a substantial query improvement, not a production browser latency guarantee or load-test result.

## Verification

All **93 web regressions pass without skips**: 59 UI/reporting/SQL checks, 12 music-detail checks, six chart checks, 15 Chromium interactions and one production Next navigation/freshness check. PostgreSQL fixtures verify output equivalence against the original ranking queries and ensure catalogue lookup plans use correlated indexes. Auth checks cover verified-profile reuse, missing Spotify linkage, mismatched profiles and signed-out requests. Reporting tests retain snapshot isolation, UTC dates, read-only enforcement and transaction-local JIT settings.

`pnpm build`, repository-wide `pnpm check`, changed-file formatting and whitespace checks pass. Build and typecheck were finally run sequentially because concurrent Next generation can temporarily remove its route types. The performance fix is prepared on a separate branch; production remains on the previously merged redesign until this follow-up is merged and deployed.
