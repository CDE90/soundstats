"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import Link from "next/link";

export function NavBar() {
    const { resolvedTheme } = useTheme();
    return (
        <header className="flex items-center justify-between gap-x-2 border-b p-4 text-sm font-medium">
            <div className="text-3xl font-bold">
                <Link href="/">Spotify Thing</Link>
            </div>
            <div className="flex items-center gap-4">
                <ModeToggle />

                <SignedOut>
                    <SignInButton mode="modal">
                        <Button variant="outline">Sign In</Button>
                    </SignInButton>
                </SignedOut>
                <SignedIn>
                    <Button variant="outline" className="p-0">
                        <UserButton
                            showName={true}
                            appearance={{
                                layout: {
                                    shimmer: false,
                                },
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                baseTheme:
                                    resolvedTheme === "dark" ? dark : undefined,
                                elements: {
                                    avatarBox: "hidden",
                                    userButtonOuterIdentifier: "px-4 py-2",
                                    userButtonTrigger: "focus:ring-0",
                                },
                            }}
                        />
                    </Button>
                </SignedIn>
            </div>
        </header>
    );
}
