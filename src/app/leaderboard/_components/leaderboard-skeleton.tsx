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

export default function LeaderboardSkeleton() {
    // Create an array of 10 items for skeleton rows
    const skeletonRows = Array.from({ length: 10 }, (_, i) => i);

    return (
        <div className="overflow-x-auto">
            <Table className="min-w-full">
                <TableHeader>
                    <TableHeadRow>
                        <TableHead className="w-16 min-w-16">
                            <Skeleton className="h-6 w-12" />
                        </TableHead>
                        <TableHead className="w-[22%] min-w-36 xs:w-[25%]">
                            <Skeleton className="h-6 w-16" />
                        </TableHead>
                        {/* Three metric columns with equal width */}
                        <TableHead className="w-[19%] min-w-40">
                            <Skeleton className="h-6 w-20" />
                        </TableHead>
                        <TableHead className="w-[19%] min-w-28">
                            <Skeleton className="h-6 w-16" />
                        </TableHead>
                        <TableHead className="w-[19%] min-w-28">
                            <Skeleton className="h-6 w-16" />
                        </TableHead>
                    </TableHeadRow>
                </TableHeader>
                <TableBody>
                    {skeletonRows.map((i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-6 w-8" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 xs:gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full xs:h-12 xs:w-12" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </TableCell>
                            {/* Three metric cells */}
                            <TableCell>
                                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                                    <Skeleton className="h-6 w-16" />
                                    <Skeleton className="h-5 w-12" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                                    <Skeleton className="h-6 w-14" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                                    <Skeleton className="h-6 w-14" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
