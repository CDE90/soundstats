import { Skeleton } from "@/components/ui/skeleton";
import { TopMusicSkeleton } from "./_components/top-music";

export default function Loading() {
    return (
        <div
            className="ss-dashboard"
            role="status"
            aria-busy="true"
            aria-label="Loading your listening statistics"
        >
            <header className="ss-dashboard-heading">
                <div>
                    <p className="ss-dashboard-owner">Your listening</p>
                    <h1>Your sound, in view.</h1>
                </div>
                <Skeleton className="h-11 w-64" />
            </header>
            <div className="ss-metrics">
                {[
                    "Minutes listened",
                    "Artists explored",
                    "Different tracks",
                    "Listening streak",
                ].map((label) => (
                    <div key={label} className="ss-metric">
                        <span className="ss-metric-label">{label}</span>
                        <Skeleton className="h-12 w-24" />
                    </div>
                ))}
            </div>
            <div className="ss-comparison-note">
                <Skeleton className="h-3 w-64" />
            </div>
            <section className="ss-activity">
                <div className="ss-panel-heading">
                    <div>
                        <h2>The rhythm of your days.</h2>
                        <p>How your listening time adds up.</p>
                    </div>
                </div>
                <Skeleton className="h-80 w-full" />
            </section>
            <section className="ss-rotation">
                <div className="ss-section-intro">
                    <h2>Your heavy rotation.</h2>
                </div>
                <Skeleton className="mb-5 h-9 w-52" />
                <TopMusicSkeleton limit={5} />
            </section>
        </div>
    );
}
