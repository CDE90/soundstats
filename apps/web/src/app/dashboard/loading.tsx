import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakSkeleton } from "./_components/listening-streaks";
import { SkeletonTopTable } from "./_components/top-tables";
import { StreakTabsSkeleton } from "./_components/streak-tabs-skeleton";

export default function Loading() {
    return (
        <div className="p-2 sm:p-4">
            <h1 className="mb-2 text-xl font-bold sm:text-2xl">Dashboard</h1>
            <Skeleton className="mb-3 h-[32px] w-full rounded-lg sm:mb-4 sm:h-[38px]" />

            {/* Stats cards - 2 columns on small screens, 4 on medium+ */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Total Minutes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-6 w-24 rounded-lg sm:h-7 sm:w-32" />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Total Artists
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-6 w-24 rounded-lg sm:h-7 sm:w-32" />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Total Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-6 w-24 rounded-lg sm:h-7 sm:w-32" />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Listening Streak
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Skeleton className="h-8 w-8 rounded-full sm:h-10 sm:w-10" />
                            <div>
                                <Skeleton className="mb-1 h-4 w-12 sm:h-5 sm:w-14" />
                                <Skeleton className="h-3 w-16 sm:w-20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Streaks - Tabbed on small screens, 3 columns on large */}
            <div className="mb-4">
                {/* Tabbed interface for small screens */}
                <div className="block lg:hidden">
                    <Card className="h-full">
                        <CardHeader className="p-3 sm:p-4">
                            <CardTitle className="text-sm sm:text-base">
                                Listening Streaks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                            <StreakTabsSkeleton />
                        </CardContent>
                    </Card>
                </div>

                {/* Original 3-column layout for medium screens and above */}
                <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
                    <Card className="h-full">
                        <CardHeader className="p-3 sm:p-4">
                            <CardTitle className="text-sm sm:text-base">
                                Artist Streaks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                            <StreakSkeleton />
                        </CardContent>
                    </Card>
                    <Card className="h-full">
                        <CardHeader className="p-3 sm:p-4">
                            <CardTitle className="text-sm sm:text-base">
                                Track Streaks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                            <StreakSkeleton />
                        </CardContent>
                    </Card>
                    <Card className="h-full">
                        <CardHeader className="p-3 sm:p-4">
                            <CardTitle className="text-sm sm:text-base">
                                Album Streaks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                            <StreakSkeleton />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Top tables */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Top Artists
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Top Tracks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
                <Card className="h-full md:col-span-2 xl:col-span-1">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Top Albums
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
            </div>

            {/* Daily playtime graph */}
            <div className="mb-4">
                <Card>
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">
                            Daily Playtime
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-60 w-full sm:h-80" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
