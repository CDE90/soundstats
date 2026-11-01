import { PageHeading } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="ss-page ss-page-narrow">
            <PageHeading
                title="This one’s gone quiet."
                description="We couldn’t find this page. The link may be incomplete, or the music may no longer be available."
            />
            <div className="flex flex-wrap gap-3">
                <Button asChild>
                    <Link href="/dashboard">Your dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/">Back to home</Link>
                </Button>
            </div>
        </div>
    );
}
