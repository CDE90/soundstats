import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Skeleton className="h-10 w-48 mb-4" />
                
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="mb-4">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div>
                                        <Skeleton className="h-4 w-32 mb-2" />
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
                <Skeleton className="h-10 w-48 mb-4" />
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-8 w-full mx-auto" />
                    </CardContent>
                </Card>
            </div>

            <div className="mb-8">
                <Skeleton className="h-10 w-48 mb-4" />
                <div className="mb-6">
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-3 w-48" />
                </div>
            </div>
        </div>
    );
}