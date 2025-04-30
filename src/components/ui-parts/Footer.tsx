import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

const footerLinks = {
    links: [
        { name: "Dashboard", href: "/dashboard" },
        { name: "Import Historical Data", href: "/import" },
        { name: "Leaderboard", href: "/leaderboard" },
        { name: "GitHub", href: "https://github.com/CDE90/SoundStats" },
    ],
    legal: [
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
    ],
} as const;

export function Footer() {
    return (
        <footer className="w-full border-t bg-background">
            <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
                <div className="grid gap-12 sm:grid-cols-2">
                    {/* About Section */}
                    <div className="space-y-4">
                        <h4 className="text-base font-semibold">About</h4>
                        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                            SoundStats is an open-source project created to help
                            you explore your Spotify listening habits.
                        </p>
                    </div>

                    {/* Links Grid */}
                    <div className="grid gap-8 sm:grid-cols-2">
                        {/* Quick Links */}
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold">Links</h4>
                            <ul className="space-y-3">
                                {footerLinks.links.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Legal Links */}
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold">Legal</h4>
                            <ul className="space-y-3">
                                {footerLinks.legal.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                                        >
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Import Data CTA */}
                <div className="mt-12 text-center">
                    <p className="text-sm">
                        Missing historical data?{" "}
                        <Link
                            href="/import"
                            className="font-medium text-primary transition-colors hover:text-primary/90 hover:underline"
                        >
                            Import it here
                        </Link>
                    </p>
                </div>

                {/* Copyright */}
                <div className="mt-12 border-t pt-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        ©{" "}
                        <Suspense fallback="2025">
                            <CurrentYear />
                        </Suspense>{" "}
                        SoundStats. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

async function CurrentYear() {
    await connection();
    return new Date().getFullYear();
}
