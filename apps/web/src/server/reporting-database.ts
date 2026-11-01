import type * as schema from "@soundstats/database";
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
    return database.transaction(read, {
        isolationLevel: "repeatable read",
        accessMode: "read only",
    });
}
