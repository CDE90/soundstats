Music detail regression tests use Node's built-in test runner and TypeScript stripping (Node 22.6 or newer).

Run the URL, date-range, and permission tests:

```sh
pnpm --filter @soundstats/web test:music-details
```

To also run the PostgreSQL integration tests:

```sh
pnpm --filter @soundstats/database build
docker run --name soundstats-detail-tests \
  -e POSTGRES_PASSWORD=soundstats-test -e POSTGRES_DB=soundstats_test \
  -p 127.0.0.1:55432:5432 -d postgres:17-alpine
# Wait until this reports that PostgreSQL accepts connections:
docker exec soundstats-detail-tests pg_isready
TEST_DATABASE_URL=postgres://postgres:soundstats-test@127.0.0.1:55432/soundstats_test \
  pnpm --filter @soundstats/web test:music-details
docker rm -f soundstats-detail-tests
```

The integration tests require `TEST_DATABASE_URL`; they never use the app's `DATABASE_URL`. Each run creates and drops its own fixture schema. They also check that live track availability excludes Spotify IDs missing from the local catalogue. They exercise user and entity isolation for artists, tracks, and albums, featured artists, the 30-second play threshold, inclusive UTC boundaries, zero-filled activity, empty histories, imported plays, monthly aggregation, and the recent-history limit with a non-UTC database session.

Chart utility tests run separately with `pnpm --filter @soundstats/web test:listening-chart`. They cover adaptive aggregation thresholds, previous-period boundaries, duration formatting, regular axis ticks, and UTC date labels. The PostgreSQL suite also verifies hourly, weekly, monthly, and yearly totals and comparison alignment across partial calendar buckets.

Run `pnpm --filter @soundstats/web test:ui-review` with Node 22.15 or newer for rendering, action-result, calendar, feed, social, invite, import, and leaderboard regression checks. TypeScript and Node module hooks load the real TSX components without a running Next server. Account and network boundaries use fixtures. The normal checks do not need a Spotify account. Supply the disposable `TEST_DATABASE_URL` above to additionally run five import/leaderboard database cases; otherwise those cases explicitly report as skipped.

The import cases run the registered Drizzle migration twice over an old queue schema, then exercise persisted status, owner isolation, atomic retry, simultaneous worker claims and expired claims. The leaderboard cases use a non-UTC database session to verify calendar boundaries, previous-period rankings, matching pagination counts and allowed people. All database fixtures use isolated schemas and are dropped after the tests. Live-feed rendering checks verify the actual query allow-list, partial/full failures and paused playback with local account/Spotify adapters.

Run the real-component interaction checks in headless Chromium:

```sh
# Install a test browser if Chrome is not already installed on macOS.
pnpm --filter @soundstats/web exec playwright install chromium
pnpm --filter @soundstats/web test:ui-interactions
```

`TEST_BROWSER_EXECUTABLE` can select an existing Chromium executable. The harness bundles actual components and application CSS into a temporary local fixture, starts an ephemeral loopback server, and closes it and Chromium after the suite. It stubs Clerk, routing and server/upload actions; it never sends friend requests, uploads files or changes a real account. It tests 320px, 390px and desktop calendars; keyboard dismissal and focus; chart data; both default themes' error contrast with axe; admin labels and failed updates; feed filters and failed pagination; search races and resolved action errors; all friend-card actions and removal dialogs; clipboard denial; limited invites; file review and upload recovery; and persisted import-state rendering. These are component interactions, not an end-to-end test of Spotify, Clerk or UploadThing.

Before committing a change across these areas, run:

```sh
pnpm check
pnpm build
TEST_DATABASE_URL=postgres://postgres:soundstats-test@127.0.0.1:55432/soundstats_test \
  pnpm --filter @soundstats/web test:ui-review
TEST_DATABASE_URL=postgres://postgres:soundstats-test@127.0.0.1:55432/soundstats_test \
  pnpm --filter @soundstats/web test:music-details
pnpm --filter @soundstats/web test:listening-chart
pnpm --filter @soundstats/web test:ui-interactions
```
