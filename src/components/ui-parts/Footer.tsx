import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full border-t bg-background">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="grid gap-8 sm:grid-cols-2">
                    <div>
                        <h4 className="mb-4 text-sm font-semibold">About</h4>
                        <p className="text-sm text-muted-foreground">
                            Spotify Thing is an open-source project created to
                            help music lovers explore their listening habits.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <h4 className="mb-4 text-sm font-semibold">
                                Links
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link
                                        href="/dashboard"
                                        className="hover:text-foreground"
                                    >
                                        Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/import"
                                        className="hover:text-foreground"
                                    >
                                        Import Historical Data
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="https://github.com/CDE90/web-spotify-thing"
                                        className="hover:text-foreground"
                                    >
                                        GitHub
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="mb-4 text-sm font-semibold">
                                Legal
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <Link
                                        href="/privacy"
                                        className="hover:text-foreground"
                                    >
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/terms"
                                        className="hover:text-foreground"
                                    >
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="pt-8 text-center text-sm text-muted-foreground">
                    <p>
                        Missing historical data?{" "}
                        <Link
                            href="/import"
                            className="font-medium text-foreground hover:underline"
                        >
                            Import it here
                        </Link>
                    </p>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    <p>
                        © <CurrentYear /> Spotify Thing. Not affiliated with
                        Spotify AB.
                    </p>
                </div>
            </div>
        </footer>
    );
}

async function CurrentYear() {
    "use cache";
    return new Date().getFullYear();
}
