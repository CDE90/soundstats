import { Skeleton } from "@/components/ui/skeleton";

export function MusicDetailLoading() {
    return (
        <div
            className="ss-page ss-music-detail space-y-7"
            aria-label="Loading listening details"
            role="status"
        >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-56 w-full" />
            <div className="ss-metrics">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24" />
                ))}
            </div>
            <Skeleton className="h-80 w-full" />
        </div>
    );
}
