import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    getPageUrl: (page: number) => string;
}

// Helper function to determine which page numbers to show
function getPageNumbers(currentPage: number, totalPages: number) {
    const delta = 1; // Number of pages to show on each side of current page
    const pages: number[] = [];

    // Always include first page
    pages.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
        pages.push(-1); // -1 represents ellipsis
    }

    // Add pages around current page
    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
        pages.push(-1); // -1 represents ellipsis
    }

    // Always include last page if it exists and is different from first page
    if (totalPages > 1) {
        pages.push(totalPages);
    }

    return pages;
}

export default function LeaderboardPagination({
    currentPage,
    totalPages,
    getPageUrl,
}: PaginationProps) {
    return (
        <div className="flex justify-center">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href={getPageUrl(currentPage - 1)}
                            aria-disabled={currentPage <= 1}
                        />
                    </PaginationItem>

                    {getPageNumbers(currentPage, totalPages).map(
                        (pageNum, index) =>
                            pageNum === -1 ? (
                                <PaginationItem key={`ellipsis-${index}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={pageNum}>
                                    <PaginationLink
                                        href={getPageUrl(pageNum)}
                                        isActive={currentPage === pageNum}
                                    >
                                        {pageNum}
                                    </PaginationLink>
                                </PaginationItem>
                            ),
                    )}

                    <PaginationItem>
                        <PaginationNext
                            href={getPageUrl(currentPage + 1)}
                            aria-disabled={currentPage >= totalPages}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
