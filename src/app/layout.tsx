import "@/styles/globals.css";

import { ourFileRouter } from "@/app/api/uploadthing/core";
import { NowPlayingWidget } from "@/components/now-playing-widget";
import { Footer } from "@/components/ui-parts/Footer";
import { NavBar } from "@/components/ui-parts/NavBar";
import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { connection } from "next/server";
import { Suspense } from "react";
import { extractRouterConfig } from "uploadthing/server";
import { CSPostHogProvider } from "./providers";

export const metadata: Metadata = {
    title: "Spotify Thing",
    description: "Spotify Thing - Your Spotify dashboard",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

async function UTSSR() {
    await connection();
    return <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />;
}

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <ClerkProvider>
            <html
                lang="en"
                className={`${GeistSans.variable} antialiased`}
                suppressHydrationWarning
            >
                <CSPostHogProvider>
                    <head>
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
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="system"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <NavBar />
                            <main>{children}</main>
                            <Footer />
                            <NowPlayingWidget />
                        </ThemeProvider>
                    </body>
                </CSPostHogProvider>
            </html>
        </ClerkProvider>
    );
}
