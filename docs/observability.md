# Observability

The web app and the worker can export traces and metrics over OTLP/HTTP to an
OpenTelemetry collector. Export is off by default; without it, the
instrumentation is a no-op and nothing else changes.

## Configuration

| Variable                        | Default    | Purpose                                                                             |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `SOUNDSTATS_OTEL_ENABLED`       | off        | `1` enables export in both processes.                                               |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | —          | Collector base URL (`/v1/traces` and `/v1/metrics` are appended).                   |
| `OTEL_EXPORTER_OTLP_HEADERS`    | —          | For example `Authorization=Basic%20<base64 user:token>`.                            |
| `SOUNDSTATS_WORKER_TRACE_RATIO` | `0.05`     | Share of per-user poll traces kept. Run, import and refetch traces are always kept. |
| `SOUNDSTATS_OTEL_ENVIRONMENT`   | `NODE_ENV` | `deployment.environment.name`.                                                      |

`SOURCE_COMMIT` (set by Coolify) becomes `service.version`. Export runs in the
background with bounded queues; an unreachable collector drops telemetry and
never blocks requests or polling. The worker flushes on `SIGTERM` for up to
five seconds. The web app doesn't: `next start` exits as soon as its server has
closed, before an export can finish, so up to one export interval of web
telemetry (5 s of spans, 30 s of metrics) is lost per restart. Handling the
signal ourselves (`NEXT_MANUAL_SIG_HANDLE`) would give up Next's graceful
request draining, which matters more.

## What is exported

Services: `soundstats-web` and `soundstats-worker`, both in the `soundstats`
namespace.

**Worker** (`apps/service/src/telemetry.ts`, `metrics.ts`):

- One trace per poll run (`poll.run standard|premium`), and one sampled trace
  per user poll (`poll.user`, linked to its run) with the Clerk and Spotify
  calls and the database write as children.
- `soundstats.poll.run.duration`, `.run.skipped`, `.last_success`,
  `.users` (by `outcome`), `.users_in_backoff`, `.slot_wait`;
  `soundstats.listens.recorded` (by `kind`); `soundstats.cron.job.duration`
  (by `cron_job` and `result`: `ok`, `error` or `skipped`).
- Node.js runtime metrics and outgoing `fetch` spans and durations.

**Spotify package** (both processes, wherever they call it):
`soundstats.spotify.requests` (by templated `endpoint` and `status`),
`.rate_limit.pauses`, `.rate_limit.pause_time`, `.gate_wait`, and
`soundstats.clerk.token.duration`. The web app currently fetches Clerk tokens
through its own `server/lib.ts`, so the Clerk metric comes from the worker
only.

**Web** (`apps/web/src/instrumentation*.ts`): Next.js server spans (route
templates), Node.js runtime metrics, and `soundstats.web.request_errors` from
`onRequestError`. Health checks, the PostHog `/ingest` proxy and static assets
are not traced.

## Privacy

Every span passes through `SanitizingSpanExporter` (`packages/telemetry`)
before export:

- URLs (`url.full`, `http.url`, `url.path`) lose their query string, and
  ID-like path segments become `{id}`: Spotify IDs, Clerk user IDs and
  UploadThing file keys never leave the process in URLs.
- Next.js's raw `http.target` (for example `/invite/<code>`) is replaced by the
  route template, or dropped.
- Next.js fetch span names (`fetch GET <url>`) are templated the same way,
  which also keeps spanmetrics cardinality bounded.
- Exception events keep their type and stack frames but lose the message,
  which can include SQL parameters. Span status messages are dropped.

Metric attributes are bounded (groups, outcomes, templated endpoints, status
codes, route templates). Clerk user IDs appear only as the `enduser.id` span
attribute. Request headers and tokens are not recorded.

Instruments in shared packages are created on first use: Next.js can import
page modules before its instrumentation hook registers the SDK, and an
instrument created before that stays a no-op.
