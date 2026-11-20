# Observability

The web app and the worker can export traces and metrics over OTLP/HTTP to an
OpenTelemetry collector. Export is off by default; without it, the
instrumentation is a no-op and nothing else changes.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SOUNDSTATS_OTEL_ENABLED` | off | `1` enables export in both processes. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Collector base URL (`/v1/traces` and `/v1/metrics` are appended). |
| `OTEL_EXPORTER_OTLP_HEADERS` | — | For example `Authorization=Basic%20<base64 user:token>`. |
| `SOUNDSTATS_WORKER_TRACE_RATIO` | `0.05` | Share of per-user poll traces kept. Run, import and refetch traces are always kept. |
| `SOUNDSTATS_OTEL_ENVIRONMENT` | `NODE_ENV` | `deployment.environment.name`. |

`SOURCE_COMMIT` (set by Coolify) becomes `service.version`. Export runs in the
background with bounded queues; an unreachable collector drops telemetry and
never blocks requests or polling. The worker flushes on `SIGTERM` for up to
five seconds.

## What is exported

Services: `soundstats-web` and `soundstats-worker`, both in the `soundstats`
namespace.

**Worker** (`apps/service/src/telemetry.ts`, `metrics.ts`):

- One trace per poll run (`poll.run standard|premium`), and one sampled trace
  per user poll (`poll.user`, linked to its run) with the Clerk and Spotify
  calls and the database write as children.
- `soundstats.poll.run.duration`, `.run.skipped`, `.last_success`,
  `.users` (by `outcome`), `.users_in_backoff`, `.slot_wait`;
  `soundstats.listens.recorded` (by `kind`); `soundstats.cron.job.duration`.
- Node.js runtime metrics and outgoing `fetch` spans and durations.

**Spotify package** (both processes): `soundstats.spotify.requests` (by
templated `endpoint` and `status`), `.rate_limit.pauses`,
`.rate_limit.pause_time`, `.gate_wait`, and `soundstats.clerk.token.duration`.

**Web** (`apps/web/src/instrumentation*.ts`): Next.js server spans (route
templates), Node.js runtime metrics, and `soundstats.web.request_errors` from
`onRequestError`. Health checks, the PostHog `/ingest` proxy and static assets
are not traced.

## Privacy

Metric attributes are bounded (groups, outcomes, templated endpoints, status
codes, route templates). Clerk user IDs appear only on spans (`enduser.id`).
Request headers and tokens are not recorded; UploadThing file URLs are
redacted to the host.
