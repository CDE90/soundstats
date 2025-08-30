import "@/styles/globals.css";

import { ourFileRouter } from "@/app/api/uploadthing/core";
import { NowPlayingWidget } from "@/components/now-playing-widget";
import { Footer } from "@/components/ui-parts/Footer";
import { NavBar } from "@/components/ui-parts/NavBar";
import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { IBM_Plex_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import { type Metadata } from "next";
import { CustomThemeProvider } from "@/lib/colorswitchcn/theme-provider";
import { connection } from "next/server";
import { Suspense } from "react";
import { extractRouterConfig } from "uploadthing/server";
import { CSPostHogProvider } from "./providers";
import { FontProvider } from "@/components/providers/font-provider";
import { Toaster } from "sonner";
import { getBaseUrl } from "@/server/lib";

const ppgoshaSans = localFont({
    src: [
        {
            path: "../../public/fonts/PPGoshaSans-Regular.otf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../../public/fonts/PPGoshaSans-Bold.otf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-gosha-sans",
    display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-ibm-plex-mono",
});

const geistSans = GeistSans;

export const metadata: Metadata = {
    title: {
        default: "SoundStats",
        template: `%s - SoundStats`,
    },
    description: "SoundStats - Your music statistics dashboard",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
    openGraph: {
        title: "SoundStats",
        description: "SoundStats - Your music statistics dashboard",
        siteName: "SoundStats",
        locale: "en_US",
        type: "website",
        images: [
            {
                url: "/og",
                width: 1200,
                height: 630,
                alt: "SoundStats - Your music statistics dashboard",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "SoundStats",
        description: "SoundStats - Your music statistics dashboard",
        images: ["/og"],
    },
    metadataBase: new URL(getBaseUrl()),
};

async function UTSSR() {
    await connection();
    return <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />;
}

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <Suspense>
            <ClerkProvider>
                <html
                    lang="en"
                    className={`${geistSans.variable} ${ppgoshaSans.variable} ${ibmPlexMono.variable} antialiased`}
                    suppressHydrationWarning
                >
                    <CSPostHogProvider>
                        <head>
                            {/* Blocking script to prevent font flicker */}
                            <script
                                dangerouslySetInnerHTML={{
                                    __html: `
                                        (function() {
                                            try {
                                                var font = localStorage.getItem('preferred-font');
                                                if (font === 'gosha') {
                                                    document.documentElement.classList.add('font-gosha');
                                                } else {
                                                    document.documentElement.classList.add('font-geist');
                                                }
                                            } catch (e) {
                                                document.documentElement.classList.add('font-geist');
                                            }
                                        })();
                                    `,
                                }}
                            />

                            {/* Apply dark class immediately based on custom theme system */}
                            <script
                                dangerouslySetInnerHTML={{
                                    __html: `
                                        (function() {
                                            try {
                                                var themeMode = localStorage.getItem('theme-mode') || 'system';
                                                var shouldBeDark = false;
                                                
                                                if (themeMode === 'dark') {
                                                    shouldBeDark = true;
                                                } else if (themeMode === 'system') {
                                                    shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                                }
                                                
                                                if (shouldBeDark) {
                                                    document.documentElement.classList.add('dark');
                                                } else {
                                                    document.documentElement.classList.remove('dark');
                                                }
                                            } catch (e) {
                                                // Fallback to system preference
                                                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                                                    document.documentElement.classList.add('dark');
                                                }
                                            }
                                        })();
                                    `,
                                }}
                            />

                            {process.env.NODE_ENV === "development" &&
                                !process.env.DISABLE_REACT_SCAN && (
                                    <script
                                        src="https://unpkg.com/react-scan/dist/auto.global.js"
                                        async
                                    />
                                )}
                        </head>
                        <Suspense>
                            <UTSSR />
                        </Suspense>
                        <body>
                            <CustomThemeProvider>
                                <FontProvider>
                                    <NavBar />
                                    <main>{children}</main>
                                    <Footer />
                                    <NowPlayingWidget />
                                    <Toaster />
                                </FontProvider>
                            </CustomThemeProvider>
                        </body>
                    </CSPostHogProvider>
                </html>
            </ClerkProvider>
        </Suspense>
    );
}
