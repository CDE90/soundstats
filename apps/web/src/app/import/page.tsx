"use client";

import { UploadDropzone } from "@/lib/uploadthing";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, InfoIcon } from "lucide-react";

export default function ImportDataPage() {
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
                onClientUploadComplete={(res) => {
                    console.log("Files: ", res);
                    alert("Upload Completed");
                }}
                onUploadError={(error: Error) => {
                    alert(`ERROR! ${error.message}`);
                }}
                className="h-full w-full border-border/100"
            />
        </div>
    );
}
