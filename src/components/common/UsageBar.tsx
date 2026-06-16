"use client";

import { Zap, Crown, Infinity as InfinityIcon } from "lucide-react";
import type { UsageInfo } from "@/lib/hooks/useUsage";

export default function UsageBar({ usage }: { usage: UsageInfo }) {
    if (usage.loading) return null;

    // 무제한(admin/pro 무제한)
    if (usage.limit === null) {
        const isAdmin = usage.plan === "admin";
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: isAdmin ? "#FFF0EB" : "#FFF8E7", color: isAdmin ? "var(--primary)" : "var(--highlight)" }}>
                <Crown size={12} />
                {isAdmin ? "관리자 사용 중" : "무제한 생성 가능"}
            </div>
        );
    }

    const pct = Math.min(100, (usage.used / usage.limit) * 100);
    const isEmpty = usage.remaining === 0;
    const isLow = (usage.remaining ?? 0) <= 1 && !isEmpty;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
                background: isEmpty ? "#FEE2E2" : isLow ? "#FFF8E7" : "var(--surface-2)",
            }}>
            <Zap size={12} style={{ color: isEmpty ? "#DC2626" : isLow ? "#D97706" : "var(--primary)" }} />
            <span className="text-xs font-bold" style={{ color: isEmpty ? "#DC2626" : isLow ? "#D97706" : "var(--foreground)" }}>
                {isEmpty
                    ? "오늘 생성 횟수 소진"
                    : `오늘 ${usage.used}/${usage.limit}회 사용`}
            </span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all"
                    style={{
                        width: `${pct}%`,
                        background: isEmpty ? "#DC2626" : isLow ? "#D97706" : "var(--primary)",
                    }} />
            </div>
            {isEmpty && (
                <span className="text-[10px]" style={{ color: "#DC2626" }}>내일 초기화</span>
            )}
        </div>
    );
}
