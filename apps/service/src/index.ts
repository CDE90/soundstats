import { CronJob } from "cron";
import { updateNowPlaying } from "./tasks/update-now-playing.js";
import { refetchStaleData } from "./tasks/refetch-stale-data.js";
import { processUploads } from "./tasks/process-uploads.js";

console.log("Starting SoundStats service...");

// Now-playing update jobs
// Every minute at 5 seconds past: non-premium users only
const nowPlayingStandardUsersJob = new CronJob(
    "5 * * * * *", // Every minute at 5 seconds past
    () => updateNowPlaying(false),
    null,
    false,
    "Europe/London",
);

// Every 30 seconds: premium users only
const nowPlayingPremiumUsersJob = new CronJob(
    "0,30 * * * * *", // Every minute at 0 and 30 seconds past
    () => updateNowPlaying(true),
    null,
    false,
    "Europe/London",
);

// Refetch stale data every hour at 15 minutes past the hour
const refetchStaleDataJob = new CronJob(
    "15 * * * *", // Every hour at 15 minutes past
    refetchStaleData,
    null,
    false,
    "Europe/London",
);

// Process uploads every hour at 45 minutes past the hour
const processUploadsJob = new CronJob(
    "45 * * * *", // Every hour at 45 minutes past
    processUploads,
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
console.log("- Process uploads: Every hour at 45 minutes past");

// Keep the process alive
process.on("SIGINT", () => {
    console.log("Shutting down...");
    nowPlayingStandardUsersJob.stop();
    nowPlayingPremiumUsersJob.stop();
    refetchStaleDataJob.stop();
    processUploadsJob.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("Shutting down...");
    nowPlayingStandardUsersJob.stop();
    nowPlayingPremiumUsersJob.stop();
    refetchStaleDataJob.stop();
    processUploadsJob.stop();
    process.exit(0);
});
