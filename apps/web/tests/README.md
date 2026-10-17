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

The integration tests require `TEST_DATABASE_URL`; they never use the app's `DATABASE_URL`. Each run creates and drops its own fixture schema. They exercise user and entity isolation for artists, tracks, and albums, featured artists, the 30-second play threshold, inclusive UTC boundaries, zero-filled activity, empty histories, imported plays, monthly aggregation, and the recent-history limit with a non-UTC database session.


Chart utility tests run separately with `pnpm --filter @soundstats/web test:listening-chart`. They cover adaptive aggregation thresholds, previous-period boundaries, duration formatting, regular axis ticks, and UTC date labels. The PostgreSQL suite also verifies hourly, weekly, monthly, and yearly totals and comparison alignment across partial calendar buckets.


Run `pnpm --filter @soundstats/web test:ui-review` with Node 22.15 or newer for rendering checks of local/Spotify track destinations and listening-change accessibility labels, plus the preview seeder's missing-configuration guard. The rendering tests use TypeScript and Node module hooks to load the real TSX components without a running Next server; they do not need a database or Spotify account.
