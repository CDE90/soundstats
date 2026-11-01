"use client";

import { PageHeading } from "@/components/page-layout";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportJob } from "@/lib/import-history";
import { getImportHistory } from "./actions";
import { ImportFiles } from "./_components/import-files";
import { ImportHistory } from "./_components/import-history";

export default function ImportDataPage() {
    const [jobs, setJobs] = useState<ImportJob[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const request = useRef(0);
    const refresh = useCallback(async () => {
        const generation = ++request.current;
        setLoading(true);
        try {
            const result = await getImportHistory();
            if (generation !== request.current) return;
            if ("error" in result)
                setError(result.error ?? "Your import history couldn’t load.");
            else {
                setJobs(result.jobs);
                setError(null);
            }
        } catch {
            if (generation === request.current)
                setError("Your import history couldn’t load. Try again.");
        } finally {
            if (generation === request.current) setLoading(false);
        }
    }, []);
    const invalidateRequests = useCallback(() => {
        request.current++;
    }, []);
    useEffect(() => {
        void refresh();
        return invalidateRequests;
    }, [refresh, invalidateRequests]);
    const pending = jobs?.some(
        (job) => job.state === "queued" || job.state === "processing",
    );
    useEffect(() => {
        if (!pending) return;
        const timer = setInterval(() => {
            void refresh();
        }, 30_000);
        return () => clearInterval(timer);
    }, [pending, refresh]);

    return (
        <div className="ss-page ss-import-page">
            <PageHeading
                title="Bring your listening history."
                description="Old favourites, first discoveries, years of listening. Give them a place in your stats."
            />
            <div className="ss-import-layout">
                <section
                    aria-labelledby="import-instructions-title"
                    className="ss-import-instructions"
                >
                    <h2 id="import-instructions-title">
                        From Spotify to SoundStats.
                    </h2>
                    <ol className="ss-import-steps">
                        <li>
                            <h3>Request your history.</h3>
                            <p>
                                Ask Spotify for your extended streaming history.
                                It may take a few days to arrive.
                            </p>
                            <a
                                href="https://www.spotify.com/us/account/privacy/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ss-text-link mt-3 text-primary"
                            >
                                Open Spotify privacy settings{" "}
                                <ArrowUpRight size={16} aria-hidden="true" />
                            </a>
                        </li>
                        <li>
                            <h3>Find your audio files.</h3>
                            <p>
                                Download and unzip the archive. Look for JSON
                                files with “Audio” in the name.
                            </p>
                            <code className="mt-3 block break-all rounded-md bg-secondary p-3 text-xs text-secondary-foreground">
                                Streaming_History_Audio_2024_1.json
                            </code>
                        </li>
                        <li>
                            <h3>Upload, then explore.</h3>
                            <p>
                                Upload your files, then follow their progress in
                                Import history below. Processing can take
                                several hours.
                            </p>
                            <Link
                                href="/dashboard"
                                className="ss-text-link mt-3 text-primary"
                            >
                                Go to your dashboard{" "}
                                <ArrowUpRight size={16} aria-hidden="true" />
                            </Link>
                        </li>
                    </ol>
                </section>
                <section
                    className="ss-surface ss-import-upload"
                    aria-labelledby="upload-title"
                >
                    <h2 id="upload-title">Your Spotify files.</h2>
                    <p className="mb-6 mt-2 text-sm leading-relaxed text-muted-foreground">
                        Upload the audio history JSON files from your archive.
                    </p>
                    <ImportFiles onUploaded={refresh} />
                </section>
            </div>
            <ImportHistory
                jobs={jobs}
                loading={loading}
                error={error}
                refresh={refresh}
            />
        </div>
    );
}
