// Must stay the first import: registers the OpenTelemetry SDK (when enabled)
// before other modules create instruments.
import { shutdownTelemetry } from "./telemetry.js";
import { CronJob } from "cron";
import { SpanStatusCode } from "@opentelemetry/api";
import { cronJobDuration, tracer } from "./metrics.js";
import { updateNowPlaying } from "./tasks/update-now-playing.js";
import { refetchStaleData } from "./tasks/refetch-stale-data.js";
import { processUploads } from "./tasks/process-uploads.js";

console.log("Starting SoundStats service...");

/** Times a scheduled job and records failures; never lets one escape. */
function instrumentedJob(name: string, job: () => Promise<void>) {
    return async () => {
        const startedAt = performance.now();
        let result: "ok" | "error" = "ok";
        try {
            await job();
        } catch (error) {
            result = "error";
            console.error(`Scheduled job ${name} failed:`, error);
        } finally {
            cronJobDuration.record((performance.now() - startedAt) / 1_000, {
                job: name,
                result,
            });
        }
    };
}

/** Like instrumentedJob, with one trace per run (poll runs make their own). */
function tracedJob(name: string, job: () => Promise<void>) {
    return instrumentedJob(name, () =>
        tracer.startActiveSpan(`job ${name}`, async (span) => {
            try {
                await job();
            } catch (error) {
                span.recordException(error as Error);
                span.setStatus({ code: SpanStatusCode.ERROR });
                throw error;
            } finally {
                span.end();
            }
        }),
    );
}

// Now-playing update jobs
// Every minute at 5 seconds past: non-premium users only
const nowPlayingStandardUsersJob = new CronJob(
    "5 * * * * *", // Every minute at 5 seconds past
    instrumentedJob("now_playing_standard", () => updateNowPlaying(false)),
    null,
    false,
    "Europe/London",
);

// Every 30 seconds: premium users only
const nowPlayingPremiumUsersJob = new CronJob(
    "0,30 * * * * *", // Every minute at 0 and 30 seconds past
    instrumentedJob("now_playing_premium", () => updateNowPlaying(true)),
    null,
    false,
    "Europe/London",
);

// Refetch stale data every hour at 15 minutes past the hour
const refetchStaleDataJob = new CronJob(
    "15 * * * *", // Every hour at 15 minutes past
    tracedJob("refetch_stale_data", refetchStaleData),
    null,
    false,
    "Europe/London",
);

// Process uploads every hour at 0, 20, and 40 minutes past the hour
const processUploadsJob = new CronJob(
    "0,20,40 * * * *", // Every hour at 0, 20, and 40 minutes past
    tracedJob("process_uploads", processUploads),
    null,
    false,
    "Europe/London",
);

// Start the cron jobs
nowPlayingStandardUsersJob.start();
nowPlayingPremiumUsersJob.start();
refetchStaleDataJob.start();
processUploadsJob.start();

console.log("Cron jobs started:");
console.log(
    "- Now-playing update (non-premium users): Every minute at 5s past",
);
console.log("- Now-playing update (premium users): Every 30 seconds");
console.log("- Stale data refetch: Every hour at 15 minutes past");
console.log("- Process uploads: Every 20 minutes");

let shuttingDown = false;
async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Shutting down...");
    nowPlayingStandardUsersJob.stop();
    nowPlayingPremiumUsersJob.stop();
    refetchStaleDataJob.stop();
    processUploadsJob.stop();
    // Flush queued telemetry (bounded wait) before exiting.
    await shutdownTelemetry();
    process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
