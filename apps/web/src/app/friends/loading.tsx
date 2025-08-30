import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="mb-8">
                <Skeleton className="mb-4 h-10 w-48" />

                {[1, 2, 3].map((i) => (
                    <Card key={i} className="mb-4">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div>
                                        <Skeleton className="mb-2 h-4 w-32" />
                                        <Skeleton className="h-3 w-40" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mb-8">
                <Skeleton className="mb-4 h-10 w-48" />
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="mx-auto h-8 w-full" />
                    </CardContent>
                </Card>
            </div>

            <div className="mb-8">
                <Skeleton className="mb-4 h-10 w-48" />
                <div className="mb-6">
                    <Skeleton className="mb-2 h-10 w-full" />
                    <Skeleton className="h-3 w-48" />
                </div>
            </div>
        </div>
    );
}
