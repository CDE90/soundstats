import { PageHeading } from "@/components/page-layout";
import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "SoundStats Privacy Policy.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="ss-page ss-legal-page">
            <PageHeading
                title="Privacy policy"
                description="Last updated: March 4, 2025"
            />
            <div className="ss-legal-layout">
                <nav aria-label="Document sections" className="ss-legal-nav">
                    {[
                        { id: "privacy-1", title: "1. Introduction" },
                        { id: "privacy-2", title: "2. Information We Collect" },
                        {
                            id: "privacy-3",
                            title: "3. How We Use Your Information",
                        },
                        {
                            id: "privacy-4",
                            title: "4. Data Sharing and Disclosure",
                        },
                        { id: "privacy-5", title: "5. Data Security" },
                        { id: "privacy-6", title: "6. Your Rights" },
                        { id: "privacy-7", title: "7. Data Retention" },
                        {
                            id: "privacy-8",
                            title: "8. Children&apos;s Privacy",
                        },
                        {
                            id: "privacy-9",
                            title: "9. Changes to This Privacy Policy",
                        },
                        { id: "privacy-10", title: "10. Contact Us" },
                    ].map((section) => (
                        <a key={section.id} href={`#${section.id}`}>
                            {section.title}
                        </a>
                    ))}
                </nav>
                <article className="ss-legal-body space-y-10">
                    <section id="privacy-1" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            1. Introduction
                        </h2>
                        <div className="space-y-4">
                            <p>
                                This Privacy Policy explains how SoundStats
                                collects, uses, and protects your information
                                when you use our service. We are committed to
                                ensuring that your privacy is protected and that
                                we comply with applicable data protection laws.
                            </p>
                        </div>
                    </section>

                    <section id="privacy-2" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            2. Information We Collect
                        </h2>
                        <div className="space-y-4">
                            <p>
                                When you use SoundStats, we collect the
                                following types of information:
                            </p>
                            <ul className="list-disc space-y-2 pl-6">
                                <li>
                                    <strong>Account Information:</strong> When
                                    you sign in with Spotify, we receive basic
                                    profile information including your username,
                                    profile picture, and email address.
                                </li>
                                <li>
                                    <strong>Spotify Listening Data:</strong> We
                                    collect data related to your Spotify
                                    listening history, including your most
                                    played tracks, artists, albums, and your
                                    listening patterns.
                                </li>
                                <li>
                                    <strong>Usage Data:</strong> We collect
                                    information about how you interact with
                                    SoundStats, including the features you use
                                    and the time spent on the platform.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section id="privacy-3" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            3. How We Use Your Information
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We use your information for the following
                                purposes:
                            </p>
                            <ul className="list-disc space-y-2 pl-6">
                                <li>To provide and maintain our service</li>
                                <li>
                                    To generate personalized music statistics
                                    and visualizations
                                </li>
                                <li>To improve and optimize our platform</li>
                                <li>
                                    To respond to your requests or inquiries
                                </li>
                                <li>To provide technical support</li>
                                <li>
                                    To detect and prevent security incidents
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section id="privacy-4" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            4. Data Sharing and Disclosure
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We do not sell, trade, or rent your personal
                                information to third parties. We may share your
                                information in the following circumstances:
                            </p>
                            <ul className="list-disc space-y-2 pl-6">
                                <li>
                                    <strong>Service Providers:</strong> We may
                                    share your information with third-party
                                    service providers that help us operate,
                                    deliver, and improve our service.
                                </li>
                                <li>
                                    <strong>Compliance with Laws:</strong> We
                                    may disclose your information if required to
                                    do so by law or in response to valid
                                    requests by public authorities.
                                </li>
                                <li>
                                    <strong>With Your Consent:</strong> We may
                                    share your information with your consent or
                                    at your direction.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section id="privacy-5" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            5. Data Security
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We implement appropriate security measures to
                                protect your personal information from
                                unauthorized access, alteration, disclosure, or
                                destruction. However, no method of transmission
                                over the Internet or electronic storage is 100%
                                secure, and we cannot guarantee absolute
                                security.
                            </p>
                        </div>
                    </section>

                    <section id="privacy-6" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            6. Your Rights
                        </h2>
                        <div className="space-y-4">
                            <p>
                                Depending on your location, you may have certain
                                rights regarding your personal information,
                                including:
                            </p>
                            <ul className="list-disc space-y-2 pl-6">
                                <li>
                                    The right to access your personal
                                    information
                                </li>
                                <li>
                                    The right to correct inaccurate or
                                    incomplete information
                                </li>
                                <li>
                                    The right to request deletion of your data
                                </li>
                                <li>
                                    The right to restrict or object to
                                    processing
                                </li>
                                <li>The right to data portability</li>
                            </ul>
                            <p>
                                To exercise these rights, please contact us
                                through the methods listed in Section 10.
                            </p>
                        </div>
                    </section>

                    <section id="privacy-7" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            7. Data Retention
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We retain your personal information only for as
                                long as necessary to fulfill the purposes
                                outlined in this Privacy Policy, unless a longer
                                retention period is required or permitted by
                                law. When you delete your account, we will
                                delete your personal information within a
                                reasonable time period.
                            </p>
                        </div>
                    </section>

                    <section id="privacy-8" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            8. Children&apos;s Privacy
                        </h2>
                        <div className="space-y-4">
                            <p>
                                Our service is not intended for individuals
                                under the age of 13. We do not knowingly collect
                                personal information from children under 13. If
                                you are a parent or guardian and believe that
                                your child has provided us with personal
                                information, please contact us, and we will take
                                steps to delete such information.
                            </p>
                        </div>
                    </section>

                    <section id="privacy-9" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            9. Changes to This Privacy Policy
                        </h2>
                        <div className="space-y-4">
                            <p>
                                We may update our Privacy Policy from time to
                                time. We will notify you of any changes by
                                posting the new Privacy Policy on this page and
                                updating the &quot;Last updated&quot; date. You
                                are advised to review this Privacy Policy
                                periodically for any changes.
                            </p>
                        </div>
                    </section>

                    <section id="privacy-10" className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            10. Contact Us
                        </h2>
                        <div className="space-y-4">
                            <p>
                                If you have any questions about this Privacy
                                Policy or our data practices, please contact us
                                through our GitHub repository or via the contact
                                information provided on our website.
                            </p>
                        </div>
                    </section>
                </article>
            </div>
        </div>
    );
}
