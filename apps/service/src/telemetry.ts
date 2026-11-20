/**
 * OpenTelemetry for the worker. Imported first by index.ts so the SDK is
 * registered before any other module creates instruments or spans.
 *
 * Disabled unless SOUNDSTATS_OTEL_ENABLED=1. The exporters read the standard
 * OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS variables. Export
 * happens in the background with bounded queues: a slow or unreachable
 * collector drops telemetry and never blocks polling.
 */
import { randomUUID } from "node:crypto";
import type {
    Attributes,
    Context,
    Link,
    Span,
    SpanKind,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import {
    envDetector,
    hostDetector,
    resourceFromAttributes,
} from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
    AlwaysOnSampler,
    ParentBasedSampler,
    TraceIdRatioBasedSampler,
    type Sampler,
    type SamplingResult,
} from "@opentelemetry/sdk-trace";
import {
    ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
    ATTR_SERVICE_INSTANCE_ID,
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_NAMESPACE,
    ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export const POLL_USER_SPAN = "poll.user";

/**
 * About 1,000 users are polled every minute, so per-user poll traces are
 * sampled (5% by default, SOUNDSTATS_WORKER_TRACE_RATIO). Run, import and
 * refetch traces are always kept. Metrics are recorded before sampling and
 * stay complete.
 */
class WorkerRootSampler implements Sampler {
    private readonly always: Sampler = new AlwaysOnSampler();
    private readonly pollUsers: Sampler;

    constructor(pollUserRatio: number) {
        this.pollUsers = new TraceIdRatioBasedSampler(pollUserRatio);
    }

    shouldSample(
        context: Context,
        traceId: string,
        spanName: string,
        spanKind: SpanKind,
        attributes: Attributes,
        links: Link[],
    ): SamplingResult {
        const sampler =
            spanName === POLL_USER_SPAN ? this.pollUsers : this.always;
        return sampler.shouldSample(
            context,
            traceId,
            spanName,
            spanKind,
            attributes,
            links,
        );
    }

    toString() {
        return `WorkerRootSampler{${this.pollUsers.toString()}}`;
    }
}

function traceRatio() {
    const value = Number(process.env.SOUNDSTATS_WORKER_TRACE_RATIO ?? "0.05");
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.05;
}

const UPLOADTHING_FILE_HOST = /(^|\.)(ufs\.sh|utfs\.io)$/;

/**
 * UploadThing file URLs give access to a user's uploaded listening history.
 * Keep the host on spans and drop the file key.
 */
function redactFileUrls(span: Span, request: { origin: string }) {
    let hostname: string;
    try {
        hostname = new URL(request.origin).hostname;
    } catch {
        return;
    }
    if (UPLOADTHING_FILE_HOST.test(hostname)) {
        span.setAttribute("url.full", `${request.origin}/{file}`);
        span.setAttribute("url.path", "/{file}");
    }
}

let sdk: NodeSDK | undefined;

if (process.env.SOUNDSTATS_OTEL_ENABLED === "1") {
    try {
        sdk = new NodeSDK({
            resource: resourceFromAttributes({
                [ATTR_SERVICE_NAME]: "soundstats-worker",
                [ATTR_SERVICE_NAMESPACE]: "soundstats",
                [ATTR_SERVICE_VERSION]: process.env.SOURCE_COMMIT ?? "unknown",
                [ATTR_SERVICE_INSTANCE_ID]: randomUUID(),
                [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]:
                    process.env.SOUNDSTATS_OTEL_ENVIRONMENT ??
                    process.env.NODE_ENV ??
                    "development",
            }),
            resourceDetectors: [envDetector, hostDetector],
            sampler: new ParentBasedSampler({
                root: new WorkerRootSampler(traceRatio()),
            }),
            traceExporter: new OTLPTraceExporter(),
            metricReaders: [
                new PeriodicExportingMetricReader({
                    exporter: new OTLPMetricExporter(),
                    exportIntervalMillis: 30_000,
                }),
            ],
            instrumentations: [
                // Global fetch: Spotify, Clerk and UploadThing calls.
                new UndiciInstrumentation({ requestHook: redactFileUrls }),
                new RuntimeNodeInstrumentation(),
            ],
        });
        sdk.start();
        console.log("OpenTelemetry export enabled");
    } catch (error) {
        sdk = undefined;
        console.warn(
            "OpenTelemetry could not start; continuing without it:",
            error instanceof Error ? error.message : error,
        );
    }
}

/** Flush and stop export, waiting at most timeoutMs. Never throws. */
export async function shutdownTelemetry(timeoutMs = 5_000) {
    if (!sdk) {
        return;
    }

    const current = sdk;
    sdk = undefined;
    let timer: NodeJS.Timeout | undefined;
    try {
        await Promise.race([
            current.shutdown(),
            new Promise((resolve) => {
                timer = setTimeout(resolve, timeoutMs);
            }),
        ]);
    } catch (error) {
        console.warn(
            "OpenTelemetry shutdown failed:",
            error instanceof Error ? error.message : error,
        );
    } finally {
        clearTimeout(timer);
    }
}
