import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
    cp,
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    rm,
    symlink,
    writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { migrationsFolder, runMigrations } from "../runtime/migrate.mjs";

const packageDir = fileURLToPath(new URL("../", import.meta.url));
const rootDir = fileURLToPath(new URL("../../../", import.meta.url));
const startup = join(packageDir, "runtime/start.mjs");
const suppliedUrl = process.env.TEST_DATABASE_URL;
const integration = suppliedUrl ? test : test.skip;
let admin;
let sql;
let databaseUrl;
let temporary;
let appDir;
const databaseName = `startup_test_${process.pid}`;

function cleanEnv(extra = {}) {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (
            key.startsWith("__NEXT") ||
            key.startsWith("STARTUP_") ||
            ["DATABASE_URL", "NODE_ENV", "DOTENV_CONFIG_PATH"].includes(key)
        )
            delete env[key];
    }
    return { ...env, ...extra };
}

function launch({
    script = startup,
    cwd = appDir,
    kind = "dotenv",
    mode = "production",
    env = {},
    code,
    args = [],
} = {}) {
    const child = spawn(
        process.execPath,
        [
            script,
            "--env",
            kind,
            "--mode",
            mode,
            "--",
            process.execPath,
            "--input-type=module",
            "-e",
            code ?? "console.log('CHILD_STARTED')",
            "--",
            ...args,
        ],
        {
            cwd,
            env: cleanEnv({ DATABASE_URL: databaseUrl, ...env }),
            stdio: ["ignore", "pipe", "pipe"],
        },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
        stdout += data;
    });
    child.stderr.on("data", (data) => {
        stderr += data;
    });
    const done = once(child, "close").then(([code, signal]) => ({
        code,
        signal,
        stdout,
        stderr,
    }));
    return { child, done, output: () => stdout };
}

async function reset() {
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await sql`DROP TABLE IF EXISTS streaming_uploads CASCADE`;
    await sql`CREATE TABLE streaming_uploads (id serial PRIMARY KEY, filename text NOT NULL)`;
    await sql`INSERT INTO streaming_uploads (filename) VALUES ('preserved.json')`;
}

async function runtimeCopy(name, extraSql) {
    const target = join(temporary, name);
    await mkdir(target);
    await writeFile(
        join(target, "package.json"),
        JSON.stringify({ type: "module" }),
    );
    await cp(join(packageDir, "runtime"), join(target, "runtime"), {
        recursive: true,
    });
    await cp(migrationsFolder, join(target, "drizzle"), { recursive: true });
    await mkdir(join(target, "node_modules"));
    // Production dependency layout intentionally excludes drizzle-kit and source/dist.
    for (const dependency of ["postgres", "drizzle-orm"]) {
        const dependencyDir = await realpath(
            join(packageDir, "node_modules", dependency),
        );
        await symlink(dependencyDir, join(target, "node_modules", dependency));
    }
    if (extraSql) {
        await writeFile(
            join(target, "drizzle/0001_startup_fixture.sql"),
            extraSql,
        );
        const journalPath = join(target, "drizzle/meta/_journal.json");
        const journal = JSON.parse(await readFile(journalPath, "utf8"));
        journal.entries.push({
            idx: 1,
            version: "7",
            when: journal.entries[0].when + 1,
            tag: "0001_startup_fixture",
            breakpoints: true,
        });
        await writeFile(journalPath, JSON.stringify(journal));
    }
    return join(target, "runtime/start.mjs");
}

before(async () => {
    if (!suppliedUrl) return;
    const parsed = new URL(suppliedUrl);
    assert.ok(
        ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname),
        "Tests require disposable local PostgreSQL",
    );
    admin = postgres(suppliedUrl, { max: 1, onnotice: () => {} });
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    parsed.pathname = `/${databaseName}`;
    databaseUrl = parsed.href;
    sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
    temporary = await mkdtemp(join(tmpdir(), "soundstats-startup-"));
    appDir = join(temporary, "app");
    await mkdir(join(appDir, "node_modules"), { recursive: true });
    await writeFile(
        join(appDir, "package.json"),
        JSON.stringify({ type: "module" }),
    );
    for (const [dependency, source] of [
        ["next", "apps/web"],
        ["dotenv", "apps/service"],
    ]) {
        const appRequire = createRequire(join(rootDir, source, "package.json"));
        await symlink(
            dirname(appRequire.resolve(`${dependency}/package.json`)),
            join(appDir, "node_modules", dependency),
        );
    }
});

after(async () => {
    await sql?.end({ timeout: 1 });
    if (admin) {
        await admin`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${databaseName}`;
        await admin`DROP DATABASE IF EXISTS ${admin(databaseName)}`;
        await admin.end({ timeout: 1 });
    }
    if (temporary) await rm(temporary, { recursive: true, force: true });
});

integration(
    "registered additive migration is persistent, preserves data, and applies once",
    async () => {
        await reset();
        assert.equal(await runMigrations({ databaseUrl }), 1);
        assert.equal(await runMigrations({ databaseUrl }), 0);
        const rows =
            await sql`SELECT filename, processing_started_at, imported_from, imported_to FROM streaming_uploads`;
        assert.equal(rows[0].filename, "preserved.json");
        assert.equal(rows[0].processing_started_at, null);
        assert.equal(
            (
                await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
            )[0].count,
            1,
        );
    },
);

integration(
    "concurrent real startup wrappers serialize migration and start only after completion",
    async () => {
        await reset();
        const script = await runtimeCopy(
            "concurrent",
            "SELECT pg_sleep(0.3);\n--> statement-breakpoint\nCREATE TABLE startup_once (id integer);",
        );
        const [first, second] = await Promise.all([
            launch({ script }).done,
            launch({ script }).done,
        ]);
        for (const result of [first, second]) {
            assert.equal(result.code, 0, result.stderr);
            assert.match(
                result.stdout,
                /Ready.*Starting application[\s\S]*CHILD_STARTED/,
            );
        }
        assert.deepEqual(
            [first, second]
                .map((result) =>
                    Number(result.stdout.match(/Ready \((\d+)/)[1]),
                )
                .sort(),
            [0, 2],
        );
        assert.equal(
            (
                await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
            )[0].count,
            2,
        );
        assert.ok(
            (await sql`SELECT to_regclass('startup_once') AS name`)[0].name,
        );
        await sql`DROP TABLE startup_once`;
    },
);

integration(
    "SQL failure rolls back every pending migration and prevents child launch",
    async () => {
        await reset();
        const script = await runtimeCopy(
            "failure",
            "ALTER TABLE streaming_uploads ADD COLUMN must_rollback text;\n--> statement-breakpoint\nSELECT startup_deliberately_missing_function();",
        );
        const result = await launch({ script }).done;
        assert.equal(result.code, 1);
        assert.doesNotMatch(result.stdout, /CHILD_STARTED/);
        assert.match(
            result.stderr,
            /Migration failed.*Application was not started/,
        );
        assert.doesNotMatch(result.stderr, /postgres:\/\//);
        const columns =
            await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'streaming_uploads' AND table_schema = 'public'`;
        assert.deepEqual(columns.map((row) => row.column_name).sort(), [
            "filename",
            "id",
        ]);
        assert.equal(
            (
                await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS journal`
            )[0].journal,
            null,
        );
    },
);

integration(
    "fresh schema failure gives explicit initialization instructions and blocks child",
    async () => {
        await reset();
        await sql`DROP TABLE streaming_uploads`;
        const result = await launch().done;
        assert.equal(result.code, 1);
        assert.match(
            result.stderr,
            /Initialize a fresh database explicitly with pnpm db:push/,
        );
        assert.doesNotMatch(result.stdout, /CHILD_STARTED/);
        assert.equal(
            (await sql`SELECT to_regclass('streaming_uploads') AS uploads`)[0]
                .uploads,
            null,
        );
    },
);

integration(
    "relocated production runtime resolves migration assets without drizzle-kit",
    async () => {
        await reset();
        const script = await runtimeCopy("production-runtime");
        const first = await launch({
            script,
            args: ["one argument", "--port", "4321"],
            code: "console.log(JSON.stringify(process.argv.slice(1))); process.exitCode = 7;",
        }).done;
        assert.equal(first.code, 7);
        assert.match(first.stdout, /Ready \(1 migration applied\)/);
        assert.match(first.stdout, /\["one argument","--port","4321"\]/);
        const second = await launch({ script }).done;
        assert.equal(second.code, 0, second.stderr);
        assert.match(second.stdout, /Ready \(0 migrations applied\)/);
    },
);

integration(
    "Next env precedence, expansion and development/production modes match the app",
    async () => {
        await reset();
        const files = {
            ".env": `DATABASE_URL=${databaseUrl}\nSTARTUP_VALUE=base\nSTARTUP_EXPANDED=$STARTUP_VALUE/end\n`,
            ".env.local": "STARTUP_VALUE=local\n",
            ".env.production": "STARTUP_VALUE=production\n",
            ".env.production.local": "STARTUP_VALUE=production-local\n",
            ".env.development.local": "STARTUP_VALUE=development-local\n",
        };
        for (const [name, contents] of Object.entries(files))
            await writeFile(join(appDir, name), contents);
        const code =
            "console.log('ENV=' + JSON.stringify([process.env.STARTUP_VALUE, process.env.STARTUP_EXPANDED, process.env.NODE_ENV]));";
        try {
            const production = await launch({
                kind: "next",
                env: { DATABASE_URL: undefined },
                code,
            }).done;
            assert.equal(production.code, 0, production.stderr);
            assert.match(
                production.stdout,
                /ENV=\["production-local","production-local\/end","production"\]/,
            );
            const development = await launch({
                kind: "next",
                mode: "development",
                env: { DATABASE_URL: undefined },
                code,
            }).done;
            assert.equal(development.code, 0, development.stderr);
            assert.match(
                development.stdout,
                /ENV=\["development-local","development-local\/end","development"\]/,
            );
            const inherited = await launch({
                kind: "next",
                env: { STARTUP_VALUE: "inherited" },
                code,
            }).done;
            assert.match(
                inherited.stdout,
                /ENV=\["inherited","inherited\/end","production"\]/,
            );
        } finally {
            for (const name of Object.keys(files)) await rm(join(appDir, name));
        }
    },
);

integration(
    "service dotenv reads cwd .env and preserves injected environment",
    async () => {
        await reset();
        await writeFile(
            join(appDir, ".env"),
            `DATABASE_URL=${databaseUrl}\nSTARTUP_VALUE=service-file\n`,
        );
        const code = "console.log('ENV=' + process.env.STARTUP_VALUE);";
        try {
            const local = await launch({
                env: { DATABASE_URL: undefined },
                code,
            }).done;
            assert.equal(local.code, 0, local.stderr);
            assert.match(local.stdout, /ENV=service-file/);
            const injected = await launch({
                env: { STARTUP_VALUE: "injected" },
                code,
            }).done;
            assert.equal(injected.code, 0, injected.stderr);
            assert.match(injected.stdout, /ENV=injected/);
        } finally {
            await rm(join(appDir, ".env"));
        }
    },
);

integration(
    "termination during migration rolls back, releases lock, and never spawns child",
    async () => {
        await reset();
        const script = await runtimeCopy(
            "interrupted",
            "ALTER TABLE streaming_uploads ADD COLUMN interrupted text;\n--> statement-breakpoint\nSELECT pg_sleep(20);",
        );
        const running = launch({ script });
        for (let attempt = 0; attempt < 100; attempt++) {
            const [row] =
                await sql`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND query LIKE '%pg_sleep(20)%' AND pid <> pg_backend_pid()`;
            if (row.count) break;
            await new Promise((resolve) => setTimeout(resolve, 30));
            if (attempt === 99)
                assert.fail("Migration did not enter expected wait");
        }
        const terminatedAt = Date.now();
        running.child.kill("SIGTERM");
        const result = await running.done;
        assert.ok(
            Date.now() - terminatedAt < 3_000,
            "Cancellation should not wait for the migration SQL to finish",
        );
        assert.equal(result.code, 143);
        assert.doesNotMatch(result.stdout, /CHILD_STARTED/);
        assert.equal(await runMigrations({ databaseUrl }), 1);
        const [row] =
            await sql`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name = 'streaming_uploads' AND column_name = 'interrupted'`;
        assert.equal(row.count, 0);
    },
);

integration(
    "wrapper forwards termination to child and preserves termination exit status",
    async () => {
        await reset();
        const marker = join(temporary, "terminated.txt");
        const running = launch({
            code: `import { writeFileSync } from 'node:fs'; process.on('SIGTERM', () => { writeFileSync(${JSON.stringify(marker)}, 'received'); process.exit(0); }); console.log('CHILD_WAITING'); setInterval(() => {}, 1000);`,
        });
        for (
            let attempt = 0;
            attempt < 100 && !running.output().includes("CHILD_WAITING");
            attempt++
        ) {
            await new Promise((resolve) => setTimeout(resolve, 30));
        }
        assert.match(running.output(), /CHILD_WAITING/);
        running.child.kill("SIGTERM");
        assert.equal((await running.done).code, 143);
        assert.equal(await readFile(marker, "utf8"), "received");
    },
);
