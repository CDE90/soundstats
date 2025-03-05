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
        <Table>
            <TableHeader>
                <TableHeadRow>
                    <TableHead className="w-[20%] xs:w-[15%]">
                        <Skeleton className="h-6 w-12" />
                    </TableHead>
                    <TableHead className="w-[40%] xs:w-[50%]">
                        <Skeleton className="h-6 w-16" />
                    </TableHead>
                    <TableHead className="w-[40%] xs:w-[35%]">
                        <Skeleton className="h-6 w-20" />
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
                        <TableCell>
                            <div className="flex flex-col items-start gap-1 xs:flex-row xs:items-center xs:gap-2">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
