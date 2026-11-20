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

test("real SDK spans are sanitized end to end", async () => {
    const { InMemorySpanExporter, SimpleSpanProcessor, TracerProvider } =
        await import("@opentelemetry/sdk-trace");
    const { SanitizingSpanExporter } = await import("../dist/index.js");
    const memory = new InMemorySpanExporter();
    const provider = new TracerProvider({
        spanProcessors: [
            new SimpleSpanProcessor({
                exporter: new SanitizingSpanExporter(memory),
            }),
        ],
    });
    const tracer = provider.getTracer("test");

    const url =
        "https://api.spotify.com/v1/tracks?ids=4uLU6hMCjMI75M1A2tKUQC,0LVvhiu2lMVTFyGdW0MrqG";
    const fetchSpan = tracer.startSpan(`fetch GET ${url}`, {
        attributes: {
            "http.url": url,
            "next.span_name": `fetch GET ${url}`,
            "net.peer.name": "api.spotify.com",
        },
    });
    const error = new Error(
        "Failed query: insert\nparams: user_2poZy,4uLU6hMC",
    );
    error.name = "DrizzleQueryError";
    fetchSpan.recordException(error);
    fetchSpan.setStatus({ code: 2, message: error.message });
    fetchSpan.end();

    const requestSpan = tracer.startSpan("GET", {
        attributes: { "http.target": "/invite/SECRETCODE123abc?token=x" },
    });
    requestSpan.setAttribute("next.route", "/invite/[code]");
    requestSpan.updateName("GET /invite/[code]");
    requestSpan.end();

    await provider.forceFlush();
    const [cleanFetch, cleanRequest] = memory.getFinishedSpans();
    const exported = JSON.stringify(
        memory.getFinishedSpans().map((span) => ({
            name: span.name,
            attributes: span.attributes,
            events: span.events,
            status: span.status,
        })),
    );
    for (const secret of [
        "4uLU6hMC",
        "0LVvhiu2",
        "user_2poZy",
        "SECRETCODE",
        "token=x",
        "Failed query",
    ]) {
        assert.equal(exported.includes(secret), false, `${secret} leaked`);
    }
    assert.equal(
        cleanFetch.name,
        "fetch GET https://api.spotify.com/v1/tracks",
    );
    assert.equal(
        cleanFetch.attributes["next.span_name"],
        "fetch GET https://api.spotify.com/v1/tracks",
    );
    assert.equal(
        cleanFetch.events[0].attributes["exception.type"],
        "DrizzleQueryError",
    );
    assert.equal(cleanFetch.spanContext().traceId.length, 32);
    assert.equal(cleanRequest.attributes["http.target"], "/invite/[code]");
    await provider.shutdown();
});
