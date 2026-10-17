import { MusicDetailPage } from "@/components/music-detail-page";
import { type Metadata } from "next";

export const metadata: Metadata = { title: "Album listening details" };

export default async function AlbumPage({
    params,
    searchParams,
}: {
    params: Promise<{ albumId: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return (
        <MusicDetailPage
            type="album"
            id={(await params).albumId}
            searchParams={await searchParams}
        />
    );
}
