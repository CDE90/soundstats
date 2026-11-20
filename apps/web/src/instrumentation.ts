import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Instrumentation } from "next";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./instrumentation.node");
    }
}

// No-ops until instrumentation.node.ts registers an SDK.
const requestErrors = metrics
    .getMeter("@soundstats/web")
    .createCounter("soundstats.web.request_errors", {
        description:
            "Server errors captured by Next.js, by route template and type",
    });

export const onRequestError: Instrumentation.onRequestError = (
    error,
    request,
    context,
) => {
    // Route templates only: request.path can contain IDs.
    requestErrors.add(1, {
        route: context.routePath,
        route_type: context.routeType,
        method: request.method,
    });

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
