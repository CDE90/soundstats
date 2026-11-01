import type * as schema from "@soundstats/database";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type ReportingDatabase = Pick<
    PostgresJsDatabase<typeof schema>,
    "select" | "selectDistinct" | "$with" | "with"
>;

/** Read a complete report from one committed version of listening history. */
export function readReportingSnapshot<T>(
    database: PostgresJsDatabase<typeof schema>,
    read: (snapshot: ReportingDatabase) => Promise<T>,
) {
    return database.transaction(
        async (snapshot) => {
            // These interactive aggregates finish faster without per-request LLVM
            // compilation. Keep this local to the report, never the shared connection.
            await snapshot.execute(sql`SET LOCAL jit = off`);
            return read(snapshot);
        },
        {
            isolationLevel: "repeatable read",
            accessMode: "read only",
        },
    );
}
