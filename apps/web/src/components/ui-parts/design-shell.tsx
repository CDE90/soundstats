import { type ReactNode } from "react";

export function DesignShell({ children }: { children: ReactNode }) {
    return (
        <div className="site-shell sound-design">
            <a href="#main-content" className="ss-skip-link">
                Skip to content
            </a>
            {children}
        </div>
    );
}
