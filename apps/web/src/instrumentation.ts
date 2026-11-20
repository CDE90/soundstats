import {
    metrics,
    SpanStatusCode,
    trace,
    type Counter,
} from "@opentelemetry/api";
import type { Instrumentation } from "next";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./instrumentation.node");
    }
}

// Created on first use: this module is evaluated before register() installs
// the SDK, and an instrument created then would stay a no-op for good.
let requestErrors: Counter | undefined;

export const onRequestError: Instrumentation.onRequestError = (
    error,
    request,
    context,
) => {
    requestErrors ??= metrics
        .getMeter("@soundstats/web")
        .createCounter("soundstats.web.request_errors", {
            description:
                "Server errors captured by Next.js, by route template and type",
        });
    // Route templates only: request.path can contain IDs.
    requestErrors.add(1, {
        route: context.routePath,
        route_type: context.routeType,
        method: request.method,
    });

    // The exporter drops exception messages; type, stack frames and the
    // React digest are enough to find the matching server log.
    const span = trace.getActiveSpan();
    if (span) {
        span.recordException(
            error instanceof Error ? error : new Error(String(error)),
        );
        span.setStatus({ code: SpanStatusCode.ERROR });
        const digest =
            typeof error === "object" && error !== null && "digest" in error
                ? String(error.digest)
                : undefined;
        if (digest) span.setAttribute("next.error.digest", digest);
    }
};
