import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { constants } from "node:os";
import { reportMigrationError, runMigrations } from "./migrate.mjs";

const args = process.argv.slice(2);
const separator = args.indexOf("--");
const options = args.slice(0, separator);
const command = args.slice(separator + 1);
const envKind = options[1];
const mode = options[3];
if (
    separator !== 4 ||
    options[0] !== "--env" ||
    options[2] !== "--mode" ||
    !["next", "dotenv"].includes(envKind) ||
    !["development", "production"].includes(mode) ||
    !command.length
) {
    console.error(
        "Usage: start.mjs --env next|dotenv --mode development|production -- command [args...]",
    );
    process.exit(1);
}

const controller = new AbortController();
let child;
let stoppedBy;
const stop = (signal) => {
    stoppedBy = signal;
    if (child) child.kill(signal);
    else controller.abort();
};
const onInterrupt = () => stop("SIGINT");
const onTerminate = () => stop("SIGTERM");
process.on("SIGINT", onInterrupt);
process.on("SIGTERM", onTerminate);

try {
    const appRequire = createRequire(join(process.cwd(), "package.json"));
    if (envKind === "next") {
        // Resolve Next's own runtime dependency, even with pnpm's strict layout.
        process.env.NODE_ENV ??= mode;
        const nextRequire = createRequire(
            appRequire.resolve("next/package.json"),
        );
        nextRequire("@next/env").loadEnvConfig(
            process.cwd(),
            mode === "development",
        );
    } else {
        // Same cwd/.env and existing-environment precedence as service/src/env.ts.
        appRequire("dotenv").config({ quiet: true });
    }
    const applied = await runMigrations({ signal: controller.signal });
    console.log(
        `[database] Ready (${applied} migration${applied === 1 ? "" : "s"} applied). Starting application.`,
    );
    controller.signal.throwIfAborted();
    child = spawn(command[0], command.slice(1), {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
    });
    const result = await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    process.exitCode =
        stoppedBy || result.signal
            ? 128 + constants.signals[stoppedBy ?? result.signal]
            : (result.code ?? 1);
} catch (error) {
    if (stoppedBy) process.exitCode = 128 + constants.signals[stoppedBy];
    else {
        reportMigrationError(error);
        process.exitCode = 1;
    }
} finally {
    process.removeListener("SIGINT", onInterrupt);
    process.removeListener("SIGTERM", onTerminate);
}
