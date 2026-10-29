"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function ClientSearchParamsDropdown<T extends readonly string[]>({
    title,
    baseUrl,
    options,
    searchParam,
    defaultValue,
}: Readonly<{
    title: string;
    baseUrl: string;
    options: T;
    searchParam: string;
    defaultValue?: T[number];
}>) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const rawValue = searchParams.get(searchParam);
    const selectedValue =
        rawValue === "Count"
            ? "Plays"
            : rawValue === "Last 24 hours"
              ? "Today"
              : rawValue;
    return (
        <Select
            value={
                selectedValue && options.includes(selectedValue)
                    ? selectedValue
                    : defaultValue
            }
            onValueChange={(value) => {
                const url = new URL(
                    `${baseUrl}/leaderboard?${searchParams.toString()}`,
                );
                url.searchParams.set(searchParam, value);
                url.searchParams.set("page", "1");
                router.push(url.toString());
            }}
        >
            <SelectTrigger id={`leaderboard-${searchParam}`} className="w-full">
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
