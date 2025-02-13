"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useState } from "react";

const navigationLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Feed", href: "/feed" },
] as const;

export function NavBar() {
    const { resolvedTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinkStyles =
        "relative text-muted-foreground hover:text-primary transition-colors duration-200 after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:origin-bottom-left hover:after:scale-x-100";

    return (
        <header className="border-b">
            <div className="flex items-center justify-between p-4 text-sm font-medium">
                <div className="text-2xl font-bold md:text-3xl">
                    <Link href="/">SoundStats</Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden items-center gap-6 md:flex">
                    {navigationLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={navLinkStyles}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <ModeToggle />

                    <SignedOut>
                        <SignInButton mode="modal">
                            <Button
                                variant="outline"
                                className="hidden md:inline-flex"
                            >
                                Sign In
                            </Button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <Button
                            variant="outline"
                            className="hidden p-0 md:inline-flex"
                        >
                            <UserButton
                                showName={true}
                                appearance={{
                                    layout: {
                                        shimmer: false,
                                    },
                                    baseTheme:
                                        resolvedTheme === "dark"
                                            ? dark
                                            : undefined,
                                    elements: {
                                        avatarBox: "hidden",
                                        userButtonOuterIdentifier: "px-4 py-2",
                                        userButtonTrigger: "focus:ring-0",
                                    },
                                }}
                            />
                        </Button>
                    </SignedIn>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMenuOpen && (
                <div className="border-t md:hidden">
                    <nav className="flex flex-col gap-4 p-4">
                        {navigationLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-muted-foreground transition-colors hover:text-primary"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="pt-2">
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Sign In
                                    </Button>
                                </SignInButton>
                            </SignedOut>
                            <SignedIn>
                                <Button
                                    variant="outline"
                                    className="w-full p-0"
                                >
                                    <UserButton
                                        showName={true}
                                        appearance={{
                                            layout: {
                                                shimmer: false,
                                            },
                                            baseTheme:
                                                resolvedTheme === "dark"
                                                    ? dark
                                                    : undefined,
                                            elements: {
                                                avatarBox: "hidden",
                                                userButtonOuterIdentifier:
                                                    "px-4 py-2",
                                                userButtonTrigger:
                                                    "focus:ring-0 w-full",
                                            },
                                        }}
                                    />
                                </Button>
                            </SignedIn>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
