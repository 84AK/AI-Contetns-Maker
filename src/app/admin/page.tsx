"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Users, FileText, Zap, Layers, Film, ClipboardList, RefreshCw, ShieldAlert, ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

interface Stats {
    totalUsers: number;
    totalContents: number;
    todayGenerations: number;
    weekGenerations: number;
}

interface ToolCounts {
    cardnews?: number;
    shorts?: number;
    "detail-page"?: number;
    planner?: number;
}

interface RecentContent {
    id: string;
    type: string;
    title: string;
    product_name: string;
    created_at: string;
    profiles: { name: string; email: string } | null;
}

interface UserRow {
    id: string;
    name: string;
    email: string;
    plan: string;
    created_at: string;
}

interface DashboardData {
    stats: Stats;
    toolCounts: ToolCounts;
    recentContents: RecentContent[];
    users: UserRow[];
}

const TOOL_CONFIG = {
    cardnews: { label: "카드뉴스", icon: Layers, color: "var(--primary)", bg: "var(--primary-light)" },
    shorts: { label: "쇼츠 스크립트", icon: Film, color: "var(--accent)", bg: "#ECFDF5" },
    "detail-page": { label: "상세페이지", icon: FileText, color: "var(--secondary)", bg: "var(--secondary-light)" },
    planner: { label: "기획 플래너", icon: ClipboardList, color: "#8B5CF6", bg: "#F5F3FF" },
} as const;

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: "관리자", color: "#7C3AED", bg: "#EDE9FE" },
    pro: { label: "Pro", color: "#0369A1", bg: "#E0F2FE" },
    free: { label: "무료", color: "var(--foreground-muted)", bg: "var(--surface-2)" },
};

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
}

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"overview" | "contents" | "users">("overview");

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError("");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }

        const res = await fetch("/api/admin/stats", {
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 403) { setError("관리자 권한이 없습니다."); setLoading(false); return; }
        if (!res.ok) { setError("데이터 로드 실패"); setLoading(false); return; }

        const json = await res.json();
        setData(json);
        setLoading(false);
    }, [router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={28} className="animate-spin" style={{ color: "var(--primary)" }} />
                    <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>관리자 데이터 로드 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
                <div className="flex flex-col items-center gap-4 text-center p-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#FEE2E2" }}>
                        <ShieldAlert size={28} style={{ color: "#DC2626" }} />
                    </div>
                    <p className="text-base font-black" style={{ color: "var(--foreground)" }}>{error}</p>
                    <Link href="/" className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                        홈으로
                    </Link>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { stats, toolCounts, recentContents, users } = data;
    const totalToolUsage = Object.values(toolCounts).reduce((a, b) => a + (b ?? 0), 0);

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            {/* 헤더 */}
            <div className="sticky top-0 z-10 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                            <ArrowLeft size={16} />
                        </Link>
                        <div>
                            <h1 className="text-base font-black" style={{ color: "var(--foreground)" }}>관리자 대시보드</h1>
                            <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>AI 콘텐츠 메이커</p>
                        </div>
                    </div>
                    <button onClick={fetchData} className="p-2 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {/* 핵심 지표 카드 */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "총 사용자", value: stats.totalUsers, icon: Users, color: "var(--secondary)", bg: "var(--secondary-light)" },
                        { label: "총 생성물", value: stats.totalContents, icon: BarChart3, color: "var(--primary)", bg: "var(--primary-light)" },
                        { label: "오늘 생성", value: stats.todayGenerations, icon: Zap, color: "var(--accent)", bg: "#ECFDF5" },
                        { label: "7일 생성", value: stats.weekGenerations, icon: TrendingUp, color: "#8B5CF6", bg: "#F5F3FF" },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="rounded-2xl p-4" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                                <Icon size={18} style={{ color }} />
                            </div>
                            <p className="text-2xl font-black" style={{ color: "var(--foreground)" }}>{value.toLocaleString()}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* 도구별 사용량 */}
                <div className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
                    <h2 className="text-sm font-black mb-4" style={{ color: "var(--foreground)" }}>도구별 생성 횟수</h2>
                    <div className="space-y-3">
                        {(Object.entries(TOOL_CONFIG) as [keyof typeof TOOL_CONFIG, typeof TOOL_CONFIG[keyof typeof TOOL_CONFIG]][]).map(([key, cfg]) => {
                            const count = toolCounts[key] ?? 0;
                            const pct = totalToolUsage > 0 ? Math.round((count / totalToolUsage) * 100) : 0;
                            const Icon = cfg.icon;
                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                                        <Icon size={14} style={{ color: cfg.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold" style={{ color: "var(--foreground-soft)" }}>{cfg.label}</span>
                                            <span className="text-xs font-black" style={{ color: "var(--foreground)" }}>{count}회</span>
                                        </div>
                                        <div className="h-1.5 rounded-full" style={{ background: "var(--surface-2)" }}>
                                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                                        </div>
                                    </div>
                                    <span className="text-xs w-8 text-right shrink-0" style={{ color: "var(--foreground-muted)" }}>{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                    {(["overview", "contents", "users"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                            style={{
                                background: activeTab === tab ? "var(--surface)" : "transparent",
                                color: activeTab === tab ? "var(--foreground)" : "var(--foreground-muted)",
                                boxShadow: activeTab === tab ? "var(--shadow-sm)" : "none",
                            }}>
                            {tab === "overview" ? "최근 생성" : tab === "contents" ? "전체 콘텐츠" : "사용자"}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 */}
                {activeTab !== "users" && (
                    <div className="space-y-2">
                        {(activeTab === "overview" ? recentContents : recentContents).map(item => {
                            const cfgKey = (item.type === "cardnews" ? "cardnews" : item.type) as keyof typeof TOOL_CONFIG;
                            const cfg = TOOL_CONFIG[cfgKey] ?? TOOL_CONFIG.cardnews;
                            const Icon = cfg.icon;
                            return (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                                        <Icon size={16} style={{ color: cfg.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{item.title}</p>
                                        <p className="text-xs truncate" style={{ color: "var(--foreground-muted)" }}>
                                            {item.profiles?.name ?? "알 수 없음"} · {item.profiles?.email ?? ""} · {timeAgo(item.created_at)}
                                        </p>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                                        {cfg.label}
                                    </span>
                                </div>
                            );
                        })}
                        {recentContents.length === 0 && (
                            <p className="text-sm text-center py-8" style={{ color: "var(--foreground-muted)" }}>생성된 콘텐츠가 없습니다.</p>
                        )}
                    </div>
                )}

                {activeTab === "users" && (
                    <div className="space-y-2">
                        {users.map(user => {
                            const badge = PLAN_BADGE[user.plan] ?? PLAN_BADGE.free;
                            return (
                                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                                        style={{ background: "var(--surface-2)", color: "var(--foreground)" }}>
                                        {(user.name ?? "?")[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate" style={{ color: "var(--foreground)" }}>{user.name}</p>
                                        <p className="text-xs truncate" style={{ color: "var(--foreground-muted)" }}>
                                            {user.email} · 가입 {timeAgo(user.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Calendar size={12} style={{ color: "var(--foreground-muted)" }} />
                                        <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                                            style={{ background: badge.bg, color: badge.color }}>
                                            {badge.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {users.length === 0 && (
                            <p className="text-sm text-center py-8" style={{ color: "var(--foreground-muted)" }}>사용자가 없습니다.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
