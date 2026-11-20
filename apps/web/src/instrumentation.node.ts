/**
 * OpenTelemetry for the web app (Node.js runtime only; see instrumentation.ts).
 *
 * Disabled unless SOUNDSTATS_OTEL_ENABLED=1. Next.js emits its own spans for
 * requests, rendering, route handlers and fetch once a tracer provider is
 * registered. The exporters read OTEL_EXPORTER_OTLP_ENDPOINT and
 * OTEL_EXPORTER_OTLP_HEADERS and queue in the background with bounded memory.
 */
import { randomUUID } from "node:crypto";
import {
    SamplingDecision,
    type Attributes,
    type Context,
    type Link,
    type SpanKind,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { hostDetector, resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
    AlwaysOnSampler,
    ParentBasedSampler,
    type Sampler,
    type SamplingResult,
} from "@opentelemetry/sdk-trace";
import { SanitizingSpanExporter } from "@soundstats/telemetry";
import {
    ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
    ATTR_SERVICE_INSTANCE_ID,
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_NAMESPACE,
    ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * Requests that add volume without telling us anything: container health
 * checks, the PostHog proxy and static assets.
 */
const UNTRACED_PATHS =
    /^\/(api\/health(\/|$|\?)|ingest(\/|$|\?)|_next\/static\/)/;

class WebRootSampler implements Sampler {
    private readonly always: Sampler = new AlwaysOnSampler();

    shouldSample(
        context: Context,
        traceId: string,
        spanName: string,
        spanKind: SpanKind,
        attributes: Attributes,
        links: Link[],
    ): SamplingResult {
        const target = attributes["http.target"];
        if (typeof target === "string" && UNTRACED_PATHS.test(target)) {
            return { decision: SamplingDecision.NOT_RECORD };
        }
        return this.always.shouldSample(
            context,
            traceId,
            spanName,
            spanKind,
            attributes,
            links,
        );
    }

    toString() {
        return "WebRootSampler";
    }
}

if (process.env.SOUNDSTATS_OTEL_ENABLED === "1") {
    try {
        const sdk = new NodeSDK({
            resource: resourceFromAttributes({
                [ATTR_SERVICE_NAME]: "soundstats-web",
                [ATTR_SERVICE_NAMESPACE]: "soundstats",
                [ATTR_SERVICE_VERSION]: process.env.SOURCE_COMMIT ?? "unknown",
                [ATTR_SERVICE_INSTANCE_ID]: randomUUID(),
                [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]:
                    process.env.SOUNDSTATS_OTEL_ENVIRONMENT ??
                    process.env.NODE_ENV ??
                    "development",
            }),
            // No envDetector: OTEL_SERVICE_NAME / OTEL_RESOURCE_ATTRIBUTES would
            // override the identity above, and this stack is shared with other
            // projects. serviceName is applied last and always wins.
            resourceDetectors: [hostDetector],
            serviceName: "soundstats-web",
            sampler: new ParentBasedSampler({ root: new WebRootSampler() }),
            // No context propagation: an incoming traceparent from any client
            // would otherwise force or suppress sampling (and pick the trace
            // ID), and outgoing calls to third parties don't need ours.
            textMapPropagator: null,
            // No OTel logs until there is a log sanitizer; without this the
            // SDK installs an OTLP log exporter that would bypass it.
            logRecordProcessors: [],
            // Strips raw request targets, query strings, IDs in URLs and
            // exception messages; templates Next.js fetch span names.
            traceExporter: new SanitizingSpanExporter(new OTLPTraceExporter()),
            metricReaders: [
                new PeriodicExportingMetricReader({
                    exporter: new OTLPMetricExporter(),
                    exportIntervalMillis: 30_000,
                }),
            ],
            instrumentations: [new RuntimeNodeInstrumentation()],
        });
        sdk.start();
        console.log("OpenTelemetry export enabled");
    } catch (error) {
        console.warn(
            "OpenTelemetry could not start; continuing without it:",
            error instanceof Error ? error.message : error,
        );
    }
}
