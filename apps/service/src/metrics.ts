/**
 * Worker metrics and tracer. These use @opentelemetry/api only and are no-ops
 * until telemetry.ts registers an SDK.
 *
 * Never use user, track or other unbounded IDs as metric attributes; put them
 * on spans instead.
 */
import { metrics, trace } from "@opentelemetry/api";

export const tracer = trace.getTracer("@soundstats/service");
const meter = metrics.getMeter("@soundstats/service");

export type PollGroup = "standard" | "premium";

export type PollOutcome =
    | "recorded"
    | "not_playing"
    | "episode"
    | "auth_unavailable"
    | "auth_backoff"
    | "user_missing"
    | "rate_limited"
    | "already_processing"
    | "error";

const RUN_BUCKETS_S = [0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 300];

export const pollRunDuration = meter.createHistogram(
    "soundstats.poll.run.duration",
    {
        description: "Duration of a now-playing poll run",
        unit: "s",
        advice: { explicitBucketBoundaries: RUN_BUCKETS_S },
    },
);

export const pollRunsSkipped = meter.createCounter(
    "soundstats.poll.run.skipped",
    {
        description:
            "Poll runs skipped because the previous run of the group was still going",
    },
);

export const pollUsers = meter.createCounter("soundstats.poll.users", {
    description: "Users handled by now-playing polling, by outcome",
});

export const pollSlotWait = meter.createHistogram("soundstats.poll.slot_wait", {
    description: "Time a user poll waited for a concurrency slot",
    unit: "s",
    advice: {
        explicitBucketBoundaries: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
    },
});

export const listensRecorded = meter.createCounter(
    "soundstats.listens.recorded",
    {
        description:
            "Listening-history rows written: new listens and progress updates",
    },
);

export const cronJobDuration = meter.createHistogram(
    "soundstats.cron.job.duration",
    {
        description: "Duration of a scheduled worker job",
        unit: "s",
        advice: { explicitBucketBoundaries: RUN_BUCKETS_S },
    },
);

const lastPollSuccess = new Map<PollGroup, number>();

/** Freshness gauge: the main signal that polling is alive. */
export function recordPollSuccess(group: PollGroup) {
    lastPollSuccess.set(group, Date.now() / 1_000);
}

meter
    .createObservableGauge("soundstats.poll.last_success", {
        description: "Unix time of the last completed poll run",
        unit: "s",
    })
    .addCallback((result) => {
        for (const [group, timestamp] of lastPollSuccess) {
            result.observe(timestamp, { group });
        }
    });

/** Registers the gauge for users whose polling is paused after auth errors. */
export function observeUsersInBackoff(count: () => number) {
    meter
        .createObservableGauge("soundstats.poll.users_in_backoff", {
            description:
                "Users whose polling is paused because Spotify authorization failed",
        })
        .addCallback((result) => result.observe(count()));
}
