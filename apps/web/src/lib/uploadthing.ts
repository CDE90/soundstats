import type { OurFileRouter } from "@/app/api/uploadthing/core";
import {
    generateUploadButton,
    generateUploadDropzone,
    generateReactHelpers,
} from "@uploadthing/react";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
