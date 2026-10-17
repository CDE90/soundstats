import Image from "next/image";
import Link from "next/link";
import { Music2 } from "lucide-react";
import { SpotifyLink } from "@/components/spotify-link";

export function CurrentListenerTrack({
    userId,
    trackId,
    hasLocalTrack,
    song,
    artist,
    albumImage,
}: {
    userId: string;
    trackId?: string;
    hasLocalTrack: boolean;
    song: string;
    artist: string;
    albumImage?: string;
}) {
    const content = (
        <>
            {albumImage ? (
                <Image
                    src={albumImage}
                    alt=""
                    width={64}
                    height={64}
                    className="ss-feed-art"
                />
            ) : (
                <span className="ss-feed-art ss-feed-art-placeholder">
                    <Music2 aria-hidden="true" />
                </span>
            )}
            <div className="min-w-0">
                <p className="ss-feed-track-name line-clamp-2 text-sm font-medium">
                    {song}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                    {artist}
                </p>
            </div>
        </>
    );

    return (
        <>
            {trackId && hasLocalTrack ? (
                <Link
                    href={`/tracks/${encodeURIComponent(trackId)}?${new URLSearchParams({ user: userId })}`}
                    className="ss-feed-track-link"
                    title={`View listening details for ${song}`}
                >
                    {content}
                </Link>
            ) : (
                <div className="ss-feed-track-link">{content}</div>
            )}
            {trackId && (
                <SpotifyLink
                    type="track"
                    id={trackId}
                    name={song}
                    className="ss-feed-source"
                />
            )}
        </>
    );
}
