import Image from "next/image";

export function SpotifyWordmark({ width = 79 }: { width?: number }) {
    return (
        <>
            <Image
                src="/spotify-assets/Full_Logo_Black_RGB.svg"
                alt="Spotify"
                width={823}
                height={225}
                style={{ width: Math.max(70, width), height: "auto" }}
                className="dark:hidden"
            />
            <Image
                src="/spotify-assets/Full_Logo_White_RGB.svg"
                alt="Spotify"
                width={823}
                height={225}
                style={{ width: Math.max(70, width), height: "auto" }}
                className="hidden dark:block"
            />
        </>
    );
}
