import { captureAuthenticatedEvent } from "@/lib/posthog";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    "/import(.*)",
    "/leaderboard(.*)",
    "/feed(.*)",
    "/friends(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
    // Handle protected routes
    if (isProtectedRoute(req)) await auth.protect();

    // Track authenticated page views on non-API routes
    try {
        const { userId } = await auth();
        const { pathname } = req.nextUrl;

        // Only track authenticated page views (not API routes, static assets, etc.)
        if (
            userId &&
            !pathname.startsWith("/api/") &&
            !pathname.startsWith("/_next/") &&
            !/\.(jpg|jpeg|png|gif|svg|css|js|ico|webp|mp3|mp4|webm|woff|woff2|ttf|otf|eot)$/.exec(
                pathname,
            )
        ) {
            await captureAuthenticatedEvent(userId, "page_view", {
                path: pathname,
                url: req.url,
                referrer: req.headers.get("referer") ?? "",
            });
        }
    } catch (error) {
        // Silently fail - don't block the request if tracking fails
        console.error("Error tracking page view:", error);
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
