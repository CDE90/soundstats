import Link from "next/link";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { PageHeading } from "@/components/page-layout";
import { Label } from "@/components/ui/label";
import { captureServerPageView } from "@/lib/posthog";
import { getBaseUrl } from "@/server/lib";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
    getLeaderboardData,
    sortByOptions,
    timeframeOptions,
    type SortBy,
    type Timeframe,
} from "./_components/leaderboard-data-fetcher";
import LeaderboardSkeleton from "./_components/leaderboard-skeleton";
import { LeaderboardList } from "./_components/leaderboard-list";
import LeaderboardPagination from "./_components/pagination";
import { ClientSearchParamsDropdown } from "./ClientDropdown";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Leaderboard",
    description: "See how you stack up against your friends.",
};

export default async function LeaderboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[]>>;
}) {
    await connection();

    const user = await currentUser();
    await captureServerPageView(user);

    const baseUrl = getBaseUrl();
    const actualParams = await searchParams;

    // @ts-expect-error this is fine
    const searchParamsCopy = new URLSearchParams(actualParams);

    // Parse and validate search params
    const sortBy = (
        searchParamsCopy.get("sortBy")
            ? sortByOptions.includes(searchParamsCopy.get("sortBy")! as SortBy)
                ? searchParamsCopy.get("sortBy")!
                : "Playtime"
            : "Playtime"
    ) as SortBy;

    // Parse sort order parameter (asc or desc)
    const sortOrder: "asc" | "desc" =
        searchParamsCopy.get("order") === "asc" ? "asc" : "desc";

    const timeframe = (
        searchParamsCopy.get("timeframe")
            ? timeframeOptions.includes(
                  searchParamsCopy.get("timeframe")! as Timeframe,
              )
                ? searchParamsCopy.get("timeframe")!
                : "Last 7 days"
            : "Last 7 days"
    ) as Timeframe;

    // Store original search params to pass along to components for URL construction
    const originalSearchParams = searchParamsCopy.toString();
    const orderParams = new URLSearchParams(originalSearchParams);
    orderParams.set("order", sortOrder === "desc" ? "asc" : "desc");
    orderParams.set("page", "1");

    // Get pagination params
    const requestedLimit = Number.parseInt(
        searchParamsCopy.get("limit") ?? "10",
        10,
    );
    const requestedPage = Number.parseInt(
        searchParamsCopy.get("page") ?? "1",
        10,
    );
    const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(requestedLimit, 100))
        : 10;
    const page = Number.isFinite(requestedPage)
        ? Math.max(1, requestedPage)
        : 1;

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
        return (
            <div className="ss-page ss-leaderboard-page">
                <PageHeading
                    title="Leaderboard"
                    description="Your listening, alongside your friends."
                />
                <p>You need to be signed in to view the leaderboard.</p>
            </div>
        );
    }

    // URL generation helper for pagination
    function getPageUrl(pageNum: number) {
        if (pageNum < 1) return "#";

        const newUrl = new URL(
            `${baseUrl}/leaderboard?${searchParamsCopy.toString()}`,
        );
        newUrl.searchParams.set("page", pageNum.toString());
        return newUrl.toString();
    }

    return (
        <div className="ss-page ss-leaderboard-page">
            <PageHeading
                title="Leaderboard"
                description="Your listening, alongside your friends."
            />

            {/* Dropdowns for filtering */}
            <div className="ss-toolbar mb-8">
                <div className="ss-filter-field">
                    <Label htmlFor="leaderboard-sortBy">Rank by</Label>
                    <ClientSearchParamsDropdown
                        title="Sort By"
                        baseUrl={baseUrl}
                        options={sortByOptions}
                        searchParam="sortBy"
                        defaultValue="Playtime"
                    />
                </div>
                <Link
                    className="ss-icon-link self-end"
                    href={`/leaderboard?${orderParams}`}
                    aria-label={
                        sortOrder === "desc"
                            ? "Sort from lowest to highest"
                            : "Sort from highest to lowest"
                    }
                    title={
                        sortOrder === "desc"
                            ? "Sort from lowest to highest"
                            : "Sort from highest to lowest"
                    }
                >
                    {sortOrder === "desc" ? (
                        <ArrowDownWideNarrow size={18} aria-hidden="true" />
                    ) : (
                        <ArrowUpNarrowWide size={18} aria-hidden="true" />
                    )}
                </Link>
                <div className="ss-filter-field">
                    <Label htmlFor="leaderboard-timeframe">
                        Listening period
                    </Label>
                    <ClientSearchParamsDropdown
                        title="Timeframe"
                        baseUrl={baseUrl}
                        options={timeframeOptions}
                        searchParam="timeframe"
                        defaultValue="Last 7 days"
                    />
                </div>
            </div>

            {/* Listening leaderboard */}
            <div className="mb-4">
                <Suspense fallback={<LeaderboardSkeleton />}>
                    <LeaderboardWithData
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        timeframe={timeframe}
                        page={page}
                        limit={limit}
                        getPageUrl={getPageUrl}
                    />
                </Suspense>
            </div>
        </div>
    );
}

// Fetch the leaderboard and its pagination inside the streaming boundary
async function LeaderboardWithData({
    sortBy,
    sortOrder,
    timeframe,
    page,
    limit,
    getPageUrl,
}: {
    sortBy: SortBy;
    sortOrder: "asc" | "desc";
    timeframe: Timeframe;
    page: number;
    limit: number;
    getPageUrl: (page: number) => string;
}) {
    // Get userId for data fetching
    const { userId } = await auth();

    if (!userId) {
        redirect("/");
    }

    // Fetch data with caching
    const { userComparisons, totalPages, currentPage } =
        await getLeaderboardData(
            userId,
            sortBy,
            sortOrder,
            timeframe,
            page,
            limit,
        );

    // Redirect if needed due to pagination constraints
    if (currentPage !== page) {
        redirect(getPageUrl(currentPage));
    }

    return (
        <>
            <LeaderboardList
                userComparisons={userComparisons}
                sortBy={sortBy}
                viewerId={userId}
                startRank={(currentPage - 1) * limit + 1}
            />

            <div className="mt-4">
                <LeaderboardPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    getPageUrl={getPageUrl}
                />
            </div>
        </>
    );
}
