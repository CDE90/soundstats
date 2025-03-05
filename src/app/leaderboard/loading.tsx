import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import LeaderboardSkeleton from "./_components/leaderboard-skeleton";

export default function LeaderboardLoadingPage() {
    return (
        <div className="min-h-[calc(100vh-300px)] p-4">
            <h1 className="mb-2 text-2xl font-bold">Leaderboard</h1>
            <div className="mb-4 flex w-full flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <Label>Sort By</Label>
                    <div className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"></div>
                </div>
                <div className="flex-1">
                    <Label>Timeframe</Label>
                    <div className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"></div>
                </div>
            </div>
            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LeaderboardSkeleton />
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" aria-disabled={true} />
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationLink href="#" isActive={true}>
                                1
                            </PaginationLink>
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationEllipsis />
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationNext href="#" aria-disabled={true} />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}
