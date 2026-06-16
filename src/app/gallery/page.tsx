"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Images, Layers, FileText, Film, Trash2, Copy, Check, Sparkles, ChevronDown, ChevronUp, ExternalLink, LogIn, RefreshCw, ClipboardList, PenLine } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type ContentType = "cardnews" | "detail-page" | "shorts";

interface GeneratedContent {
    id: string;
    type: ContentType;
    title: string;
    product_name: string;
    content: Record<string, unknown>;
    prompt_text: string;
    created_at: string;
}

const typeConfig = {
    cardnews:       { label: "카드뉴스",      icon: Layers,        color: "var(--primary)",   bg: "var(--primary-light)" },
    "detail-page":  { label: "상세페이지",    icon: FileText,      color: "var(--secondary)", bg: "var(--secondary-light)" },
    shorts:         { label: "쇼츠 스크립트", icon: Film,          color: "var(--accent)",    bg: "#ECFDF5" },
    planner:        { label: "기획 플래너",   icon: ClipboardList, color: "#8B5CF6",          bg: "#F5F3FF" },
} as const;

function isPlannerContent(item: GeneratedContent): boolean {
    return item.type === "cardnews" && typeof item.content.prdDocument === "string";
}

const slideTypeLabel: Record<string, string> = {
    cover: "표지", problem: "공감", solution: "해결",
    feature1: "특징 1", feature2: "특징 2", feature3: "특징 3",
    review: "후기", comparison: "비교", howto: "사용법", cta: "행동 유도",
};

function CardNewsDetailView({ item }: { item: GeneratedContent }) {
    const content = item.content as { title?: string; styleGuide?: string; slides?: Array<{ slideNum: number; type: string; headline: string; subtext?: string; body?: string; hashtags?: string[]; gptPrompt?: string; geminiPrompt?: string }> };
    const slides = content.slides ?? [];
    const [selectedSlide, setSelectedSlide] = useState(0);
    const [selectedModel, setSelectedModel] = useState<"gpt" | "gemini">("gpt");
    const [copiedSlide, setCopiedSlide] = useState<number | null>(null);

    const activeSlide = slides[selectedSlide];
    const activePrompt = activeSlide ? (selectedModel === "gpt" ? activeSlide.gptPrompt : activeSlide.geminiPrompt) : null;

    const copyPrompt = async (prompt: string, num: number) => {
        await navigator.clipboard.writeText(prompt);
        setCopiedSlide(num);
        setTimeout(() => setCopiedSlide(null), 2000);
    };

    if (!slides.length) return null;

    return (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            {content.styleGuide && (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                    🎨 {content.styleGuide}
                </p>
            )}
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold" style={{ color: "var(--foreground-muted)" }}>이미지 모델:</span>
                {(["gpt", "gemini"] as const).map(m => (
                    <button key={m} onClick={() => setSelectedModel(m)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                        style={{
                            background: selectedModel === m ? (m === "gpt" ? "#10A37F" : "#4F46E5") : "var(--surface-2)",
                            color: selectedModel === m ? "white" : "var(--foreground-muted)",
                        }}>
                        {m === "gpt" ? "GPT Image 2.0" : "Nanobanana pro"}
                    </button>
                ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {slides.map((slide, idx) => (
                    <button key={slide.slideNum} onClick={() => setSelectedSlide(idx)}
                        className="flex flex-col items-center gap-0.5 shrink-0 px-3 py-2 rounded-xl transition-all"
                        style={{ minWidth: 54, background: selectedSlide === idx ? "var(--primary)" : "var(--surface-2)" }}>
                        <span className="text-xs font-black" style={{ color: selectedSlide === idx ? "white" : "var(--foreground-soft)" }}>
                            {slide.slideNum}
                        </span>
                        <span className="text-[8px] font-bold" style={{ color: selectedSlide === idx ? "rgba(255,255,255,0.8)" : "var(--foreground-muted)" }}>
                            {slideTypeLabel[slide.type] ?? slide.type}
                        </span>
                    </button>
                ))}
            </div>
            {activeSlide && (
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                    <div className="px-4 py-3 space-y-2" style={{ background: "var(--surface-2)" }}>
                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>{activeSlide.headline}</p>
                        {activeSlide.subtext && <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>{activeSlide.subtext}</p>}
                        {activeSlide.body && <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{activeSlide.body}</p>}
                        {activeSlide.hashtags && (
                            <div className="flex flex-wrap gap-1">
                                {activeSlide.hashtags.map(tag => (
                                    <span key={tag} className="text-[11px] font-semibold" style={{ color: "var(--secondary)" }}>#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    {activePrompt && (
                        <div className="px-4 py-3 space-y-2 border-t" style={{ borderColor: "var(--border)" }}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold" style={{ color: "var(--foreground-muted)" }}>이미지 프롬프트</span>
                                <div className="flex gap-1.5">
                                    <button onClick={() => copyPrompt(activePrompt, activeSlide.slideNum)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                                        style={{ background: copiedSlide === activeSlide.slideNum ? "var(--accent)" : "var(--surface-2)", color: copiedSlide === activeSlide.slideNum ? "white" : "var(--foreground-soft)" }}>
                                        {copiedSlide === activeSlide.slideNum ? <Check size={10} /> : <Copy size={10} />}
                                        복사
                                    </button>
                                    <a href={selectedModel === "gpt" ? "https://chat.openai.com" : "https://gemini.google.com"}
                                        target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                                        style={{ background: selectedModel === "gpt" ? "#10A37F" : "#4F46E5", color: "white" }}>
                                        <ExternalLink size={10} />
                                        {selectedModel === "gpt" ? "ChatGPT" : "Gemini"}
                                    </a>
                                </div>
                            </div>
                            <p className="text-[11px] leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{activePrompt}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function GalleryPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [items, setItems] = useState<GeneratedContent[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<"all" | ContentType | "planner">("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchItems = useCallback(async (uid: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from("generated_contents")
            .select("id, type, title, product_name, content, prompt_text, created_at")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(100);

        if (!error && data) setItems(data as GeneratedContent[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setAuthLoading(false);
            if (session?.user) fetchItems(session.user.id);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchItems(session.user.id);
            else setItems([]);
        });
        return () => subscription.unsubscribe();
    }, [fetchItems]);

    const handleDelete = async (id: string) => {
        await supabase.from("generated_contents").delete().eq("id", id);
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleClearAll = async () => {
        if (!user || !confirm("내 갤러리를 전부 비울까요?")) return;
        await supabase.from("generated_contents").delete().eq("user_id", user.id);
        setItems([]);
    };

    const copyPrompt = async (item: GeneratedContent) => {
        await navigator.clipboard.writeText(item.prompt_text);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const openInEditor = (item: GeneratedContent) => {
        const payload = { ...item.content, _savedId: item.id };
        if (isPlannerContent(item)) {
            localStorage.setItem("ai_gallery_restore_planner", JSON.stringify(payload));
            router.push("/planner");
        } else if (item.type === "cardnews") {
            localStorage.setItem("ai_gallery_restore_cardnews", JSON.stringify(payload));
            router.push("/cardnews");
        } else if (item.type === "shorts") {
            localStorage.setItem("ai_gallery_restore_shorts", JSON.stringify(payload));
            router.push("/shorts");
        } else if (item.type === "detail-page") {
            localStorage.setItem("ai_gallery_restore_detailpage", JSON.stringify(payload));
            router.push("/detail-page");
        }
    };

    const timeAgo = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    };

    const filtered = (() => {
        if (filter === "all") return items;
        if (filter === "planner") return items.filter(isPlannerContent);
        if (filter === "cardnews") return items.filter(i => i.type === "cardnews" && !isPlannerContent(i));
        return items.filter(i => i.type === filter);
    })();

    const plannerCount = items.filter(isPlannerContent).length;
    const cardnewsCount = items.filter(i => i.type === "cardnews" && !isPlannerContent(i)).length;

    if (authLoading) return null;

    // 비로그인 상태
    if (!user) {
        return (
            <div className="space-y-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                        <Images size={12} />내 갤러리
                    </div>
                    <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>내 갤러리</h1>
                </div>
                <div className="edu-card p-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                        <LogIn size={28} style={{ color: "var(--foreground-muted)" }} />
                    </div>
                    <div>
                        <p className="text-base font-black mb-1" style={{ color: "var(--foreground)" }}>로그인이 필요해요</p>
                        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>로그인하면 내가 만든 콘텐츠를 여기서 다시 볼 수 있어요.</p>
                    </div>
                    <Link href="/login" className="px-5 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: "var(--primary)", color: "white" }}>
                        로그인하기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* 헤더 */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                        <Images size={12} />내 갤러리
                    </div>
                    <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>내 갤러리</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                        생성한 콘텐츠를 다시 확인하고 프롬프트를 바로 복사해 사용하세요.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => user && fetchItems(user.id)}
                        className="p-2 rounded-xl"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    {items.length > 0 && (
                        <button onClick={handleClearAll}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                            style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                            <Trash2 size={13} />전체 삭제
                        </button>
                    )}
                </div>
            </div>

            {/* 로딩 */}
            {loading && (
                <div className="edu-card p-10 flex flex-col items-center gap-3">
                    <RefreshCw size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
                    <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>불러오는 중...</p>
                </div>
            )}

            {/* 필터 */}
            {!loading && items.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {([
                        { key: "all", label: `전체 (${items.length})` },
                        { key: "planner", label: `기획 플래너 (${plannerCount})` },
                        { key: "cardnews", label: `카드뉴스 (${cardnewsCount})` },
                        { key: "detail-page", label: `상세페이지 (${items.filter(i => i.type === "detail-page").length})` },
                        { key: "shorts", label: `쇼츠 (${items.filter(i => i.type === "shorts").length})` },
                    ] as const).map(({ key, label }) => (
                        <button key={key} onClick={() => setFilter(key as typeof filter)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                            style={{ background: filter === key ? "var(--foreground)" : "var(--surface-2)", color: filter === key ? "var(--background)" : "var(--foreground-soft)" }}>
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* 빈 상태 */}
            {!loading && items.length === 0 && (
                <div className="edu-card p-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                        <Images size={28} style={{ color: "var(--foreground-muted)" }} />
                    </div>
                    <div>
                        <p className="text-base font-black mb-1" style={{ color: "var(--foreground)" }}>아직 생성한 콘텐츠가 없어요</p>
                        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>도구를 사용하면 자동으로 여기에 저장돼요.</p>
                    </div>
                    <div className="flex gap-3 flex-wrap justify-center">
                        <Link href="/cardnews" className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>카드뉴스 만들기</Link>
                        <Link href="/shorts" className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "#ECFDF5", color: "var(--accent)" }}>쇼츠 스크립트 만들기</Link>
                    </div>
                </div>
            )}

            {/* 갤러리 리스트 */}
            {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map(item => {
                        const isPlanner = isPlannerContent(item);
                        const cfgKey = isPlanner ? "planner" : item.type;
                        const cfg = typeConfig[cfgKey as keyof typeof typeConfig] ?? typeConfig.cardnews;
                        const Icon = cfg.icon;
                        const isExpanded = expandedId === item.id;
                        const hasSlides = item.type === "cardnews";
                        const slideCount = (item.content.slides as unknown[])?.length ?? 0;

                        const editorHref = isPlanner ? "/planner"
                            : item.type === "cardnews" ? "/cardnews"
                            : `/${item.type}`;

                        return (
                            <div key={item.id} className="edu-card overflow-hidden">
                                <div className="p-5">
                                    {/* 아이템 헤더 */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: cfg.bg }}>
                                                <Icon size={20} style={{ color: cfg.color }} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                                                        style={{ background: cfg.bg, color: cfg.color }}>
                                                        {cfg.label}
                                                    </span>
                                                    {hasSlides && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                                            {slideCount}컷
                                                        </span>
                                                    )}
                                                    <span className="text-xs" style={{ color: "var(--foreground-muted)" }}>{timeAgo(item.created_at)}</span>
                                                </div>
                                                <p className="text-sm font-black leading-snug" style={{ color: "var(--foreground)" }}>{item.title}</p>
                                                <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{item.product_name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDelete(item.id)}
                                            className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-red-50"
                                            style={{ color: "var(--foreground-muted)" }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* 액션 버튼 */}
                                    <div className="mt-4 flex items-center gap-2">
                                        {/* 이어서 편집 — 메인 CTA */}
                                        <button
                                            onClick={() => openInEditor(item)}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all flex-1 justify-center"
                                            style={{
                                                background: cfg.color,
                                                color: "white",
                                                boxShadow: `0 2px 12px ${cfg.color}35`,
                                            }}>
                                            <PenLine size={14} />
                                            이어서 편집하기
                                        </button>

                                        {/* 슬라이드 보기 (카드뉴스/플래너) */}
                                        {hasSlides && (
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
                                                style={{
                                                    background: isExpanded ? "var(--foreground)" : "var(--surface-2)",
                                                    color: isExpanded ? "var(--background)" : "var(--foreground-soft)",
                                                }}>
                                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                {isExpanded ? "닫기" : "미리보기"}
                                            </button>
                                        )}

                                        {/* 프롬프트 복사 (쇼츠/상세페이지) */}
                                        {!hasSlides && item.prompt_text && (
                                            <button
                                                onClick={() => copyPrompt(item)}
                                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
                                                style={{
                                                    background: copiedId === item.id ? "var(--accent)" : "var(--surface-2)",
                                                    color: copiedId === item.id ? "white" : "var(--foreground-soft)",
                                                }}>
                                                {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                                                {copiedId === item.id ? "복사됨" : "프롬프트"}
                                            </button>
                                        )}

                                        {/* 새로 만들기 */}
                                        <Link
                                            href={editorHref}
                                            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                            style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                                            <Sparkles size={12} />새로
                                        </Link>
                                    </div>
                                </div>

                                {/* 슬라이드 펼치기 */}
                                {hasSlides && isExpanded && (
                                    <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--border)" }}>
                                        <CardNewsDetailView item={item} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
