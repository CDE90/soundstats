import { TriangleAlert } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function StreakNotExtendedTooltip() {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <span className="flex items-center gap-1 text-yellow-500">
                        <TriangleAlert className="h-4 w-4" />
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-sm">
                        This streak has not been extended today.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
