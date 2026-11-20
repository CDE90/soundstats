import assert from "node:assert/strict";
import test from "node:test";
import {
    sanitizeAttributes,
    sanitizeSpan,
    sanitizeSpanName,
    sanitizeUrl,
    templatePath,
} from "../dist/index.js";

test("ID-like path segments are templated; ordinary words are kept", () => {
    assert.equal(
        templatePath("/v1/me/player/currently-playing"),
        "/v1/me/player/currently-playing",
    );
    assert.equal(
        templatePath("/v1/tracks/4uLU6hMCjMI75M1A2tKUQC"),
        "/v1/tracks/{id}",
    );
    assert.equal(
        templatePath(
            "/v1/users/user_2poZytLemXmArRRV9VoRHAquY7c/oauth_access_tokens/oauth_spotify",
        ),
        "/v1/users/{id}/oauth_access_tokens/oauth_spotify",
    );
    assert.equal(
        templatePath("/f/JWlz36A1MT27nD2vQYhW2osOXuQbgphk19r3ZRd64qxnyjFA"),
        "/f/{id}",
    );
});

test("URLs lose query strings and IDs", () => {
    assert.equal(
        sanitizeUrl(
            "https://api.spotify.com/v1/tracks?ids=4uLU6hMCjMI75M1A2tKUQC,0LVvhiu2lMVTFyGdW0MrqG",
        ),
        "https://api.spotify.com/v1/tracks",
    );
    assert.equal(sanitizeUrl("not a url"), "{invalid-url}");
});

test("Next.js fetch span names are templated", () => {
    assert.equal(
        sanitizeSpanName(
            "fetch GET https://api.spotify.com/v1/artists/0TnOYISbd1XYRBk9myaseg?market=GB",
        ),
        "fetch GET https://api.spotify.com/v1/artists/{id}",
    );
    assert.equal(sanitizeSpanName("GET /invite/[code]"), "GET /invite/[code]");
});

test("raw request targets are replaced by the route or dropped", () => {
    assert.deepEqual(
        sanitizeAttributes({
            "http.target": "/invite/SECRETCODE123?x=1",
            "next.route": "/invite/[code]",
        }),
        { "http.target": "/invite/[code]", "next.route": "/invite/[code]" },
    );
    assert.deepEqual(
        sanitizeAttributes({ "http.target": "/invite/SECRETCODE123" }),
        {},
    );
    assert.deepEqual(
        sanitizeAttributes({
            "url.full": "https://utfs.io/f/abcDEF123456789xyzABC000?sig=1",
            "url.query": "sig=1",
        }),
        { "url.full": "https://utfs.io/f/{id}" },
    );
});

test("exception messages and status messages are dropped, frames kept", () => {
    const span = {
        name: "poll.user",
        attributes: {},
        status: {
            code: 2,
            message: "Failed query: insert ... params: user_123,track",
        },
        events: [
            {
                name: "exception",
                time: [0, 0],
                attributes: {
                    "exception.type": "DrizzleQueryError",
                    "exception.message":
                        "Failed query: insert ... params: user_123,track",
                    "exception.stacktrace":
                        "DrizzleQueryError: Failed query: insert ... params: user_123\n    at recordListen (file.js:1:1)",
                },
            },
        ],
        spanContext: () => ({ traceId: "t", spanId: "s", traceFlags: 1 }),
    };
    const clean = sanitizeSpan(span);
    assert.deepEqual(clean.status, { code: 2 });
    assert.deepEqual(clean.events[0].attributes, {
        "exception.type": "DrizzleQueryError",
        "exception.stacktrace": "    at recordListen (file.js:1:1)",
    });
    assert.equal(clean.spanContext().spanId, "s");
    assert.equal(JSON.stringify(clean.events).includes("user_123"), false);
});
