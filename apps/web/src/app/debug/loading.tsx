import { PageLoading } from "@/components/page-layout";

export default function Loading() {
    return (
        <PageLoading
            title="Playback diagnostics"
            description="Your current Spotify playback information."
            narrow
        />
    );
}
