import Image from "next/image";
import Link from "next/link";
import { SpotifyLink } from "@/components/spotify-link";
import {
    musicDetailHref,
    type MusicEntityType,
    type MusicDetailContext,
} from "@/lib/music-details";
import { dateFormatter } from "@/lib/utils";

export function MusicItem({
    type,
    id,
    name,
    imageUrl,
    userId,
    dateRange,
}: MusicDetailContext & {
    type: MusicEntityType;
    id: string;
    name: string;
    imageUrl: string | null;
}) {
    return (
        <div className="flex min-h-12 items-center gap-1 sm:gap-2">
            {imageUrl && (
                <a
                    href={`https://open.spotify.com/${type}/${encodeURIComponent(id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${name} in Spotify (opens in a new tab)`}
                    className="shrink-0 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <Image
                        src={imageUrl}
                        alt={name}
                        width={48}
                        height={48}
                        className="h-10 w-10 rounded-[4px] object-contain xs:h-12 xs:w-12 lg:rounded-[8px]"
                    />
                </a>
            )}
            <Link
                href={musicDetailHref(type, id, {
                    userId,
                    dateRange: {
                        from: new Date(dateFormatter(dateRange.from)),
                        to: new Date(dateFormatter(dateRange.to)),
                    },
                })}
                title={`View listening details for ${name}`}
                className="min-w-0 flex-1 rounded-sm text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            >
                <span className="line-clamp-2 xs:line-clamp-none">{name}</span>
            </Link>
            <SpotifyLink type={type} id={id} name={name} />
        </div>
    );
}
