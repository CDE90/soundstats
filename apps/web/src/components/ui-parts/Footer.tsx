import { FontSwitcher } from "@/components/ui/font-switcher";
import { ThemePicker } from "@/components/ui/theme-picker";
import { AudioLines } from "lucide-react";
import { SpotifyWordmark } from "@/components/spotify-wordmark";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="ss-footer">
            <div className="ss-footer-top">
                <div>
                    <Link href="/" className="ss-brand">
                        <AudioLines
                            aria-hidden="true"
                            className="ss-brand-icon"
                        />
                        SoundStats
                    </Link>
                    <p>A little closer to the music you love.</p>
                </div>
                <nav aria-label="Footer navigation" className="ss-footer-links">
                    <Link href="/import">Import history</Link>
                    <a
                        href="https://github.com/CDE90/SoundStats"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub
                    </a>
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/terms">Terms</Link>
                </nav>
            </div>
            <div className="ss-footer-bottom">
                <span>An open-source project by Ethan Coward.</span>
                <div className="ss-footer-preferences">
                    <FontSwitcher />
                    <ThemePicker />
                </div>
                <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-attribution"
                >
                    <span>Music data from</span>
                    <SpotifyWordmark width={84} />
                </a>
            </div>
        </footer>
    );
}
