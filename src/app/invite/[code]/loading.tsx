import { Users } from "lucide-react";

export default function Loading() {
    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="mb-8 text-center">
                <div className="mb-4">
                    <Users className="mx-auto h-12 w-12 animate-pulse text-primary" />
                </div>
                <h1 className="mb-2 text-3xl font-bold">Loading Invite...</h1>
                <p className="text-muted-foreground">
                    Please wait while we load your invite
                </p>
            </div>
            <div className="space-y-4">
                <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
            </div>
        </div>
    );
}
