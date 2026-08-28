"use client";

import { UploadDropzone } from "@/lib/uploadthing";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, InfoIcon } from "lucide-react";
import { useState } from "react";

export default function ImportDataPage() {
    const [uploadStatus, setUploadStatus] = useState<
        | { type: "uploading"; message: string }
        | { type: "success"; message: string }
        | { type: "error"; message: string }
        | null
    >(null);

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                    Import Historical Data
                </h1>
                <p className="text-muted-foreground">
                    Import your Spotify listening history to see detailed
                    historical analytics and insights.
                </p>
            </div>

            <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle className="text-lg">Instructions</AlertTitle>
                <AlertDescription className="space-y-4">
                    <ol className="list-inside list-decimal space-y-3">
                        <li>
                            Request your extended streaming history from the{" "}
                            <Link
                                href="https://www.spotify.com/us/account/privacy/"
                                className="font-medium text-blue-500 hover:underline"
                            >
                                Spotify account privacy page
                            </Link>
                            <p className="ml-5 mt-1 text-sm text-muted-foreground">
                                Note: Processing may take a few days
                            </p>
                        </li>
                        <li>
                            Locate files containing &quot;Audio&quot; in their
                            names
                            <p className="ml-5 mt-1 text-sm text-muted-foreground">
                                Example:{" "}
                                <span className="rounded bg-muted px-1 py-0.5 font-mono">
                                    Streaming_History_Audio_2024_1.json
                                </span>
                            </p>
                        </li>
                        <li>Upload the files using the dropzone below</li>
                    </ol>
                </AlertDescription>
            </Alert>

            <Alert>
                <AlertDescription>
                    After uploading, your dashboard will be updated to show all
                    the historical data within a few hours.
                </AlertDescription>
            </Alert>

            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    Importing historical data will overwrite any existing
                    listening history for that timeframe.
                </AlertDescription>
            </Alert>

            <UploadDropzone
                endpoint="streamingHistoryUploader"
                onUploadBegin={(fileName) => {
                    setUploadStatus({
                        type: "uploading",
                        message: `Uploading ${fileName}...`,
                    });
                }}
                onClientUploadComplete={(res) => {
                    setUploadStatus({
                        type: "success",
                        message: `${res.length} ${res.length === 1 ? "file" : "files"} uploaded and queued for processing.`,
                    });
                }}
                onUploadError={(error: Error) => {
                    setUploadStatus({
                        type: "error",
                        message: error.message,
                    });
                }}
                content={{
                    allowedContent: "Spotify JSON files, up to 64 MB each",
                }}
                className="h-full w-full border-border/100"
            />

            {uploadStatus && (
                <Alert
                    variant={
                        uploadStatus.type === "error"
                            ? "destructive"
                            : "default"
                    }
                    aria-live="polite"
                >
                    {uploadStatus.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <InfoIcon className="h-4 w-4" />
                    )}
                    <AlertTitle>
                        {uploadStatus.type === "uploading"
                            ? "Uploading"
                            : uploadStatus.type === "success"
                              ? "Upload complete"
                              : "Upload failed"}
                    </AlertTitle>
                    <AlertDescription>{uploadStatus.message}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
