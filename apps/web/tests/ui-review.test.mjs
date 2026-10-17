import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Render the real components in Node without requiring a running Next server.
// CSS is irrelevant here; assertions cover destinations and accessible labels.
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.endsWith(".module.css")) {
            return {
                url: "data:text/javascript,export default {}",
                shortCircuit: true,
            };
        }
        if (specifier.startsWith("@/")) {
            const file = new URL(
                `../src/${specifier.slice(2)}`,
                import.meta.url,
            );
            specifier =
                [".ts", ".tsx"]
                    .map((extension) => `${file.href}${extension}`)
                    .find((url) => existsSync(new URL(url))) ?? file.href;
        }
        if (specifier === "next/link" || specifier === "next/image") {
            const resolved = nextResolve(`${specifier}.js`, context);
            return {
                url: `data:text/javascript,${encodeURIComponent(`import value from ${JSON.stringify(resolved.url)}; export default value.default ?? value;`)}`,
                shortCircuit: true,
            };
        }
        return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
        if (url.startsWith("file:") && url.endsWith(".tsx")) {
            const { outputText } = ts.transpileModule(
                readFileSync(new URL(url), "utf8"),
                {
                    compilerOptions: {
                        jsx: ts.JsxEmit.ReactJSX,
                        module: ts.ModuleKind.ESNext,
                    },
                },
            );
            return { format: "module", source: outputText, shortCircuit: true };
        }
        return nextLoad(url, context);
    },
});
const { CurrentListenerTrack } =
    await import("../src/app/feed/current-listener-track.tsx");
const { ListeningChange } =
    await import("../src/components/listening-change.tsx");
hooks.deregister();

const track = {
    userId: "friend&1",
    song: "Local song",
    artist: "Local artist",
    albumImage: "/design-artwork/blonde.jpg",
};

test("local tracks retain artwork and metadata without internal or Spotify links", () => {
    for (const trackId of [null, undefined, ""]) {
        const html = renderToStaticMarkup(
            createElement(CurrentListenerTrack, { ...track, trackId }),
        );
        assert.match(html, /Local song/);
        assert.match(html, /Local artist/);
        assert.match(html, /<img /);
        assert.doesNotMatch(html, /<a\b/);
        assert.doesNotMatch(html, /\/tracks\/null|\/track\/null|undefined/);
    }
});

test("Spotify tracks retain separate internal and external destinations for the listener", () => {
    const html = renderToStaticMarkup(
        createElement(CurrentListenerTrack, { ...track, trackId: "track/1" }),
    );
    assert.match(html, /href="\/tracks\/track%2F1\?user=friend%261"/);
    assert.match(html, /href="https:\/\/open.spotify.com\/track\/track%2F1"/);
    assert.equal((html.match(/<a\b/g) ?? []).length, 2);
    assert.match(html, /target="_blank"/);
});

test("zero percentage changes have grammatical labels without changing rank labels", () => {
    for (const unit of ["plays", "listening time"]) {
        const html = renderToStaticMarkup(
            createElement(ListeningChange, { value: 0, unit }),
        );
        assert.match(
            html,
            new RegExp(`aria-label="Same ${unit} as the previous period"`),
        );
        assert.match(html, /0\.0%/);
    }
    const rank = renderToStaticMarkup(
        createElement(ListeningChange, { value: 0, rank: true }),
    );
    assert.match(rank, /aria-label="Same rank as previous period"/);
    for (const [value, direction] of [
        [5, "more"],
        [-5, "less"],
    ]) {
        const html = renderToStaticMarkup(
            createElement(ListeningChange, { value }),
        );
        assert.match(
            html,
            new RegExp(
                `aria-label="5.0% ${direction} plays than the previous period"`,
            ),
        );
    }
});

test("preview seeding fails before connecting when DATABASE_URL is missing or blank", () => {
    for (const databaseUrl of [undefined, "", "   "]) {
        const result = spawnSync(
            process.execPath,
            [
                fileURLToPath(
                    new URL(
                        "../scripts/seed-preview-history.mjs",
                        import.meta.url,
                    ),
                ),
                "--user",
                "user_test",
            ],
            {
                env: {
                    PGHOST: "127.0.0.1",
                    PGPORT: "1",
                    ...(databaseUrl === undefined
                        ? {}
                        : { DATABASE_URL: databaseUrl }),
                },
                encoding: "utf8",
                timeout: 2000,
            },
        );
        assert.equal(result.error, undefined);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /DATABASE_URL is not set/);
        assert.doesNotMatch(result.stderr, /ECONNREFUSED|timeout/i);
    }
});
