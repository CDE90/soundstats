"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorSwatch } from "@/components/ui/color-swatch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/colorswitchcn/theme-provider";
import { presets } from "@/lib/colorswitchcn/theme-presets";
import { cn } from "@/lib/utils";
import type { ThemeStyleProps } from "@/lib/colorswitchcn/types";

export function ThemePicker() {
    const { themeState, resolvedTheme, applyThemePreset } = useTheme();
    const currentPreset = themeState.preset;
    const mode = resolvedTheme;
    const [error, setError] = React.useState<string | null>(null);

    // Get preset display name
    const getPresetLabel = (presetKey: string) => {
        return (
            presets[presetKey]?.label ??
            presetKey
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
        );
    };

    // Get safe color value, always returning a string even if undefined
    const getSafeColor = (
        styles: ThemeStyleProps,
        property: keyof ThemeStyleProps,
    ) => {
        if (!styles?.[property]) return "#cccccc";
        return styles[property];
    };

    // Apply theme preset with error handling
    const handlePresetChange = (preset: string) => {
        try {
            console.log(`ThemePicker: Applying preset ${preset}`);
            applyThemePreset(preset);
            setError(null);
        } catch (err) {
            console.error("Error applying theme preset:", err);
            setError(
                err instanceof Error
                    ? err.message
                    : "Unknown error applying theme",
            );
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={"outline"} className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <ColorSwatch
                            color={getSafeColor(
                                themeState.styles[mode],
                                "primary",
                            )}
                            size="sm"
                        />
                        <ColorSwatch
                            color={getSafeColor(
                                themeState.styles[mode],
                                "accent",
                            )}
                            size="sm"
                        />
                        <ColorSwatch
                            color={getSafeColor(
                                themeState.styles[mode],
                                "secondary",
                            )}
                            size="sm"
                        />
                    </div>
                    <span className="hidden sm:inline-block">
                        {getPresetLabel(currentPreset)}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="max-h-[300px] w-[220px] overflow-y-auto rounded-md bg-background shadow-lg"
            >
                {error && (
                    <>
                        <DropdownMenuLabel className="text-destructive">
                            Error: {error}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </>
                )}

                {Object.keys(presets).map((presetKey) => {
                    const isActive = currentPreset === presetKey;
                    const styles = presets[presetKey]?.styles[mode] ?? {};

                    return (
                        <DropdownMenuItem
                            key={presetKey}
                            className={cn(
                                "flex cursor-pointer items-center gap-2",
                                isActive &&
                                    "bg-accent font-medium text-accent-foreground",
                            )}
                            onClick={() => handlePresetChange(presetKey)}
                        >
                            <div className="flex gap-1">
                                <ColorSwatch
                                    color={getSafeColor(styles, "primary")}
                                    size="sm"
                                />
                                <ColorSwatch
                                    color={getSafeColor(styles, "accent")}
                                    size="sm"
                                />
                                <ColorSwatch
                                    color={getSafeColor(styles, "secondary")}
                                    size="sm"
                                />
                            </div>
                            <span>{getPresetLabel(presetKey)}</span>
                            {isActive && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
