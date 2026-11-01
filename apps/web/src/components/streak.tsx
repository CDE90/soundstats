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
                <TooltipTrigger aria-label="This streak was not extended on the selected end date">
                    <span className="flex items-center gap-1 text-yellow-500">
                        <TriangleAlert className="h-4 w-4" />
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-sm">
                        This streak was not extended on the selected end date.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
