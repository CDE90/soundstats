"use client";

import { UploadDropzone } from "@/lib/uploadthing";

export default function Home() {
    return (
        <main className="flex flex-col items-center p-24">
            <UploadDropzone
                endpoint="streamingHistoryUploader"
                onClientUploadComplete={(res) => {
                    // Do something with the response
                    console.log("Files: ", res);
                    alert("Upload Completed");
                }}
                onUploadError={(error: Error) => {
                    // Do something with the error.
                    alert(`ERROR! ${error.message}`);
                }}
                className="h-full w-full border-red-500"
            />
        </main>
    );
}
