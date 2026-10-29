"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { ImportJob } from "@/lib/import-history";
import { Button } from "@/components/ui/button";
import { retryImport } from "../actions";

function timestamp(value: string) {
    return new Date(value).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
    });
}

export function ImportHistory({
    jobs,
    loading,
    error,
    refresh,
}: {
    jobs: ImportJob[] | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}) {
    const [retrying, setRetrying] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    async function retry(id: string) {
        setRetrying(id);
        setActionMessage(null);
        try {
            const result = await retryImport(id);
            setActionMessage(
                "error" in result
                    ? (result.error ?? "This import couldn’t be queued.")
                    : "Import queued for another attempt. Processing runs periodically; you can safely leave this page.",
            );
            await refresh();
        } catch {
            setActionMessage("This import couldn’t be queued. Try again.");
        } finally {
            setRetrying(null);
        }
    }
    return (
        <section
            className="mt-10"
            aria-labelledby="import-history-heading"
            aria-busy={loading}
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="import-history-heading">Import history</h2>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => void refresh()}
                >
                    <RefreshCw
                        className={loading ? "animate-spin" : ""}
                        aria-hidden="true"
                    />{" "}
                    Refresh status
                </Button>
            </div>
            <p className="mb-5 text-sm leading-6 text-muted-foreground">
                Your latest 100 files. Status is saved to your account and
                refreshes every 30 seconds while processing is pending. Times
                are UTC.
            </p>
            {loading && !jobs && (
                <div
                    role="status"
                    className="rounded-lg border border-border p-6"
                >
                    <Loader2 className="mb-3 animate-spin" aria-hidden="true" />
                    Loading your import history…
                </div>
            )}
            {error && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                    {error} Use Refresh status to retry.
                </p>
            )}
            {actionMessage && (
                <p role="status" className="mb-4 text-sm leading-6">
                    {actionMessage}
                </p>
            )}
            {jobs?.length === 0 && !error && (
                <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No files uploaded yet. Choose your Spotify audio files above
                    to start an import.
                </p>
            )}
            {jobs && jobs.length > 0 && (
                <ul className="space-y-4" aria-label="Your import jobs">
                    {jobs.map((job) => (
                        <li key={job.id} className="ss-surface p-5 sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <h3 className="min-w-0 break-all text-base font-medium">
                                    {job.fileName}
                                </h3>
                                <span className="rounded-full bg-secondary px-3 py-1 text-sm capitalize">
                                    {job.state}
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Uploaded{" "}
                                <time dateTime={job.createdAt}>
                                    {timestamp(job.createdAt)}
                                </time>
                                {job.processedAt && (
                                    <>
                                        {" "}
                                        · Completed{" "}
                                        <time dateTime={job.processedAt}>
                                            {timestamp(job.processedAt)}
                                        </time>
                                    </>
                                )}
                                {job.processingStartedAt && (
                                    <>
                                        {" "}
                                        · Started{" "}
                                        <time
                                            dateTime={job.processingStartedAt}
                                        >
                                            {timestamp(job.processingStartedAt)}
                                        </time>
                                    </>
                                )}
                                {!job.processedAt &&
                                    job.updatedAt !== job.createdAt && (
                                        <>
                                            {" "}
                                            · Updated{" "}
                                            <time dateTime={job.updatedAt}>
                                                {timestamp(job.updatedAt)}
                                            </time>
                                        </>
                                    )}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {job.state === "completed"
                                    ? "Your history has been added to your listening statistics."
                                    : job.state === "processing"
                                      ? "Your file is being imported. You can leave this page and check back later."
                                      : job.state === "queued"
                                        ? job.nextRetryAt
                                            ? `A temporary problem interrupted processing. Another attempt is scheduled after ${timestamp(job.nextRetryAt)} UTC.`
                                            : "Waiting for the next processing run. This can take several hours; uploading the same file again is not needed."
                                        : job.invalidFile
                                          ? "This file could not be read as Spotify extended audio history. Choose the original JSON file from your Spotify archive again."
                                          : "Processing failed after several attempts. Your existing history was kept. Retry this file or contact support."}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                {job.state === "completed" && (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={job.dashboardHref}>
                                            View imported listening
                                        </Link>
                                    </Button>
                                )}
                                {job.canRetry && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={retrying !== null}
                                        onClick={() => void retry(job.id)}
                                        aria-label={`Retry import ${job.fileName}`}
                                    >
                                        {retrying === job.id ? (
                                            <Loader2
                                                className="animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <RefreshCw aria-hidden="true" />
                                        )}
                                        {retrying === job.id
                                            ? "Queuing…"
                                            : "Retry import"}
                                    </Button>
                                )}
                                {job.state === "failed" && (
                                    <a
                                        href="https://github.com/CDE90/SoundStats/issues"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ss-text-link text-sm text-primary"
                                    >
                                        Get import help
                                    </a>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
