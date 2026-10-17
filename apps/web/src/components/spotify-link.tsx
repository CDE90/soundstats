import Image from "next/image";
import { type MusicEntityType } from "@/lib/music-details";

export function SpotifyLink({
    type,
    id,
    name,
    showLabel = false,
}: {
    type: MusicEntityType;
    id: string;
    name: string;
    showLabel?: boolean;
}) {
    return (
        <a
            href={`https://open.spotify.com/${type}/${encodeURIComponent(id)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${name} in Spotify (opens in a new tab)`}
            title={`Open ${name} in Spotify`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${showLabel ? "py-2" : "p-3"}`}
        >
            <Image
                src="/spotify-assets/Spotify_Icon_RGB_Black.png"
                alt=""
                width={21}
                height={21}
                className="block dark:hidden"
            />
            <Image
                src="/spotify-assets/Spotify_Icon_RGB_White.png"
                alt=""
                width={21}
                height={21}
                className="hidden dark:block"
            />
            {showLabel && <span>Open in Spotify</span>}
        </a>
    );
}
