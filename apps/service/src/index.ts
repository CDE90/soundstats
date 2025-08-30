import { CronJob } from "cron";
import { updateNowPlaying } from "./tasks/update-now-playing";
import { refetchStaleData } from "./tasks/refetch-stale-data";
import { processUploads } from "./tasks/process-uploads";

console.log("Starting SoundStats service...");

// Now-playing update jobs
// Every minute: both premium and non-premium users
const nowPlayingAllUsersJob = new CronJob(
    "* * * * *", // Every minute
    () => updateNowPlaying(false),
    null,
    false,
    "Europe/London",
);

// Every minute at 20 seconds past: premium users only
const nowPlayingPremiumUsersJob1 = new CronJob(
    "20 * * * * *", // Every minute at 20 seconds past
    () => updateNowPlaying(true),
    null,
    false,
    "Europe/London",
);

// Every minute at 40 seconds past: premium users only
const nowPlayingPremiumUsersJob2 = new CronJob(
    "40 * * * * *", // Every minute at 40 seconds past
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
nowPlayingAllUsersJob.start();
nowPlayingPremiumUsersJob1.start();
nowPlayingPremiumUsersJob2.start();
refetchStaleDataJob.start();
processUploadsJob.start();

console.log("Cron jobs started:");
console.log("- Now-playing update (all users): Every minute");
console.log(
    "- Now-playing update (premium users): Every minute at 20s and 40s past",
);
console.log("- Stale data refetch: Every hour at 15 minutes past");
console.log("- Process uploads: Every hour at 45 minutes past");

// Keep the process alive
process.on("SIGINT", () => {
    console.log("Shutting down...");
    nowPlayingAllUsersJob.stop();
    nowPlayingPremiumUsersJob1.stop();
    nowPlayingPremiumUsersJob2.stop();
    refetchStaleDataJob.stop();
    processUploadsJob.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("Shutting down...");
    nowPlayingAllUsersJob.stop();
    nowPlayingPremiumUsersJob1.stop();
    nowPlayingPremiumUsersJob2.stop();
    refetchStaleDataJob.stop();
    processUploadsJob.stop();
    process.exit(0);
});
