import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingFeedPage() {
    return (
        <div className="mx-auto max-w-2xl p-4">
            <Skeleton className="mb-2 h-8 w-32" />
            <div className="space-y-8">
                {/* Currently Listening Card */}
                <Card className="w-full overflow-hidden">
                    <CardContent className="p-4">
                        <Skeleton className="mb-4 h-7 w-48" />
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="flex flex-col items-center space-y-2"
                                >
                                    <div
                                        className="relative flex-shrink-0"
                                        style={{
                                            width: "80px",
                                            height: "64px",
                                        }}
                                    >
                                        <Skeleton className="absolute left-0 top-0 h-14 w-14 rounded-full" />
                                        <Skeleton className="absolute bottom-0 right-0 h-10 w-10 rounded-sm" />
                                    </div>
                                    <div className="w-full space-y-1 text-center">
                                        <Skeleton className="mx-auto h-4 w-16" />
                                        <Skeleton className="mx-auto h-3 w-20" />
                                        <Skeleton className="mx-auto h-3 w-14" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Listens Card */}
                <Card className="w-full">
                    <CardContent className="p-4">
                        <Skeleton className="mb-4 h-7 w-40" />
                        <div className="space-y-4 sm:space-y-6">
                            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className="flex gap-4 sm:items-center"
                                >
                                    <div
                                        className="relative flex-shrink-0"
                                        style={{
                                            width: "clamp(72px, 20vw, 80px)",
                                            height: "clamp(60px, 16vw, 64px)",
                                        }}
                                    >
                                        <Skeleton className="absolute left-0 top-0 h-[52px] w-[52px] rounded-full sm:h-14 sm:w-14" />
                                        <Skeleton className="absolute bottom-0 right-0 h-9 w-9 rounded-sm sm:h-10 sm:w-10" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-24 sm:h-5" />
                                        <Skeleton className="h-3 w-40 sm:h-4" />
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-20 xs:hidden" />
                                    </div>
                                    <Skeleton className="hidden h-3 w-20 xs:block" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
