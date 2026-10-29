"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshFeedButton() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    return (
        <div>
            <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                    startTransition(() => {
                        router.refresh();
                    });
                }}
            >
                {pending ? "Refreshing activity…" : "Try again"}
            </Button>
            {pending && (
                <span className="sr-only" role="status">
                    Refreshing activity
                </span>
            )}
        </div>
    );
}
