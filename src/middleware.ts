import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    "/import(.*)",
    "/leaderboard(.*)",
    "/feed(.*)",
    "/friends(.*)",
    "/invite$",
]);

export default clerkMiddleware(async (auth, req) => {
    // Handle protected routes
    if (isProtectedRoute(req)) await auth.protect();

    const response = NextResponse.next();

    // Add pathname as a header so the server component can access it
    const { pathname } = req.nextUrl;
    response.headers.set("x-pathname", pathname);
    response.headers.set("x-url", req.url);

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
