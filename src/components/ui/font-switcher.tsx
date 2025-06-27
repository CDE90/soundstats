"use client";

import { useFont } from "@/components/providers/font-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Type } from "lucide-react";

export function FontSwitcher() {
    const { font, setFont } = useFont();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <Type className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Toggle font</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => setFont("geist")}
                    className={font === "geist" ? "bg-accent" : ""}
                >
                    <span className="font-sans">Geist Sans</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setFont("gosha")}
                    className={font === "gosha" ? "bg-accent" : ""}
                >
                    <span className="font-gosha">PP Gosha Sans</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
