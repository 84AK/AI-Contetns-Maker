import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ContentType = "cardnews" | "detail-page" | "shorts";

export interface GeneratedContent {
    id: string;
    type: ContentType;
    title: string;
    businessName: string;
    productName: string;
    content: Record<string, unknown>;
    promptText: string;
    createdAt: string;
}

interface UserProfile {
    name: string;
    businessType: string;
    avatar: string;
}

interface AppState {
    user: UserProfile;
    history: GeneratedContent[];
    sidebarExpanded: boolean;
    globalToast: { message: string; type: "error" | "info" | "success" } | null;

    updateProfile: (data: Partial<UserProfile>) => void;
    addToHistory: (item: GeneratedContent) => void;
    removeFromHistory: (id: string) => void;
    clearHistory: () => void;
    setSidebarExpanded: (expanded: boolean) => void;
    setGlobalToast: (toast: { message: string; type: "error" | "info" | "success" } | null) => void;
}

export const useAppStore = create<AppState>()(
    persist<AppState>(
        (set) => ({
            user: { name: "", businessType: "", avatar: "🏪" },
            history: [],
            sidebarExpanded: false,
            globalToast: null,

            updateProfile: (data: Partial<UserProfile>) =>
                set((state: AppState) => ({ user: { ...state.user, ...data } })),

            addToHistory: (item: GeneratedContent) =>
                set((state: AppState) => ({
                    history: [item, ...state.history].slice(0, 50),
                })),

            removeFromHistory: (id: string) =>
                set((state: AppState) => ({
                    history: state.history.filter((h: GeneratedContent) => h.id !== id),
                })),

            clearHistory: () => set({ history: [] }),

            setSidebarExpanded: (expanded: boolean) => set({ sidebarExpanded: expanded }),

            setGlobalToast: (toast: { message: string; type: "error" | "info" | "success" } | null) =>
                set({ globalToast: toast }),
        }),
        { name: "aicontents-app" }
    )
);
