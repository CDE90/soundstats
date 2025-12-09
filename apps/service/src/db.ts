import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env.js";
import * as schema from "@soundstats/database";

const client = postgres(env.DATABASE_URL, {
    // Disable parallel query execution to avoid shared memory issues on memory-constrained environments
    options: 'max_parallel_workers_per_gather=0',
});
export const db = drizzle(client, { schema });
