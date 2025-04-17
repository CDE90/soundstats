import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StreakSkeleton } from "./_components/listening-streaks";
import { SkeletonTopTable } from "./_components/top-tables";

export default function Loading() {
    return (
        <div className="p-2 sm:p-4">
            <h1 className="mb-2 text-xl sm:text-2xl font-bold">Dashboard</h1>
            <Skeleton className="mb-3 sm:mb-4 h-[32px] sm:h-[38px] w-full rounded-lg" />
            
            {/* Stats cards - 2 columns on small screens, 4 on medium+ */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Total Minutes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-6 sm:h-7 w-24 sm:w-32 rounded-lg" />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Total Artists</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-6 sm:h-7 w-24 sm:w-32 rounded-lg" />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Total Tracks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-6 sm:h-7 w-24 sm:w-32 rounded-lg" />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Listening Streak</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                            <div>
                                <Skeleton className="mb-1 h-4 sm:h-5 w-12 sm:w-14" />
                                <Skeleton className="h-3 w-16 sm:w-20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Streak cards */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Artist Streaks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <StreakSkeleton />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Track Streaks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <StreakSkeleton />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Album Streaks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <StreakSkeleton />
                    </CardContent>
                </Card>
            </div>

            {/* Top tables */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Top Artists</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Top Tracks</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
                <Card className="h-full md:col-span-2 xl:col-span-1">
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-sm sm:text-base">Top Albums</CardTitle>
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
                        <CardTitle className="text-sm sm:text-base">Daily Playtime</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <Skeleton className="h-60 sm:h-80 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
