"use client";

import { useRef, useState } from "react";
import { FileJson, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { importFileError, MAX_IMPORT_FILES } from "@/lib/import-history";
import { useUploadThing } from "@/lib/uploadthing";

export function ImportFiles({
    onUploaded,
}: {
    onUploaded: () => Promise<void>;
}) {
    const input = useRef<HTMLInputElement>(null);
    const uploadLock = useRef(false);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const { startUpload } = useUploadThing("streamingHistoryUploader", {
        onUploadProgress: setProgress,
    });

    function selectFiles(incoming: File[]) {
        const combined = [...files];
        for (const file of incoming) {
            if (
                !combined.some(
                    (other) =>
                        other.name === file.name &&
                        other.size === file.size &&
                        other.lastModified === file.lastModified,
                )
            )
                combined.push(file);
        }
        if (combined.length > MAX_IMPORT_FILES) {
            setError(
                "Choose up to 20 files at a time. Remove a file before adding more.",
            );
            return;
        }
        setFiles(combined);
        setError(null);
        setNotice(null);
    }

    async function upload() {
        if (uploadLock.current || !files.length || files.some(importFileError))
            return;
        uploadLock.current = true;
        setBusy(true);
        setError(null);
        setNotice(null);
        let completed = 0;
        // Upload individually so a failed file does not hide which earlier files
        // were queued. Successful files are removed; unattempted files stay selected.
        try {
            for (const file of files) {
                setProgress(0);
                setNotice(
                    `Uploading ${file.name} (${completed + 1} of ${files.length})`,
                );
                const result = await startUpload([file]);
                if (!result?.length) throw new Error("Upload did not complete");
                completed++;
                setFiles((remaining) =>
                    remaining.filter((item) => item !== file),
                );
            }
            setNotice(
                `${completed} ${completed === 1 ? "file uploaded" : "files uploaded"} — waiting for processing. You can leave this page and check Import history later.`,
            );
        } catch {
            setNotice(
                completed
                    ? `${completed} ${completed === 1 ? "file was" : "files were"} uploaded and queued.`
                    : null,
            );
            setError(
                "The upload couldn’t finish. Check Import history before retrying: a file may have reached the queue even if its confirmation was interrupted. Your remaining selection is preserved.",
            );
        } finally {
            uploadLock.current = false;
            setBusy(false);
            await onUploaded();
        }
    }

    return (
        <div className="space-y-5">
            <div
                className="rounded-lg border border-dashed border-border bg-background p-5 sm:p-6"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                    event.preventDefault();
                    if (!busy)
                        selectFiles(Array.from(event.dataTransfer.files));
                }}
            >
                <input
                    ref={input}
                    id="spotify-history-files"
                    type="file"
                    accept=".json,application/json"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    disabled={busy}
                    aria-label="Choose Spotify audio history JSON files"
                    aria-describedby="import-file-rules"
                    onChange={(event) => {
                        selectFiles(Array.from(event.target.files ?? []));
                        event.target.value = "";
                    }}
                />
                <Button
                    variant="outline"
                    type="button"
                    disabled={busy}
                    onClick={() => input.current?.click()}
                >
                    <FileJson aria-hidden="true" /> Choose JSON files
                </Button>
                <p
                    className="mt-3 text-sm leading-6 text-muted-foreground"
                    id="import-file-rules"
                >
                    Choose files or drop them here. Up to 20 JSON files, 64 MB
                    each. Names must start with Streaming_History_Audio_.
                </p>
            </div>
            {files.length > 0 && (
                <div>
                    <h3 className="mb-3 text-base font-medium">
                        Selected files ({files.length} of 20)
                    </h3>
                    <ul
                        className="divide-y divide-border"
                        aria-label="Selected history files"
                    >
                        {files.map((file, index) => {
                            const validation = importFileError(file);
                            return (
                                <li
                                    key={`${file.name}-${file.lastModified}-${index}`}
                                    className="flex items-start justify-between gap-3 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="break-all text-sm font-medium">
                                            {file.name}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {(
                                                file.size /
                                                (1024 * 1024)
                                            ).toFixed(2)}{" "}
                                            MB
                                        </p>
                                        {validation && (
                                            <p
                                                className="mt-2 text-sm text-destructive"
                                                role="alert"
                                            >
                                                {validation}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={busy}
                                        aria-label={`Remove ${file.name}`}
                                        onClick={() =>
                                            setFiles((previous) =>
                                                previous.filter(
                                                    (item) => item !== file,
                                                ),
                                            )
                                        }
                                    >
                                        <X aria-hidden="true" />
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            <Alert variant="destructive">
                <AlertTitle>
                    Existing history in these files’ date range will be replaced
                </AlertTitle>
                <AlertDescription>
                    Check your selection before uploading. Other listening dates
                    are kept.
                </AlertDescription>
            </Alert>
            <Button
                type="button"
                className="w-full"
                disabled={busy || !files.length || files.some(importFileError)}
                onClick={() => void upload()}
            >
                {busy ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                    <Upload aria-hidden="true" />
                )}
                {busy
                    ? `Uploading… ${progress}%`
                    : `Upload ${files.length || "selected"} ${files.length === 1 ? "file" : "files"}`}
            </Button>
            {busy && (
                <p className="text-sm text-muted-foreground">
                    Keep this page open until uploading finishes. Processing can
                    continue after you leave.
                </p>
            )}
            {notice && (
                <p
                    className="text-sm leading-6 text-muted-foreground"
                    role="status"
                    aria-live="polite"
                >
                    {notice}
                </p>
            )}
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Upload needs attention</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
