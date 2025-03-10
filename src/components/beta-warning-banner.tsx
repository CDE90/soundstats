"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

export function BetaWarningBanner() {
    const [isVisible, setIsVisible] = useState(false);

    // Check localStorage on component mount
    useEffect(() => {
        const bannerDismissed = localStorage.getItem("betaBannerDismissed");
        setIsVisible(bannerDismissed !== "true");
    }, []);

    const dismissBanner = () => {
        localStorage.setItem("betaBannerDismissed", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="container mx-auto pt-4">
            <Alert className="relative border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/50">
                <AlertDescription className="flex items-center justify-between">
                    <span className="font-medium">
                        SoundStats is currently in closed beta. If you
                        haven&apos;t been invited, you will not be able to see
                        your listening data, or otherwise use the app.
                    </span>
                    <button
                        onClick={dismissBanner}
                        className="ml-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
