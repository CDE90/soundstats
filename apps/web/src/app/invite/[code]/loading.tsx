import { PageLoading } from "@/components/page-layout";

export default function Loading() {
    return (
        <PageLoading
            layout="form"
            title="You’re invited."
            description="A new connection starts with a shared soundtrack."
            narrow
        />
    );
}
