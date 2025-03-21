import { BetaWarningBanner } from "@/components/beta-warning-banner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
    return (
        <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-between">
            <BetaWarningBanner />

            {/* Hero Section */}
            <div className="flex w-full flex-col items-center gap-8 px-4 py-16 text-center">
                <div className="max-w-3xl space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                        Your Spotify Statistics,{" "}
                        <span className="bg-gradient-to-r from-green-500 to-green-700 bg-clip-text text-transparent dark:from-green-400 dark:to-green-600">
                            Reimagined
                        </span>
                    </h1>

                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                        Dive deep into your listening habits with detailed
                        analytics, discover your top artists and tracks, and
                        explore your music journey through beautiful
                        visualizations - all year round.
                    </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <Link
                        href="/dashboard"
                        className={buttonVariants({
                            variant: "default",
                            size: "lg",
                        })}
                    >
                        View Your Stats
                    </Link>

                    <Link
                        href="https://github.com/CDE90/SoundStats"
                        className={cn(
                            buttonVariants({
                                variant: "outline",
                                size: "lg",
                            }),
                            "",
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span className="text-yellow-400">
                            <Star className="h-5 w-5" fill="currentColor" />
                        </span>
                        Star on GitHub
                    </Link>
                </div>

                {/* Feature Cards */}
                <div className="mt-8 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Detailed Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Get comprehensive insights into your listening
                                patterns with daily, weekly, and monthly
                                breakdowns.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Top Charts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Discover your most-played artists, albums, and
                                tracks with beautiful visualizations.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Always Available
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                Don&apos;t wait for Spotify Wrapped - access
                                your listening insights anytime, all year round.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* FAQs Section */}
            <div className="w-full border-y px-4 py-16">
                <div className="mx-auto max-w-6xl">
                    <h2 className="mb-8 text-center text-3xl font-bold">
                        Frequently Asked Questions
                    </h2>
                    <div className="mx-auto max-w-3xl">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    What is SoundStats?
                                </AccordionTrigger>
                                <AccordionContent>
                                    SoundStats is an open-source project created
                                    to help music lovers explore their listening
                                    habits.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>
                                    How does it work?
                                </AccordionTrigger>
                                <AccordionContent>
                                    Simply sign in with your Spotify account and
                                    we&apos;ll start analyzing your music
                                    listening habits. Our dashboard updates
                                    regularly to show you your latest statistics
                                    and trends.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>
                                    Is it open source?
                                </AccordionTrigger>
                                <AccordionContent>
                                    Yes. SoundStats is completely open source.
                                    View the code, contribute, or fork the
                                    project to create your own version. We
                                    believe in transparency and community-driven
                                    development.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-4">
                                <AccordionTrigger>
                                    Can I load historical data?
                                </AccordionTrigger>
                                <AccordionContent>
                                    Yes, you can import historical data from
                                    Spotify. Visit the{" "}
                                    <Link
                                        href="/import"
                                        className="font-medium text-blue-500 transition-colors hover:text-blue-500/90 hover:underline"
                                    >
                                        Import
                                    </Link>{" "}
                                    page to learn more.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-5">
                                <AccordionTrigger>
                                    How can I request a feature?
                                </AccordionTrigger>
                                <AccordionContent>
                                    If you have a feature request, please open
                                    an issue on our GitHub repository. We are
                                    always open to new ideas and suggestions.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-6">
                                <AccordionTrigger>
                                    What data do you collect?
                                </AccordionTrigger>
                                <AccordionContent>
                                    We only collect the necessary data to
                                    analyze your listening habits. Your Spotify
                                    account information is never shared with
                                    third parties.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-7">
                                <AccordionTrigger>
                                    How do I revoke access?
                                </AccordionTrigger>
                                <AccordionContent>
                                    You can revoke access at any time by opening
                                    the account page by clicking on your name in
                                    the top right corner, and selecting
                                    &quot;Manage Account&quot;, then
                                    &quot;Security&quot;, and finally
                                    &quot;Delete account&quot;. Note: this will
                                    also remove your access to all your data.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            </div>
        </div>
    );
}
