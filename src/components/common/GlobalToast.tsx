"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function GlobalToast() {
    const toast = useAppStore(s => s.globalToast);
    const setGlobalToast = useAppStore(s => s.setGlobalToast);

    // 토스트 표시 시 5초 후 자동 닫기
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setGlobalToast(null), 5000);
        return () => clearTimeout(timer);
    }, [toast, setGlobalToast]);

    if (!toast) return null;

    const styles = {
        error:   { bg: "#FF4444", icon: <AlertCircle size={18} className="text-white shrink-0" /> },
        success: { bg: "var(--accent)", icon: <CheckCircle2 size={18} className="text-white shrink-0" /> },
        info:    { bg: "var(--secondary)", icon: <Info size={18} className="text-white shrink-0" /> },
    };
    const { bg, icon } = styles[toast.type];

    return (
        <div
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm w-[calc(100vw-2rem)]"
            style={{ background: bg, color: "white" }}
        >
            {icon}
            <p className="text-sm font-semibold flex-1 leading-snug">{toast.message}</p>
            <button
                onClick={() => setGlobalToast(null)}
                className="p-0.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity shrink-0"
            >
                <X size={16} />
            </button>
        </div>
    );
}
