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
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableHeadRow,
    TableRow,
} from "@/components/ui/table";

export default function LeaderboardLoadingPage() {
    return (
        <div className="min-h-[calc(100vh-300px)] p-4">
            <Skeleton className="mb-2 h-8 w-48" />
            <div className="mb-4 flex w-full flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <Label>Sort By</Label>
                    <Skeleton className="mt-1 h-10 w-full" />
                </div>
                <div className="flex-1">
                    <Label>Timeframe</Label>
                    <Skeleton className="mt-1 h-10 w-full" />
                </div>
            </div>
            <div className="mb-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Leaderboard</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableHeadRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Playtime</TableHead>
                                </TableHeadRow>
                            </TableHeader>
                            <TableBody>
                                {/* Create skeleton rows to mimic loading state */}
                                {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
                                {[...Array(10)].map((_, index) => (
                                    <TableRow key={`loading-row-${index}`}>
                                        <TableCell>
                                            <Skeleton className="h-6 w-6" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex h-12 items-center gap-4">
                                                <Skeleton className="h-12 w-12 rounded-full" />
                                                <Skeleton className="h-5 w-24" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-20" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" aria-disabled={true} />
                        </PaginationItem>

                        {/* Skeleton pagination items */}
                        {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
                        {[...Array(3)].map((_, index) => (
                            <PaginationItem key={`pagination-${index}`}>
                                <PaginationLink href="#" isActive={index === 0}>
                                    <Skeleton className="h-5 w-5" />
                                </PaginationLink>
                            </PaginationItem>
                        ))}

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
