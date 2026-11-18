#!/usr/bin/env bash
# Production entrypoint (see nixpacks.toml).
#
# Runs database migrations once, then starts the web app and the background
# worker directly under this shell. This replaces `turbo run start`, which kept
# npm, turbo, two pnpm processes and two migration wrappers resident for the
# life of the container (~120 MB RAM plus ~300 MB swap) without doing any work.
#
# If either process exits, the other is stopped and the container exits with
# that status so Docker's restart policy brings both back together.
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NODE_ENV="${NODE_ENV:-production}"

node "$root/packages/database/runtime/migrate.mjs" || exit 1

pids=()
stop_children() {
    if ((${#pids[@]})); then
        kill -TERM "${pids[@]}" 2>/dev/null || true
    fi
}
trap stop_children TERM INT

(cd "$root/apps/service" && exec node dist/index.js) &
pids+=("$!")
(cd "$root/apps/web" && exec node_modules/.bin/next start) &
pids+=("$!")

# Returns when the first child exits, or early when a signal runs the trap.
wait -n
status=$?

stop_children
wait
exit "$status"
