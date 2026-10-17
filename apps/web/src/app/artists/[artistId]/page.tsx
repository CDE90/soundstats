import { MusicDetailPage } from "@/components/music-detail-page";
import { type Metadata } from "next";

export const metadata: Metadata = { title: "Artist listening details" };

export default async function ArtistPage({
    params,
    searchParams,
}: {
    params: Promise<{ artistId: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return (
        <MusicDetailPage
            type="artist"
            id={(await params).artistId}
            searchParams={await searchParams}
        />
    );
}
