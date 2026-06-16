import { create } from "zustand";

export interface LinkedContent {
    contentType: string;
    productName: string;
    features: string;
    coreContent: string;
    target: string;
    tone: string;
    styleGuide?: string;
    businessName?: string;
}

interface LinkedContentStore {
    linked: LinkedContent | null;
    setLinked: (data: LinkedContent) => void;
    clearLinked: () => void;
}

export const useLinkedContent = create<LinkedContentStore>((set) => ({
    linked: null,
    setLinked: (data) => set({ linked: data }),
    clearLinked: () => set({ linked: null }),
}));
