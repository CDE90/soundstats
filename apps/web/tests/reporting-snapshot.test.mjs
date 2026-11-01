import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as query } from "drizzle-orm";
import { readReportingSnapshot } from "../src/server/reporting-database.ts";

const url = process.env.TEST_DATABASE_URL;
const reader = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
const writer = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
const database = reader ? drizzle(reader) : null;
const fixture = `reporting_snapshot_${process.pid}`;

before(async () => {
    if (!reader) return;
    await reader.unsafe(`CREATE SCHEMA "${fixture}"`);
    await reader.unsafe(`SET search_path TO "${fixture}"`);
    await writer.unsafe(`SET search_path TO "${fixture}"`);
    await writer`CREATE TABLE report_history (id integer PRIMARY KEY, seconds integer NOT NULL)`;
});

after(async () => {
    if (!reader) return;
    await reader.unsafe(`DROP SCHEMA IF EXISTS "${fixture}" CASCADE`);
    await Promise.all([reader.end(), writer.end()]);
});

async function total(snapshot) {
    const [result] = await snapshot
        .select({
            seconds: query`COALESCE(sum(seconds), 0)::integer`,
        })
        .from(query`report_history`);
    return result.seconds;
}

test(
    "one dashboard snapshot stays consistent during ingestion; subsequent reports see inserts, corrections and removals",
    { skip: !url },
    async () => {
        await writer`INSERT INTO report_history VALUES (1, 60)`;
        const first = await readReportingSnapshot(
            database,
            async (snapshot) => {
                const summary = await total(snapshot);
                // Simulate a worker commit between the summary and detail queries.
                await writer`INSERT INTO report_history VALUES (2, 120)`;
                const chart = await total(snapshot);
                return { summary, chart };
            },
        );
        assert.deepEqual(first, { summary: 60, chart: 60 });
        assert.equal(await readReportingSnapshot(database, total), 180);
        await writer`UPDATE report_history SET seconds = 30 WHERE id = 1`;
        assert.equal(await readReportingSnapshot(database, total), 150);
        await writer`DELETE FROM report_history`;
        assert.equal(await readReportingSnapshot(database, total), 0);
    },
);

test(
    "reporting snapshots reject writes and release the connection after failure",
    { skip: !url },
    async () => {
        await assert.rejects(
            readReportingSnapshot(database, (snapshot) =>
                snapshot.execute(query`DELETE FROM report_history`),
            ),
            (error) => error.cause?.code === "25006",
        );
        assert.equal(await readReportingSnapshot(database, total), 0);
    },
);

test(
    "the interactive report avoids JIT compilation without changing the connection default",
    { skip: !url },
    async () => {
        const [before] = await reader`SHOW jit`;
        const inside = await readReportingSnapshot(database, (snapshot) =>
            snapshot.execute(query`SHOW jit`),
        );
        assert.equal(inside[0].jit, "off");
        const [after] = await reader`SHOW jit`;
        assert.equal(after.jit, before.jit);
    },
);
