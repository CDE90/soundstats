import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardSkeleton() {
    return (
        <div className="rounded-xl border bg-card px-5" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    className="flex flex-wrap items-center gap-5 border-b py-6 last:border-0"
                    key={index}
                >
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-36 flex-1" />
                    <div className="flex w-full gap-8 sm:w-auto">
                        {[0, 1, 2].map((metric) => (
                            <div className="flex-1 space-y-3" key={metric}>
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
