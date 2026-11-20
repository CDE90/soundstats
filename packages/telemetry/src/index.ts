/**
 * Privacy and cardinality guards applied to every span before it leaves the
 * process. Shared by the web app and the worker.
 *
 * - URLs lose their query string, and ID-like path segments become `{id}`.
 *   Spotify IDs, Clerk user IDs and UploadThing file keys never leave the
 *   process in URLs.
 * - Next.js puts the raw request URL in `http.target` (for example
 *   `/invite/<code>`). It is replaced by the route template, or dropped.
 * - Next.js names fetch spans `fetch GET <full URL>`. The URL in the name is
 *   templated too, because span names become spanmetrics series.
 * - Exception events keep their type and stack frames but lose the message,
 *   which can contain SQL parameters (Drizzle) or user data. Span status
 *   messages are dropped for the same reason.
 */
import type { Attributes } from "@opentelemetry/api";
import type { ExportResult } from "@opentelemetry/core";
import type {
    ReadableSpan,
    SpanExporter,
    TimedEvent,
} from "@opentelemetry/sdk-trace";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const TOKEN_LIKE = /^[A-Za-z0-9_-]+$/;

function isIdSegment(segment: string) {
    if (SPOTIFY_ID.test(segment)) return true;
    if (!TOKEN_LIKE.test(segment)) return false;
    // Long random keys, or anything mixing letters and digits at length.
    return segment.length >= 24 || (segment.length >= 12 && /\d/.test(segment));
}

/** Replaces ID-like path segments with `{id}`. */
export function templatePath(path: string) {
    return path
        .split("/")
        .map((segment) => (isIdSegment(segment) ? "{id}" : segment))
        .join("/");
}

/** Origin plus templated path; no query string or fragment. */
export function sanitizeUrl(raw: string) {
    try {
        const url = new URL(raw);
        return `${url.origin}${templatePath(url.pathname)}`;
    } catch {
        return "{invalid-url}";
    }
}

const URL_ATTRIBUTES = ["url.full", "http.url"];
const QUERY_ATTRIBUTES = ["url.query", "http.query"];

export function sanitizeAttributes(attributes: Attributes): Attributes {
    const result: Attributes = { ...attributes };
    for (const key of URL_ATTRIBUTES) {
        const value = result[key];
        if (typeof value === "string") result[key] = sanitizeUrl(value);
    }
    for (const key of QUERY_ATTRIBUTES) delete result[key];
    if (typeof result["url.path"] === "string") {
        result["url.path"] = templatePath(result["url.path"]);
    }
    if ("http.target" in result) {
        const route = result["http.route"] ?? result["next.route"];
        if (typeof route === "string") result["http.target"] = route;
        else delete result["http.target"];
    }
    return result;
}

export function sanitizeSpanName(name: string) {
    // Next.js fetch spans: "fetch GET https://host/path?query".
    const match = /^fetch (\S+) (\S+)$/.exec(name);
    if (match) return `fetch ${match[1]} ${sanitizeUrl(match[2]!)}`;
    return name;
}

function sanitizeEvent(event: TimedEvent): TimedEvent {
    if (event.name !== "exception" || !event.attributes) return event;
    const attributes = { ...event.attributes };
    delete attributes["exception.message"];
    const stack = attributes["exception.stacktrace"];
    if (typeof stack === "string") {
        // Keep only the frames; the first line repeats the message.
        attributes["exception.stacktrace"] = stack
            .split("\n")
            .filter((line) => line.trimStart().startsWith("at "))
            .join("\n");
    }
    return { ...event, attributes };
}

export function sanitizeSpan(span: ReadableSpan): ReadableSpan {
    return Object.create(span, {
        name: { value: sanitizeSpanName(span.name), enumerable: true },
        attributes: {
            value: sanitizeAttributes(span.attributes),
            enumerable: true,
        },
        events: { value: span.events.map(sanitizeEvent), enumerable: true },
        status: { value: { code: span.status.code }, enumerable: true },
    }) as ReadableSpan;
}

/** Wraps an exporter so every span is sanitized before export. */
export class SanitizingSpanExporter implements SpanExporter {
    constructor(private readonly inner: SpanExporter) {}

    export(
        spans: ReadableSpan[],
        resultCallback: (result: ExportResult) => void,
    ) {
        this.inner.export(spans.map(sanitizeSpan), resultCallback);
    }

    shutdown() {
        return this.inner.shutdown();
    }

    forceFlush() {
        return this.inner.forceFlush?.() ?? Promise.resolve();
    }
}
