export const metadata = {
    title: "Terms of Service - SoundStats",
    description:
        "Terms of Service for SoundStats - Your music statistics dashboard",
};

export default function TermsPage() {
    return (
        <div className="py-8 md:py-12">
            <div className="mx-auto max-w-4xl space-y-10">
                <div className="text-center">
                    <h1 className="text-3xl font-bold md:text-4xl">
                        Terms of Service
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Last updated: {"March 4, 2025"}
                    </p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        1. Acceptance of Terms
                    </h2>
                    <div className="space-y-4">
                        <p>
                            By accessing or using SoundStats, you agree to be
                            bound by these Terms of Service. If you do not agree
                            to these terms, please do not use our service.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        2. Description of Service
                    </h2>
                    <div className="space-y-4">
                        <p>
                            SoundStats provides a platform for users to analyze
                            their Spotify listening habits and statistics. We
                            offer visualizations, analytics, and insights based
                            on your Spotify data.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">3. User Accounts</h2>
                    <div className="space-y-4">
                        <p>
                            To use SoundStats, you must sign in with your
                            Spotify account. You are responsible for maintaining
                            the confidentiality of your account information and
                            for all activities that occur under your account.
                        </p>
                        <p>
                            You may revoke access at any time by visiting your
                            account settings. Revoking access will also remove
                            all your data from our system.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        4. Data Usage and Privacy
                    </h2>
                    <div className="space-y-4">
                        <p>
                            We collect only the necessary data to provide our
                            service. This includes your Spotify listening
                            history, top artists, tracks, and related
                            information. For more details on how we handle your
                            data, please refer to our Privacy Policy.
                        </p>
                        <p>
                            We will never sell your personal information to
                            third parties. Your Spotify account information is
                            used solely to provide you with our service.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        5. Limitations of Service
                    </h2>
                    <div className="space-y-4">
                        <p>
                            SoundStats relies on data from Spotify&apos;s API.
                            As such, our service is subject to the limitations
                            and availability of Spotify&apos;s services. We
                            strive to provide accurate and up-to-date
                            information, but we cannot guarantee the
                            completeness or accuracy of the data.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        6. Modifications to Service
                    </h2>
                    <div className="space-y-4">
                        <p>
                            We reserve the right to modify, suspend, or
                            discontinue SoundStats at any time, with or without
                            notice. We also reserve the right to update these
                            Terms of Service at any time. Continued use of
                            SoundStats after any modifications indicates your
                            acceptance of the updated terms.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        7. Disclaimer of Warranties
                    </h2>
                    <div className="space-y-4">
                        <p>
                            SoundStats is provided &quot;as is&quot; without
                            warranties of any kind, either express or implied.
                            We do not warrant that the service will be
                            uninterrupted, secure, or error-free.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        8. Limitation of Liability
                    </h2>
                    <div className="space-y-4">
                        <p>
                            In no event shall SoundStats be liable for any
                            indirect, incidental, special, consequential, or
                            punitive damages, or any loss of profits or
                            revenues, whether incurred directly or indirectly.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">
                        9. Contact Information
                    </h2>
                    <div className="space-y-4">
                        <p>
                            If you have any questions about these Terms of
                            Service, please contact us via our GitHub repository
                            or through the contact information provided on our
                            website.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
