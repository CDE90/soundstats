import { MusicDetailPage } from "@/components/music-detail-page";
import { type Metadata } from "next";

export const metadata: Metadata = { title: "Track listening details" };

export default async function TrackPage({
    params,
    searchParams,
}: {
    params: Promise<{ trackId: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return (
        <MusicDetailPage
            type="track"
            id={(await params).trackId}
            searchParams={await searchParams}
        />
    );
}
