ALTER TABLE "streaming_uploads" ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "streaming_uploads" ADD COLUMN IF NOT EXISTS "imported_from" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "streaming_uploads" ADD COLUMN IF NOT EXISTS "imported_to" timestamp with time zone;
