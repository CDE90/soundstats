"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TableSearchProps {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}

export function TableSearch({
    placeholder,
    value,
    onChange,
}: TableSearchProps) {
    return (
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10"
            />
        </div>
    );
}
