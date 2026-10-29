import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeading({
    title,
    description,
    children,
    backHref,
    backLabel = "Back",
}: {
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    backHref?: string;
    backLabel?: string;
}) {
    return (
        <header className="ss-page-heading">
            <div className="min-w-0">
                {backHref && (
                    <Link href={backHref} className="ss-back-link">
                        <ArrowLeft size={16} aria-hidden="true" />
                        {backLabel}
                    </Link>
                )}
                <h1>{title}</h1>
                {description && (
                    <p className="ss-page-description">{description}</p>
                )}
            </div>
            {children && <div className="ss-page-actions">{children}</div>}
        </header>
    );
}

export function EmptyState({
    title,
    description,
    children,
}: {
    title: string;
    description?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="ss-empty-state">
            <Headphones size={28} strokeWidth={1.5} aria-hidden="true" />
            <h3>{title}</h3>
            {description && <p>{description}</p>}
            {children && <div className="mt-5">{children}</div>}
        </div>
    );
}

export function PageLoading({
    title,
    description,
    narrow = false,
    layout = "rows",
}: {
    title: string;
    description?: string;
    narrow?: boolean;
    layout?: "rows" | "form" | "analytics" | "code";
}) {
    return (
        <div
            className={cn("ss-page", narrow && "ss-page-narrow")}
            role="status"
            aria-label={`Loading ${title.toLowerCase()}`}
            aria-busy="true"
        >
            <PageHeading title={title} description={description} />
            {layout === "code" ? (
                <Skeleton className="h-40 w-full" />
            ) : layout === "form" ? (
                <div className="ss-surface max-w-3xl space-y-6 p-5 sm:p-8">
                    <Skeleton className="h-7 w-48" />
                    {[0, 1, 2].map((index) => (
                        <div key={index} className="space-y-3">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-11 w-full" />
                        </div>
                    ))}
                    <Skeleton className="h-11 w-full" />
                </div>
            ) : layout === "analytics" ? (
                <div className="space-y-8">
                    <Skeleton className="h-12 w-full" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }, (_, i) => (
                            <Skeleton key={i} className="h-36 w-full" />
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <Skeleton className="mb-8 h-11 w-full max-w-md" />
                    <div className="ss-surface p-5 sm:p-8">
                        {Array.from({ length: 5 }, (_, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-4 border-b py-5 last:border-0"
                            >
                                <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
                                <div className="flex-1 space-y-3">
                                    <Skeleton className="h-4 w-2/3 max-w-48" />
                                    <Skeleton className="h-3 w-1/2 max-w-32" />
                                </div>
                                <Skeleton className="h-6 w-12" />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
