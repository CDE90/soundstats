import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { type MusicEntityType } from "@/lib/music-details";
import { cn } from "@/lib/utils";

export function SpotifyLink({
    type,
    id,
    name,
    showLabel = false,
    className,
}: {
    type: MusicEntityType;
    id: string;
    name: string;
    showLabel?: boolean;
    className?: string;
}) {
    return (
        <a
            href={`https://open.spotify.com/${type}/${encodeURIComponent(id)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${name} in Spotify (opens in a new tab)`}
            title={`Open ${name} in Spotify`}
            className={cn(
                "inline-flex shrink-0 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                showLabel ? "rounded-sm py-2" : "ss-icon-link ss-source-link",
                className,
            )}
        >
            {showLabel ? (
                <>
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
                    <span>Open in Spotify</span>
                </>
            ) : (
                <ExternalLink size={14} aria-hidden="true" />
            )}
        </a>
    );
}
