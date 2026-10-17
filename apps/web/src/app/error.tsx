"use client";

import { PageHeading } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="ss-page ss-page-narrow" role="alert">
            <PageHeading
                title="This page couldn’t load."
                description="Try loading it again. If the problem continues, come back in a little while."
            />
            <div className="flex flex-wrap gap-3">
                <Button onClick={reset}>Try again</Button>
                <Button asChild variant="outline">
                    <Link href="/">Back to home</Link>
                </Button>
            </div>
        </div>
    );
}
