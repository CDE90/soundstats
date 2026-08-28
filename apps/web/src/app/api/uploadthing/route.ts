import { createRouteHandler } from "uploadthing/next";
import { getBaseUrl } from "@/server/lib";
import { ourFileRouter } from "./core";

const callbackUrl = process.env.COOLIFY_URL
    ? new URL("/api/uploadthing", getBaseUrl()).href
    : undefined;

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
    ...(callbackUrl ? { config: { callbackUrl } } : {}),
});
