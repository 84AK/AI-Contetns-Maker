"use client";

import { useAppStore } from "@/store/useAppStore";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const sidebarExpanded = useAppStore(s => s.sidebarExpanded);
    const sidebarW = sidebarExpanded ? 220 : 68;

    return (
        <main
            className="flex-1 flex flex-col pb-24 md:pb-0 hidden-md-ml w-full overflow-x-hidden"
            style={{ "--sidebar-w": `${sidebarW}px` } as React.CSSProperties}
        >
            <div className="w-full max-w-4xl mx-auto min-h-screen px-4 py-6 md:px-8 md:py-8">
                {children}
            </div>
        </main>
    );
}
