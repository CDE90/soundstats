import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTopTable } from "./_components/top-tables";

export default function Loading() {
    return (
        <div className="p-4">
            <h1 className="mb-2 text-2xl font-bold">Dashboard</h1>
            <Skeleton className="mb-4 h-[38px] w-full rounded-lg" />
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Minutes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-32 rounded-lg" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Artists</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-32 rounded-lg" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Tracks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-32 rounded-lg" />
                    </CardContent>
                </Card>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Artists</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Tracks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top Albums</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SkeletonTopTable limit={10} />
                    </CardContent>
                </Card>
            </div>

            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Playtime</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-80 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
