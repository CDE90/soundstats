"use client";

import { PageHeading } from "@/components/page-layout";
import { UploadDropzone } from "@/lib/uploadthing";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertCircle,
    CheckCircle2,
    InfoIcon,
    ArrowUpRight,
} from "lucide-react";
import { useState } from "react";

export default function ImportDataPage() {
    const [uploadStatus, setUploadStatus] = useState<
        | { type: "uploading"; message: string }
        | { type: "success"; message: string }
        | { type: "error"; message: string }
        | null
    >(null);

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
                                Your dashboard will include your imported
                                history within a few hours.
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
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle aria-hidden="true" className="h-4 w-4" />
                        <AlertTitle>
                            Existing history will be replaced
                        </AlertTitle>
                        <AlertDescription>
                            Importing historical data will overwrite any
                            existing listening history for that timeframe.
                        </AlertDescription>
                    </Alert>
                    <UploadDropzone
                        endpoint="streamingHistoryUploader"
                        onUploadBegin={(fileName) =>
                            setUploadStatus({
                                type: "uploading",
                                message: `Uploading ${fileName}...`,
                            })
                        }
                        onClientUploadComplete={(res) =>
                            setUploadStatus({
                                type: "success",
                                message: `${res.length} ${res.length === 1 ? "file" : "files"} uploaded and queued for processing.`,
                            })
                        }
                        onUploadError={(error: Error) =>
                            setUploadStatus({
                                type: "error",
                                message: error.message,
                            })
                        }
                        content={{
                            allowedContent:
                                "Spotify JSON files, up to 64 MB each",
                        }}
                        className="ss-upload-dropzone w-full"
                        appearance={{
                            container: "border-border bg-background",
                            uploadIcon: "text-primary",
                            label: "text-foreground",
                            allowedContent: "text-muted-foreground",
                            button: "bg-primary text-primary-foreground",
                        }}
                    />
                    {uploadStatus && (
                        <Alert
                            variant={
                                uploadStatus.type === "error"
                                    ? "destructive"
                                    : "default"
                            }
                            aria-live="polite"
                            className="mt-6"
                        >
                            {uploadStatus.type === "success" ? (
                                <CheckCircle2
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                />
                            ) : (
                                <InfoIcon
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                />
                            )}
                            <AlertTitle>
                                {uploadStatus.type === "uploading"
                                    ? "Uploading"
                                    : uploadStatus.type === "success"
                                      ? "Upload complete"
                                      : "Upload failed"}
                            </AlertTitle>
                            <AlertDescription>
                                {uploadStatus.message}
                            </AlertDescription>
                        </Alert>
                    )}
                </section>
            </div>
        </div>
    );
}
