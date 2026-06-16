"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface UsageInfo {
    used: number;
    limit: number | null;      // null = 무제한(admin)
    remaining: number | null;  // null = 무제한
    plan: string;
    canGenerate: boolean;
    loading: boolean;
}

export function useUsage() {
    const [info, setInfo] = useState<UsageInfo>({
        used: 0, limit: 3, remaining: 3,
        plan: "free", canGenerate: true, loading: true,
    });

    const refresh = useCallback(async () => {
        setInfo(prev => ({ ...prev, loading: true }));
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setInfo({ used: 0, limit: 3, remaining: 3, plan: "free", canGenerate: false, loading: false });
            return;
        }

        try {
            const res = await fetch("/api/usage", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error("usage fetch failed");
            const data = await res.json();
            setInfo({ ...data, loading: false });
        } catch {
            setInfo(prev => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    /** API 호출 시 Authorization 헤더에 넣을 토큰 반환 */
    const getToken = useCallback(async (): Promise<string | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    }, []);

    return { ...info, refresh, getToken };
}
