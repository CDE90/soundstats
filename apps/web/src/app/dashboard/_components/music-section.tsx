"use client";

import {
    useCallback,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";
import { Grid2X2, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotifyWordmark } from "@/components/spotify-wordmark";
import styles from "./music-section.module.css";

type Layout = "cards" | "list";
const eventName = "soundstats:dashboard-layout";
const temporaryPreferences = new Map<string, Layout>();

function subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener(eventName, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(eventName, callback);
    };
}

function useLayoutPreference(section: "rankings" | "streaks") {
    const fallback: Layout = section === "rankings" ? "cards" : "list";
    const key = `soundstats.dashboard.${section}.layout`;
    const snapshot = useCallback(() => {
        if (temporaryPreferences.has(key))
            return temporaryPreferences.get(key)!;
        try {
            const saved = window.localStorage.getItem(key);
            return saved === "cards" || saved === "list" ? saved : fallback;
        } catch {
            return fallback;
        }
    }, [key, fallback]);
    const layout = useSyncExternalStore(subscribe, snapshot, () => fallback);
    function setLayout(value: Layout) {
        try {
            window.localStorage.setItem(key, value);
            temporaryPreferences.delete(key);
        } catch {
            temporaryPreferences.set(key, value);
        }
        window.dispatchEvent(new Event(eventName));
    }
    return [layout, setLayout] as const;
}

export function DashboardMusicSection({
    section,
    title,
    tabs,
}: {
    section: "rankings" | "streaks";
    title: string;
    tabs: { id: string; label: string; content: ReactNode }[];
}) {
    const [layout, setLayout] = useLayoutPreference(section);
    const [active, setActive] = useState(tabs[0]!.id);
    const label = section === "rankings" ? "Top music" : "Streaks";
    return (
        <section
            className={styles.section}
            data-music-layout={layout}
            aria-labelledby={`${section}-title`}
        >
            <div className={styles.heading}>
                <h2 id={`${section}-title`}>{title}</h2>
                <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attribution}
                >
                    <span>Music from</span>
                    <SpotifyWordmark width={74} />
                </a>
            </div>
            <Tabs value={active} onValueChange={setActive}>
                <div className={styles.toolbar}>
                    <TabsList
                        className={styles.tabs}
                        aria-label={`${label} category`}
                    >
                        {tabs.map((tab) => (
                            <TabsTrigger
                                className={styles.tab}
                                key={tab.id}
                                value={tab.id}
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <div
                        className={styles.layouts}
                        role="group"
                        aria-label={`${label} layout`}
                    >
                        {(
                            [
                                ["cards", Grid2X2, "Cards"],
                                ["list", List, "List"],
                            ] as const
                        ).map(([value, Icon, name]) => (
                            <button
                                key={value}
                                type="button"
                                className="ss-icon-link"
                                aria-pressed={layout === value}
                                aria-label={`Show ${label.toLowerCase()} as ${name.toLowerCase()}`}
                                title={name}
                                onClick={() => setLayout(value)}
                            >
                                <Icon size={16} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </div>
                {tabs.map((tab) => (
                    <TabsContent
                        key={tab.id}
                        value={tab.id}
                        className={styles.content}
                    >
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    );
}
