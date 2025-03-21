import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getBaseUrl } from "@/server/lib";
import { redirect } from "next/navigation";
import { ClientSearchParamsDropdown } from "./ClientDropdown";
import { Suspense } from "react";
import LeaderboardTable from "./_components/leaderboard-table";
import LeaderboardSkeleton from "./_components/leaderboard-skeleton";
import LeaderboardPagination from "./_components/pagination";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
    getLeaderboardData,
    sortByOptions,
    timeframeOptions,
    type SortBy,
    type Timeframe,
} from "./_components/leaderboard-data-fetcher";
import { captureServerPageView } from "@/lib/posthog";

export default async function LeaderboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[]>>;
}) {
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

    const timeframe = (
        searchParamsCopy.get("timeframe")
            ? timeframeOptions.includes(
                  searchParamsCopy.get("timeframe")! as Timeframe,
              )
                ? searchParamsCopy.get("timeframe")!
                : "Last 7 days"
            : "Last 7 days"
    ) as Timeframe;

    // Get pagination params
    const limit = parseInt(searchParamsCopy.get("limit") ?? "10");
    const page = parseInt(searchParamsCopy.get("page") ?? "1");

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-300px)] p-4">
                <h1 className="mb-2 text-2xl font-bold">Leaderboard</h1>
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
        <div className="min-h-[calc(100vh-300px)] p-4">
            <h1 className="mb-2 text-2xl font-bold">Leaderboard</h1>

            {/* Dropdowns for filtering */}
            <div className="mb-4 flex w-full flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <Label>Sort By</Label>
                    <ClientSearchParamsDropdown
                        title="Sort By"
                        baseUrl={baseUrl}
                        options={sortByOptions}
                        searchParam="sortBy"
                        defaultValue="Playtime"
                    />
                </div>
                <div className="flex-1">
                    <Label>Timeframe</Label>
                    <ClientSearchParamsDropdown
                        title="Timeframe"
                        baseUrl={baseUrl}
                        options={timeframeOptions}
                        searchParam="timeframe"
                        defaultValue="Last 7 days"
                    />
                </div>
            </div>

            {/* Leaderboard table with data */}
            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<LeaderboardSkeleton />}>
                            <LeaderboardTableWithData
                                sortBy={sortBy}
                                timeframe={timeframe}
                                page={page}
                                limit={limit}
                                getPageUrl={getPageUrl}
                            />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Separate component that fetches data and renders table + pagination
async function LeaderboardTableWithData({
    sortBy,
    timeframe,
    page,
    limit,
    getPageUrl,
}: {
    sortBy: SortBy;
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
        await getLeaderboardData(userId, sortBy, timeframe, page, limit);

    // Redirect if needed due to pagination constraints
    if (currentPage !== page) {
        redirect(getPageUrl(currentPage));
    }

    return (
        <>
            <LeaderboardTable
                userComparisons={userComparisons}
                sortBy={sortBy}
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
