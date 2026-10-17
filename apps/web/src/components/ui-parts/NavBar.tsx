"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useTheme } from "@/lib/colorswitchcn/theme-provider";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AudioLines, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FriendsNotificationBadge } from "./FriendsNotificationBadge";

const navigationLinks = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Feed", href: "/feed" },
    { name: "Friends", href: "/friends" },
    { name: "Invite", href: "/invite" },
] as const;

export function NavBar() {
    const { resolvedTheme } = useTheme();
    const pathname = usePathname();
    const [openPath, setOpenPath] = useState<string | null>(null);
    const isMenuOpen = openPath === pathname;

    function navLinks() {
        return navigationLinks.map((link) => (
            <Link
                key={link.href}
                href={link.href}
                aria-current={
                    pathname === link.href ||
                    (link.href !== "/" &&
                        pathname.startsWith(`${link.href}/`)) ||
                    (link.href === "/dashboard" &&
                        /^\/(artists|albums|tracks)\//.test(pathname))
                        ? "page"
                        : undefined
                }
                className="ss-nav-link"
                onClick={() => setOpenPath(null)}
            >
                {link.name}
                {link.name === "Friends" && <FriendsNotificationBadge />}
            </Link>
        ));
    }

    return (
        <header className="ss-header">
            <div className="ss-nav-inner">
                <Link
                    href="/"
                    className="ss-brand"
                    aria-label="SoundStats home"
                >
                    <AudioLines aria-hidden="true" className="ss-brand-icon" />
                    SoundStats
                </Link>
                <nav aria-label="Main navigation" className="ss-desktop-nav">
                    {navLinks()}
                </nav>
                <div className="ss-nav-actions">
                    <ModeToggle />
                    <SignedOut>
                        <SignInButton mode="modal">
                            <Button className="ss-sign-in">Sign in</Button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton
                            showName
                            appearance={{
                                baseTheme:
                                    resolvedTheme === "dark" ? dark : undefined,
                                elements: {
                                    userButtonOuterIdentifier: "ss-user-name",
                                    avatarBox: "h-8 w-8",
                                },
                            }}
                        />
                    </SignedIn>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ss-menu-toggle"
                        aria-label={
                            isMenuOpen ? "Close navigation" : "Open navigation"
                        }
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-navigation"
                        onClick={() =>
                            setOpenPath(isMenuOpen ? null : pathname)
                        }
                    >
                        {isMenuOpen ? (
                            <X aria-hidden="true" />
                        ) : (
                            <Menu aria-hidden="true" />
                        )}
                    </Button>
                </div>
            </div>
            {isMenuOpen && (
                <nav
                    id="mobile-navigation"
                    aria-label="Mobile navigation"
                    className="ss-mobile-nav"
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setOpenPath(null);
                            document
                                .querySelector<HTMLButtonElement>(
                                    ".ss-menu-toggle",
                                )
                                ?.focus();
                        }
                    }}
                >
                    {navLinks()}
                    <SignedOut>
                        <SignInButton mode="modal">
                            <Button className="ss-mobile-sign-in">
                                Sign in
                            </Button>
                        </SignInButton>
                    </SignedOut>
                </nav>
            )}
        </header>
    );
}
