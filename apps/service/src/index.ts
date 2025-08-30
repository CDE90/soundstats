import { CronJob } from "cron";
import { syncSpotifyData } from "./tasks/spotify-sync";

console.log("Starting SoundStats service...");

// Sync Spotify data every 5 minutes
const spotifySyncJob = new CronJob(
  "*/5 * * * *", // Every 5 minutes
  syncSpotifyData,
  null,
  false,
  "America/New_York"
);

// Start the cron jobs
spotifySyncJob.start();

console.log("Cron jobs started:");
console.log("- Spotify sync: Every 5 minutes");

// Keep the process alive
process.on("SIGINT", () => {
  console.log("Shutting down...");
  spotifySyncJob.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  spotifySyncJob.stop();
  process.exit(0);
});
