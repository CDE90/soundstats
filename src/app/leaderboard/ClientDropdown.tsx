"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function ClientSearchParamsDropdown({
    title,
    baseUrl,
    options,
    searchParam,
    defaultValue,
}: Readonly<{
    title: string;
    baseUrl: string;
    options: string[];
    searchParam: string;
    defaultValue?: string;
}>) {
    const searchParams = useSearchParams();
    const router = useRouter();

    return (
        <Select
            value={searchParams.get(searchParam) ?? defaultValue}
            onValueChange={(value) => {
                const url = new URL(
                    `${baseUrl}/leaderboard?${searchParams.toString()}`,
                );
                url.searchParams.set(searchParam, value);
                router.push(url.toString());
            }}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder={title} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
