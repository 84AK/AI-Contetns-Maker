"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Layers,
    FileText,
    Film,
    Images,
    PanelLeftOpen,
    PanelLeftClose,
    Menu,
    X,
    Sparkles,
    LogIn,
    LogOut,
    User,
    ClipboardList,
    Shield,
} from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle";
import { useAppStore } from "@/store/useAppStore";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navItems = [
    { name: "홈",            href: "/",           icon: Home,          highlight: false },
    { name: "기획 플래너",   href: "/planner",    icon: ClipboardList, highlight: true },
    { name: "카드뉴스",      href: "/cardnews",   icon: Layers,        highlight: false },
    { name: "상세페이지",    href: "/detail-page", icon: FileText,      highlight: false },
    { name: "쇼츠 스크립트", href: "/shorts",     icon: Film,          highlight: false },
    { name: "내 갤러리",     href: "/gallery",    icon: Images,        highlight: false },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const sidebarExpanded = useAppStore(s => s.sidebarExpanded);
    const setSidebarExpanded = useAppStore(s => s.setSidebarExpanded);
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.access_token) {
                const res = await fetch("/api/usage", { headers: { Authorization: `Bearer ${session.access_token}` } });
                if (res.ok) {
                    const d = await res.json();
                    setIsAdmin(d.plan === "admin");
                }
            }
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
            setUser(session?.user ?? null);
            if (session?.access_token) {
                const res = await fetch("/api/usage", { headers: { Authorization: `Bearer ${session.access_token}` } });
                if (res.ok) {
                    const d = await res.json();
                    setIsAdmin(d.plan === "admin");
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const expanded = mounted ? sidebarExpanded : false;
    const W = expanded ? 220 : 68;

    return (
        <>
            {/* 모바일 하단 네비 */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 pt-2 pb-6 md:hidden"
                style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
            >
                {navItems.slice(0, 4).map(item => {
                    const Icon = item.icon;
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center gap-0.5 min-w-[44px]"
                            style={{ color: isActive ? "var(--primary)" : "var(--foreground-muted)" }}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                            <span className="text-[9px] font-semibold">{item.name}</span>
                        </Link>
                    );
                })}
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="flex flex-col items-center gap-0.5 min-w-[44px]"
                    style={{ color: "var(--foreground-muted)" }}
                >
                    <Menu size={22} strokeWidth={1.8} />
                    <span className="text-[9px] font-semibold">더보기</span>
                </button>
            </nav>

            {/* 모바일 드로어 */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div
                        className="fixed bottom-0 left-0 right-0 z-[70] md:hidden rounded-t-3xl overflow-hidden"
                        style={{ background: "var(--surface)", boxShadow: "0 -8px 32px rgba(0,0,0,0.15)", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
                    >
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
                        </div>
                        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                            <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>메뉴</span>
                            <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="px-4 py-3 flex flex-col gap-1">
                            {navItems.map(item => {
                                const Icon = item.icon;
                                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-colors"
                                        style={{
                                            background: isActive ? "var(--surface-2)" : "transparent",
                                            color: isActive ? "var(--primary)" : "var(--foreground-soft)",
                                            fontWeight: isActive ? 700 : 500,
                                        }}
                                    >
                                        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                                        <span className="text-[15px]">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* 모바일 관리자 */}
                        {isAdmin && (
                            <div className="px-4 pb-1">
                                <Link
                                    href="/admin"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3.5 px-4 py-3 rounded-2xl"
                                    style={{ background: "#EDE9FE", color: "#7C3AED", fontWeight: 700 }}
                                >
                                    <Shield size={18} strokeWidth={2} />
                                    <span className="text-[15px]">관리자 대시보드</span>
                                </Link>
                            </div>
                        )}

                        {/* 모바일 로그인/유저 */}
                        <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                            {user ? (
                                <div className="flex items-center justify-between px-4 py-3 rounded-2xl mt-2" style={{ background: "var(--surface-2)" }}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center"
                                            style={{ background: "var(--primary-light)" }}>
                                            <User size={14} style={{ color: "var(--primary)" }} />
                                        </div>
                                        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                                            {user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "사용자"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                        style={{ background: "var(--border)", color: "var(--foreground-muted)" }}
                                    >
                                        <LogOut size={13} />로그아웃
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full mt-2 py-3.5 rounded-2xl font-bold text-sm"
                                    style={{ background: "var(--primary)", color: "white" }}
                                >
                                    <LogIn size={16} />로그인하기
                                </Link>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* 데스크탑 사이드바 */}
            <aside
                className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50 overflow-hidden"
                style={{
                    width: W,
                    transition: "width 220ms cubic-bezier(0.4,0,0.2,1)",
                    background: "var(--surface)",
                    borderRight: "1px solid var(--border)",
                }}
            >
                {/* 로고 */}
                <div
                    className="flex items-center shrink-0"
                    style={{
                        borderBottom: "1px solid var(--border)",
                        padding: expanded ? "16px 14px" : "16px 0",
                        justifyContent: expanded ? "space-between" : "center",
                        minHeight: 64,
                    }}
                >
                    {expanded ? (
                        <Link href="/" className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}>
                                <Sparkles size={15} className="text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-[13px] font-black tracking-tight font-outfit leading-none truncate" style={{ color: "var(--foreground)" }}>
                                    AI 콘텐츠 메이커
                                </h1>
                                <p className="text-[9px] font-medium mt-0.5 truncate" style={{ color: "var(--foreground-muted)" }}>
                                    마케팅 콘텐츠 AI 가이드
                                </p>
                            </div>
                        </Link>
                    ) : (
                        <Link href="/">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}>
                                <Sparkles size={15} className="text-white" />
                            </div>
                        </Link>
                    )}
                    {expanded && <ThemeToggle />}
                </div>

                {/* 접기/펼치기 */}
                <button
                    onClick={() => setSidebarExpanded(!expanded)}
                    className="shrink-0 flex items-center transition-all"
                    style={{
                        height: 36,
                        padding: expanded ? "0 14px" : "0",
                        justifyContent: expanded ? "flex-end" : "center",
                        color: "var(--foreground-muted)",
                        borderBottom: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                    {expanded ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold" style={{ color: "var(--foreground-muted)" }}>접기</span>
                            <PanelLeftClose size={15} strokeWidth={1.8} />
                        </div>
                    ) : (
                        <PanelLeftOpen size={16} strokeWidth={1.8} />
                    )}
                </button>

                {/* 네비게이션 */}
                <nav
                    className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden"
                    style={{ padding: expanded ? "10px 10px" : "10px 0", alignItems: expanded ? "stretch" : "center" }}
                >
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        const isHighlight = item.highlight && !isActive;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={!expanded ? item.name : undefined}
                                className="flex items-center transition-all duration-150 rounded-xl"
                                style={{
                                    gap: expanded ? 12 : 0,
                                    padding: expanded ? "10px 12px" : "10px",
                                    width: expanded ? "100%" : 44,
                                    height: 44,
                                    justifyContent: expanded ? "flex-start" : "center",
                                    background: isActive
                                        ? "var(--primary-light)"
                                        : isHighlight
                                            ? "linear-gradient(135deg, var(--primary-light), var(--secondary-light))"
                                            : "transparent",
                                    color: isActive ? "var(--primary)" : isHighlight ? "var(--primary)" : "var(--foreground-soft)",
                                    fontWeight: isActive || isHighlight ? 700 : 500,
                                    border: isHighlight ? "1px solid var(--primary)" : "1px solid transparent",
                                }}
                                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLElement).style.background = isHighlight
                                            ? "linear-gradient(135deg, var(--primary-light), var(--secondary-light))"
                                            : "transparent";
                                    }
                                }}
                            >
                                <Icon size={20} strokeWidth={isActive || isHighlight ? 2.5 : 1.8} className="shrink-0" />
                                {expanded && (
                                    <span className="text-[13px] whitespace-nowrap">{item.name}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* 관리자 링크 */}
                {isAdmin && (
                    <div style={{ padding: expanded ? "0 10px 6px" : "0 0 6px", display: "flex", justifyContent: expanded ? "stretch" : "center" }}>
                        <Link
                            href="/admin"
                            title={!expanded ? "관리자 대시보드" : undefined}
                            className="flex items-center rounded-xl transition-all duration-150"
                            style={{
                                gap: expanded ? 10 : 0,
                                padding: expanded ? "8px 12px" : "10px",
                                width: expanded ? "100%" : 44,
                                height: 40,
                                justifyContent: expanded ? "flex-start" : "center",
                                background: pathname.startsWith("/admin") ? "#EDE9FE" : "var(--surface-2)",
                                color: pathname.startsWith("/admin") ? "#7C3AED" : "var(--foreground-muted)",
                                fontWeight: 700,
                            }}
                        >
                            <Shield size={16} strokeWidth={2} className="shrink-0" />
                            {expanded && <span className="text-[13px]">관리자</span>}
                        </Link>
                    </div>
                )}

                {/* 로그인/유저 영역 */}
                <div
                    style={{
                        borderTop: "1px solid var(--border)",
                        padding: expanded ? "10px 10px" : "10px 0",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: expanded ? "stretch" : "center",
                        gap: 4,
                    }}
                >
                    {user ? (
                        <>
                            {expanded && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)" }}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                        style={{ background: "var(--primary-light)" }}>
                                        <User size={13} style={{ color: "var(--primary)" }} />
                                    </div>
                                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--foreground-soft)" }}>
                                        {user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "사용자"}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                title={!expanded ? "로그아웃" : undefined}
                                className="flex items-center rounded-xl transition-all duration-150"
                                style={{
                                    gap: expanded ? 10 : 0,
                                    padding: expanded ? "8px 12px" : "10px",
                                    width: expanded ? "100%" : 44,
                                    height: 40,
                                    justifyContent: expanded ? "flex-start" : "center",
                                    color: "var(--foreground-muted)",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                                <LogOut size={16} strokeWidth={1.8} className="shrink-0" />
                                {expanded && <span className="text-[13px]">로그아웃</span>}
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            title={!expanded ? "로그인" : undefined}
                            className="flex items-center rounded-xl transition-all duration-150"
                            style={{
                                gap: expanded ? 10 : 0,
                                padding: expanded ? "10px 12px" : "10px",
                                width: expanded ? "100%" : 44,
                                height: 44,
                                justifyContent: expanded ? "flex-start" : "center",
                                background: "var(--primary-light)",
                                color: "var(--primary)",
                                fontWeight: 700,
                            }}
                        >
                            <LogIn size={18} strokeWidth={2} className="shrink-0" />
                            {expanded && <span className="text-[13px]">로그인</span>}
                        </Link>
                    )}
                </div>
            </aside>
        </>
    );
}
