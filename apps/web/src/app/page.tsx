import { SpotifyWordmark } from "@/components/spotify-wordmark";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    ArrowUpRight,
    ChartNoAxesCombined,
    Disc3,
    Github,
    History,
    Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const albums = [
    {
        name: "In Rainbows",
        artist: "Radiohead",
        image: "in-rainbows",
        id: "5vkqYmiPBYLaalcmjujWxK",
    },
    {
        name: "Blonde",
        artist: "Frank Ocean",
        image: "blonde",
        id: "3mH6qwIy9crq0I9YQbOuDf",
    },
    {
        name: "Currents",
        artist: "Tame Impala",
        image: "currents",
        id: "79dL7FLiJFOO0EoehUHQBv",
    },
    {
        name: "Melodrama",
        artist: "Lorde",
        image: "melodrama",
        id: "2B87zXm9bOWvAJdkJBTpzF",
    },
];

export default function HomePage() {
    return (
        <div className="ss-home">
            <section className="ss-hero" aria-labelledby="home-title">
                <div className="ss-hero-copy">
                    <h1 id="home-title">
                        Your music.
                        <br />
                        Your story.
                        <br />
                        On record.
                    </h1>
                    <p>
                        The songs you come back to. The artists you fall for.
                        Your listening tells a story. Find yours, all year
                        round.
                    </p>
                    <div className="ss-hero-actions">
                        <Link href="/dashboard" className="ss-button">
                            Explore your listening{" "}
                            <ArrowUpRight size={19} aria-hidden="true" />
                        </Link>
                        <a
                            href="https://github.com/CDE90/SoundStats"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ss-text-link"
                        >
                            <Github size={17} aria-hidden="true" /> Open source
                        </a>
                    </div>
                    <div className="ss-hero-note">
                        Made for your Spotify listening history.
                    </div>
                </div>
                <div className="ss-record-shelf">
                    <div className="ss-shelf-heading">
                        <span>A few familiar favourites</span>
                        <Disc3 size={20} aria-hidden="true" />
                    </div>
                    <div className="ss-album-grid">
                        {albums.map((album, index) => (
                            <a
                                key={album.id}
                                href={`https://open.spotify.com/album/${album.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ss-album"
                                aria-label={`Open ${album.name} by ${album.artist} in Spotify (opens in a new tab)`}
                            >
                                <Image
                                    src={`/design-artwork/${album.image}.jpg`}
                                    alt={`${album.name} album artwork`}
                                    width={300}
                                    height={300}
                                    priority={index < 2}
                                    sizes="(max-width: 640px) 40vw, (max-width: 1000px) 36vw, 230px"
                                />
                                <span className="ss-album-title">
                                    {album.name}
                                    <ArrowUpRight
                                        size={14}
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="ss-album-artist">
                                    {album.artist}
                                </span>
                            </a>
                        ))}
                    </div>
                    <a
                        className="ss-shelf-attribution"
                        href="https://open.spotify.com"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span>Find your favourites on</span>
                        <SpotifyWordmark />
                    </a>
                </div>
            </section>

            <section
                className="ss-possibilities"
                aria-labelledby="possibilities-title"
            >
                <div className="ss-section-intro">
                    <h2 id="possibilities-title">
                        More than a year-end recap.
                    </h2>
                    <p>
                        Your music doesn’t wait until December.
                        <br />
                        Your stats shouldn’t either.
                    </p>
                </div>
                <div className="ss-feature-grid">
                    <div className="ss-feature">
                        <ChartNoAxesCombined aria-hidden="true" />
                        <h3>See your listening take shape.</h3>
                        <p>
                            Follow your daily playtime, compare periods, and
                            find the patterns in your listening.
                        </p>
                    </div>
                    <div className="ss-feature">
                        <Disc3 aria-hidden="true" />
                        <h3>Meet your heavy rotation.</h3>
                        <p>
                            Explore your most-played artists, tracks, and
                            albums. See what stays and what’s new.
                        </p>
                    </div>
                    <div className="ss-feature">
                        <Users aria-hidden="true" />
                        <h3>Find your people’s sound.</h3>
                        <p>
                            See what friends are playing, visit their
                            dashboards, and compare your listening.
                        </p>
                    </div>
                </div>
            </section>

            <section className="ss-history-callout">
                <History size={28} strokeWidth={1.5} aria-hidden="true" />
                <div>
                    <h2>Your old favourites belong here, too.</h2>
                    <p>
                        Import your Spotify history to bring years of listening
                        into the picture.
                    </p>
                </div>
                <Link href="/import" className="ss-button ss-button-secondary">
                    Import your history{" "}
                    <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
            </section>

            <section className="ss-faq" aria-labelledby="faq-title">
                <div>
                    <h2 id="faq-title">Before you press play.</h2>
                    <p>A few things you might be wondering.</p>
                </div>
                <Accordion type="single" collapsible>
                    <AccordionItem value="what">
                        <AccordionTrigger>What is SoundStats?</AccordionTrigger>
                        <AccordionContent>
                            SoundStats is an open-source home for your Spotify
                            listening statistics. Explore your listening
                            activity, discover your most-played music, and see
                            what your friends are listening to.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="how">
                        <AccordionTrigger>
                            How do I get started?
                        </AccordionTrigger>
                        <AccordionContent>
                            Sign in and connect your Spotify account. SoundStats
                            collects new listening activity from then on. You
                            can also import your Spotify history to explore
                            earlier listening.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="history">
                        <AccordionTrigger>
                            Can I bring my listening history?
                        </AccordionTrigger>
                        <AccordionContent>
                            Yes. Request your extended streaming history from
                            Spotify, then visit the{" "}
                            <Link href="/import" className="underline">
                                import page
                            </Link>{" "}
                            to upload it.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="source">
                        <AccordionTrigger>
                            Can I contribute to the project?
                        </AccordionTrigger>
                        <AccordionContent>
                            Yes. Browse the source, suggest a feature, or
                            contribute code on{" "}
                            <a
                                href="https://github.com/CDE90/SoundStats"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                            >
                                GitHub
                            </a>
                            .
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="privacy">
                        <AccordionTrigger>
                            How do I manage my account and data?
                        </AccordionTrigger>
                        <AccordionContent>
                            Open your account menu to manage your account or
                            delete it. Read our{" "}
                            <Link href="/privacy" className="underline">
                                privacy policy
                            </Link>{" "}
                            for details about the data SoundStats collects.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </section>
        </div>
    );
}
