import { Skeleton } from "@/components/ui/skeleton";

export function MusicDetailLoading() {
    return (
        <div
            className="mx-auto max-w-7xl space-y-6 p-4"
            aria-label="Loading listening details"
            role="status"
        >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
            <Skeleton className="h-80 w-full" />
        </div>
    );
}
