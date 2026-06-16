"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers, Sparkles, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Edit3, RotateCcw, Bookmark, BookmarkCheck, ZapOff, FileText, Film, Link2 } from "lucide-react";
import RefinementPanel from "@/components/tools/RefinementPanel";
import { usePersistedForm } from "@/lib/hooks/usePersistedForm";
import AuthGate from "@/components/common/AuthGate";
import UsageBar from "@/components/common/UsageBar";
import { useUsage } from "@/lib/hooks/useUsage";
import { useLinkedContent } from "@/store/useLinkedContent";

interface Slide {
    slideNum: number;
    type: string;
    headline: string;
    subtext?: string;
    body?: string;
    hashtags?: string[];
    gptPrompt?: string;
    geminiPrompt?: string;
}

interface CardNewsResult {
    title: string;
    styleGuide?: string;
    slides: Slide[];
}

type ImageModel = "gpt" | "gemini";

const MODEL_CONFIG: Record<ImageModel, { label: string; color: string; bg: string; link: string; linkLabel: string; tip: string }> = {
    gpt: {
        label: "GPT Image 2.0",
        color: "#10A37F", bg: "#ECFDF5",
        link: "https://chat.openai.com", linkLabel: "ChatGPT 열기",
        tip: "한글 텍스트 렌더링 최강 — ChatGPT Plus 이미지 생성에 붙여넣으세요",
    },
    gemini: {
        label: "Nanobanana pro",
        color: "#4F46E5", bg: "#EEF2FF",
        link: "https://gemini.google.com", linkLabel: "Gemini 열기",
        tip: "스타일 전이·창의적 장면 강점 — Gemini 앱 이미지 생성에 붙여넣으세요",
    },
};

const TONES = ["친근하고 감성적", "전문적이고 신뢰감", "활기차고 트렌디", "고급스럽고 프리미엄", "유머러스하고 재밌는"];

const TONE_PREVIEWS: Record<string, { emoji: string; keyword: string; headline: string; body: string; cta: string; color: string; bg: string; hashtags: string[] }> = {
    "친근하고 감성적": { emoji: "🤍", keyword: "공감 · 따뜻함 · 일상", headline: "매일 아침, 당신 곁에", body: "바쁜 하루를 시작하기 전\n따뜻한 한 모금이 필요할 때\n우리가 늘 여기 있을게요.", cta: "오늘도 한 잔 어때요? 🫶", color: "#FF6B35", bg: "#FFF0EB", hashtags: ["#일상커피", "#카페일상", "#감성커피"] },
    "전문적이고 신뢰감": { emoji: "🎯", keyword: "근거 · 수치 · 신뢰", headline: "국내산 원두 직접 로스팅, 품질이 다릅니다", body: "매일 새벽 4시, 신선한 원두를\n직접 로스팅합니다.\n산지 직거래로 원가 30% 절감.", cta: "지금 바로 주문하기 →", color: "#4361EE", bg: "#EEF1FD", hashtags: ["#스페셜티커피", "#직접로스팅", "#원두커피"] },
    "활기차고 트렌디": { emoji: "🔥", keyword: "트렌드 · 바이럴 · MZ", headline: "요즘 MZ가 제일 찾는 커피 🔥", body: "SNS에서 화제 중\n이미 3,000명이 인정한 맛\n품절 전에 서둘러요!", cta: "지금 아니면 언제? 바로 주문 ⚡", color: "#06D6A0", bg: "#ECFDF5", hashtags: ["#MZ카페", "#요즘카페", "#핫플"] },
    "고급스럽고 프리미엄": { emoji: "✨", keyword: "품격 · 희소성 · 가치", headline: "오직 최상급 원두만을 엄선합니다", body: "세계 Top 5% 스페셜티 원두\n소량 한정 생산\n진정한 커피 한 잔의 가치.", cta: "프리미엄 컬렉션 보기", color: "#92400E", bg: "#FDF3E4", hashtags: ["#스페셜티", "#프리미엄커피", "#한정판"] },
    "유머러스하고 재밌는": { emoji: "😄", keyword: "웃음 · 공감 · 바이럴", headline: "이 커피 마시기 전 vs 후 😂", body: "마시기 전: 세상이 싫다\n마신 후: 세상을 정복할 수 있다\n이게 바로 커피의 힘.", cta: "세상 정복 시작하기 ☕", color: "#8B5CF6", bg: "#F3EEFF", hashtags: ["#공감됩니다", "#커피없이못살아", "#직장인공감"] },
};

const CONTENT_GOALS = [
    { value: "awareness", label: "🧠 인지도 향상", desc: "브랜드/제품 알리기" },
    { value: "purchase", label: "🛒 즉각 구매 유도", desc: "지금 바로 사게 만들기" },
    { value: "follow", label: "❤️ 팔로워 확보", desc: "저장·팔로우 늘리기" },
    { value: "traffic", label: "🔗 링크 클릭 유도", desc: "스토어·블로그 방문" },
];

const CONTENT_TYPES = [
    { value: "promotion", emoji: "🛍️", label: "상품/서비스 홍보", desc: "제품 판매·홍보용" },
    { value: "education", emoji: "📚", label: "수업/강의 소개", desc: "교육 콘텐츠 안내" },
    { value: "tutorial", emoji: "🔧", label: "사용법 튜토리얼", desc: "단계별 사용 안내" },
    { value: "info", emoji: "💡", label: "정보/지식 전달", desc: "유용한 정보 공유" },
];

const TYPE_FORM_CONFIG: Record<string, {
    subjectLabel: string; subjectPlaceholder: string;
    featuresLabel: string; featuresPlaceholder: string;
    coreContentLabel: string; coreContentPlaceholder: string;
    coreContentRequired: boolean;
}> = {
    promotion: {
        subjectLabel: "제품/서비스명", subjectPlaceholder: "예: 수제 아메리카노, 핸드메이드 캔들",
        featuresLabel: "핵심 특징/장점", featuresPlaceholder: "예: 국내산 원두 직접 로스팅, 매일 아침 신선하게, 설탕 무첨가",
        coreContentLabel: "홍보 포인트", coreContentPlaceholder: "예: 오픈 기념 20% 할인 이벤트 진행 중. 선착순 50명에게 무료 쿠폰 제공.",
        coreContentRequired: false,
    },
    education: {
        subjectLabel: "수업/강의명", subjectPlaceholder: "예: AI 기초 수업, 포토샵 입문 강의",
        featuresLabel: "수업 특징", featuresPlaceholder: "예: 입문자도 쉽게, 실습 위주, 1:1 피드백",
        coreContentLabel: "수업 핵심 내용", coreContentPlaceholder: "수업에서 다룰 내용을 구체적으로 써주세요.\n예:\n1강. AI란 무엇인가 - 인공지능의 정의와 역사\n2강. 생성형 AI 도구 소개 - ChatGPT, Claude 비교\n3강. 실습: 나만의 프롬프트 만들기",
        coreContentRequired: true,
    },
    tutorial: {
        subjectLabel: "서비스/앱 이름", subjectPlaceholder: "예: 클로드 AI, 네이버 스마트스토어",
        featuresLabel: "주요 기능", featuresPlaceholder: "예: 문서 작성, 이미지 생성, 코드 작성",
        coreContentLabel: "단계별 사용 순서", coreContentPlaceholder: "사용 방법을 단계별로 써주세요.\n예:\n1단계: 앱 설치 후 회원가입\n2단계: 메인 화면에서 '새 채팅' 클릭\n3단계: 질문 입력 후 전송\n4단계: 결과 복사해서 활용",
        coreContentRequired: true,
    },
    info: {
        subjectLabel: "주제", subjectPlaceholder: "예: SNS 마케팅 꿀팁 5가지, 건강한 아침 루틴",
        featuresLabel: "핵심 메시지", featuresPlaceholder: "예: 실용적이고 바로 써먹을 수 있는 내용",
        coreContentLabel: "전달할 핵심 내용", coreContentPlaceholder: "카드뉴스에 담을 정보를 자유롭게 써주세요.\n예:\n1. 오전 기상 후 물 한 잔 - 신진대사 활성화\n2. 5분 스트레칭 - 혈액순환 개선\n3. 간단한 단백질 아침 식사 - 집중력 유지",
        coreContentRequired: true,
    },
};

const slideTypeLabel: Record<string, string> = {
    cover: "표지", problem: "공감", solution: "해결",
    feature1: "특징 1", feature2: "특징 2", feature3: "특징 3",
    review: "후기", comparison: "비교", howto: "사용법", cta: "행동 유도",
};

const slideTypeColor: Record<string, string> = {
    cover: "#FF6B35", problem: "#F59E0B", solution: "#06D6A0",
    feature1: "#4361EE", feature2: "#4361EE", feature3: "#4361EE",
    review: "#8B5CF6", comparison: "#EC4899", howto: "#0EA5E9", cta: "#FF6B35",
};

export default function CardNewsPage() {
    const [form, setForm] = usePersistedForm("aicontents_cardnews_form", {
        contentType: "promotion",
        businessName: "", productName: "", features: "", coreContent: "", target: "",
        tone: "친근하고 감성적", excludeWords: "", referenceStyle: "",
        contentGoal: "purchase", slideCount: "6",
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CardNewsResult | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showFormPanel, setShowFormPanel] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ImageModel>("gpt");
    const [selectedSlide, setSelectedSlide] = useState(0);
    const [copiedSlide, setCopiedSlide] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const usage = useUsage();

    // 갤러리에서 복원
    useEffect(() => {
        const saved = localStorage.getItem("ai_gallery_restore_cardnews");
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.slides?.length) {
                const { _savedId, ...content } = parsed;
                setResult(content as CardNewsResult);
                setSavedId(_savedId ?? null);
            }
        } catch { /* 무시 */ }
        localStorage.removeItem("ai_gallery_restore_cardnews");
    }, []);

    const handleSubmit = async () => {
        const typeCfg = TYPE_FORM_CONFIG[form.contentType] ?? TYPE_FORM_CONFIG.promotion;
        if (!form.productName.trim()) {
            setError(`${typeCfg.subjectLabel}은(는) 필수입니다.`);
            return;
        }
        if (typeCfg.coreContentRequired && !form.coreContent.trim()) {
            setError(`${typeCfg.coreContentLabel}을(를) 입력해주세요.`);
            return;
        }
        if (form.contentType === "promotion" && !form.features.trim()) {
            setError("핵심 특징/장점은 필수입니다.");
            return;
        }
        setError("");
        setLoading(true);
        setResult(null);
        setSavedId(null);
        setSelectedSlide(0);
        setShowFormPanel(false);

        try {
            const token = await usage.getToken();
            const res = await fetch("/api/ai/cardnews", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429 && data.limitExceeded) usage.refresh();
                throw new Error(data.error || "오류 발생");
            }

            const { _savedId, ...content } = data;
            setResult(content as CardNewsResult);
            setSavedId(_savedId ?? null);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000);
            usage.refresh(); // 사용 횟수 갱신
        } catch (e) {
            setError(e instanceof Error ? e.message : "오류가 발생했어요.");
        } finally {
            setLoading(false);
        }
    };

    const copySlidePrompt = async (slide: Slide) => {
        const prompt = selectedModel === "gpt" ? slide.gptPrompt : slide.geminiPrompt;
        if (!prompt) return;
        await navigator.clipboard.writeText(prompt);
        setCopiedSlide(slide.slideNum);
        setTimeout(() => setCopiedSlide(null), 2000);
    };

    const copyAllPrompts = async () => {
        if (!result) return;
        const text = result.slides.map(s => {
            const prompt = selectedModel === "gpt" ? s.gptPrompt : s.geminiPrompt;
            return `--- ${s.slideNum}장 (${slideTypeLabel[s.type] ?? s.type}) ---\n${prompt || ""}`;
        }).join("\n\n");
        await navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2500);
    };

    const router = useRouter();
    const { setLinked } = useLinkedContent();

    const goToTool = (path: string) => {
        setLinked({
            contentType: form.contentType,
            productName: form.productName,
            features: form.features,
            coreContent: form.coreContent,
            target: form.target,
            tone: form.tone,
            styleGuide: result?.styleGuide,
            businessName: form.businessName,
        });
        router.push(path);
    };

    const modelCfg = MODEL_CONFIG[selectedModel];
    const activeSlide = result?.slides[selectedSlide];
    const activePrompt = activeSlide ? (selectedModel === "gpt" ? activeSlide.gptPrompt : activeSlide.geminiPrompt) : null;

    // ── 결과 화면 ──
    if (result) {
        return (
            <AuthGate toolName="카드뉴스 생성기">
            <div className="space-y-0 max-w-3xl mx-auto">
                {/* 상단 바 */}
                <div className="sticky top-0 z-10 flex items-center gap-2 px-1 py-3 flex-wrap"
                    style={{ background: "var(--background)" }}>
                    <button
                        onClick={() => setShowFormPanel(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: showFormPanel ? "var(--primary)" : "var(--surface-2)", color: showFormPanel ? "white" : "var(--foreground-soft)" }}>
                        <Edit3 size={12} />
                        입력 수정
                        {showFormPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: "var(--foreground)" }}>{result.title}</p>
                        {result.styleGuide && (
                            <p className="text-[10px] truncate" style={{ color: "var(--foreground-muted)" }}>🎨 {result.styleGuide}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* 저장 상태 표시 */}
                        <span className="flex items-center gap-1 text-[11px] font-bold"
                            style={{ color: justSaved ? "var(--accent)" : "var(--foreground-muted)" }}>
                            {justSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                            {justSaved ? "갤러리에 저장됨" : "저장됨"}
                        </span>

                        <button onClick={() => { setResult(null); setShowFormPanel(false); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                            <RotateCcw size={12} />
                            새로 만들기
                        </button>
                    </div>
                </div>

                {/* 접히는 입력 폼 */}
                {showFormPanel && (
                    <div className="edu-card p-5 mb-4 space-y-4">
                        <FormFields form={form} setForm={setForm} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
                        {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>}
                        <GenerateButton
                            onClick={handleSubmit}
                            loading={loading}
                            canGenerate={usage.canGenerate}
                            label="다시 생성하기"
                        />
                    </div>
                )}

                {/* 모델 선택 바 */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "var(--foreground-muted)" }}>이미지 모델:</span>
                    {(["gpt", "gemini"] as ImageModel[]).map(m => {
                        const cfg = MODEL_CONFIG[m];
                        const isSelected = selectedModel === m;
                        return (
                            <button key={m} onClick={() => setSelectedModel(m)}
                                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={{
                                    background: isSelected ? cfg.color : "var(--surface-2)",
                                    color: isSelected ? "white" : "var(--foreground-soft)",
                                }}>
                                {cfg.label}
                            </button>
                        );
                    })}
                    <div className="flex-1" />
                    <button onClick={copyAllPrompts}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        style={{ background: copiedAll ? "var(--accent)" : "var(--surface-2)", color: copiedAll ? "white" : "var(--foreground-soft)" }}>
                        {copiedAll ? <Check size={11} /> : <Copy size={11} />}
                        {copiedAll ? "복사됨!" : "전체 프롬프트 복사"}
                    </button>
                </div>

                {/* 슬라이드 탭 스트립 */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
                    {result.slides.map((slide, idx) => {
                        const color = slideTypeColor[slide.type] || "var(--primary)";
                        const isActive = selectedSlide === idx;
                        return (
                            <button
                                key={slide.slideNum}
                                onClick={() => setSelectedSlide(idx)}
                                className="flex flex-col items-center gap-1 shrink-0 px-4 py-3 rounded-2xl transition-all"
                                style={{
                                    minWidth: 72,
                                    background: isActive ? color : "var(--surface-2)",
                                    border: `2px solid ${isActive ? color : "transparent"}`,
                                }}>
                                <span className="text-base font-black leading-none" style={{ color: isActive ? "white" : "var(--foreground-soft)" }}>
                                    {slide.slideNum}
                                </span>
                                <span className="text-[9px] font-bold leading-none" style={{ color: isActive ? "rgba(255,255,255,0.85)" : "var(--foreground-muted)" }}>
                                    {slideTypeLabel[slide.type] ?? slide.type}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 선택된 슬라이드 디테일 */}
                {activeSlide && (
                    <div className="edu-card overflow-hidden mb-4">
                        {/* 슬라이드 헤더 */}
                        <div className="px-5 py-4 border-b"
                            style={{ background: (slideTypeColor[activeSlide.type] || "var(--primary)") + "10", borderColor: "var(--border)" }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                                        style={{ background: slideTypeColor[activeSlide.type] || "var(--primary)" }}>
                                        {activeSlide.slideNum}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: (slideTypeColor[activeSlide.type] || "var(--primary)") + "20", color: slideTypeColor[activeSlide.type] || "var(--primary)" }}>
                                        {slideTypeLabel[activeSlide.type] ?? activeSlide.type}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setSelectedSlide(Math.max(0, selectedSlide - 1))}
                                        disabled={selectedSlide === 0}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30"
                                        style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>‹</button>
                                    <button onClick={() => setSelectedSlide(Math.min(result.slides.length - 1, selectedSlide + 1))}
                                        disabled={selectedSlide === result.slides.length - 1}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30"
                                        style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>›</button>
                                </div>
                            </div>
                        </div>

                        {/* 슬라이드 콘텐츠 */}
                        <div className="p-5 space-y-4">
                            {/* 텍스트 내용 */}
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--foreground-muted)" }}>헤드라인</p>
                                    <p className="text-lg font-black leading-snug" style={{ color: "var(--foreground)" }}>{activeSlide.headline}</p>
                                </div>
                                {activeSlide.subtext && (
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--foreground-muted)" }}>부제목</p>
                                        <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{activeSlide.subtext}</p>
                                    </div>
                                )}
                                {activeSlide.body && (
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--foreground-muted)" }}>본문</p>
                                        <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{activeSlide.body}</p>
                                    </div>
                                )}
                                {activeSlide.hashtags && activeSlide.hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeSlide.hashtags.map(tag => (
                                            <span key={tag} className="text-xs font-semibold" style={{ color: "var(--secondary)" }}>#{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 이미지 프롬프트 */}
                            {activePrompt && (
                                <div className="rounded-2xl overflow-hidden border"
                                    style={{ borderColor: modelCfg.color + "30" }}>
                                    <div className="flex items-center justify-between px-4 py-2.5"
                                        style={{ background: modelCfg.bg, borderBottom: `1px solid ${modelCfg.color}20` }}>
                                        <span className="text-xs font-black" style={{ color: modelCfg.color }}>
                                            🖼️ {modelCfg.label} 이미지 프롬프트
                                        </span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => copySlidePrompt(activeSlide)}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                                                style={{ background: copiedSlide === activeSlide.slideNum ? modelCfg.color : "white", color: copiedSlide === activeSlide.slideNum ? "white" : modelCfg.color }}>
                                                {copiedSlide === activeSlide.slideNum ? <Check size={10} /> : <Copy size={10} />}
                                                {copiedSlide === activeSlide.slideNum ? "복사됨!" : "복사"}
                                            </button>
                                            <a href={modelCfg.link} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                                style={{ background: modelCfg.color, color: "white" }}>
                                                <ExternalLink size={10} />
                                                {modelCfg.linkLabel}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
                                        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground-soft)" }}>
                                            {activePrompt}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 이어서 만들기 */}
                <div className="edu-card p-5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Link2 size={14} style={{ color: "var(--primary)" }} />
                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>이 카드뉴스로 이어서 만들기</p>
                    </div>
                    <p className="text-xs mb-3" style={{ color: "var(--foreground-muted)" }}>
                        카드뉴스 내용을 그대로 가져가서 상세페이지나 쇼츠 스크립트를 만들어요.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => goToTool("/detail-page")}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                            style={{ background: "var(--secondary-light)", color: "var(--secondary)" }}>
                            <FileText size={15} />상세페이지 만들기
                        </button>
                        <button onClick={() => goToTool("/shorts")}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                            style={{ background: "#ECFDF5", color: "var(--accent)" }}>
                            <Film size={15} />쇼츠 스크립트 만들기
                        </button>
                    </div>
                </div>

                {/* AI 수정 요청 패널 */}
                <RefinementPanel
                    contentType="cardnews"
                    originalInput={form}
                    currentResult={result as unknown as Record<string, unknown>}
                    onUpdate={(newResult) => {
                        setResult(newResult as unknown as CardNewsResult);
                        setSelectedSlide(0);
                    }}
                />
            </div>
            </AuthGate>
        );
    }

    // ── 입력 화면 (결과 없을 때) ──
    return (
        <AuthGate toolName="카드뉴스 생성기">
        <div className="space-y-8">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                    style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                    <Layers size={12} />
                    카드뉴스 생성기
                </div>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>카드뉴스 생성기</h1>
                    <UsageBar usage={usage} />
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                    제품 정보를 입력하면 슬라이드 구성 + 카피 + 모델별 이미지 프롬프트를 만들어드려요.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 입력 폼 */}
                <div className="edu-card p-6 space-y-5">
                    <h2 className="text-base font-black" style={{ color: "var(--foreground)" }}>제품 정보 입력</h2>
                    <FormFields form={form} setForm={setForm} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} />
                    {error && <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>}
                    <GenerateButton
                        onClick={handleSubmit}
                        loading={loading}
                        canGenerate={usage.canGenerate}
                        label="카드뉴스 생성하기"
                        loadingLabel="AI가 카드뉴스를 만들고 있어요..."
                    />
                </div>

                {/* 대기 상태 */}
                <div className="edu-card p-8 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 300 }}>
                    {loading ? (
                        <>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
                                <Sparkles size={22} className="animate-pulse" style={{ color: "var(--primary)" }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>AI가 카드뉴스를 구성하고 있어요</p>
                            <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>슬라이드별 이미지 프롬프트까지 생성 중...<br />15-25초 정도 걸려요</p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
                                <Layers size={26} style={{ color: "var(--primary)" }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>왼쪽에 정보를 입력하면<br />카드뉴스 결과가 여기 표시돼요</p>
                            <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>슬라이드 탭 뷰 + 이미지 프롬프트 (GPT / Nanobanana)</p>
                            <p className="text-xs px-3 py-1.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                                💾 생성 즉시 갤러리에 자동 저장돼요
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
        </AuthGate>
    );
}

function GenerateButton({ onClick, loading, canGenerate, label, loadingLabel }: {
    onClick: () => void;
    loading: boolean;
    canGenerate: boolean;
    label: string;
    loadingLabel?: string;
}) {
    const exceeded = !canGenerate && !loading;
    return (
        <button
            onClick={onClick}
            disabled={loading || !canGenerate}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
            style={{
                background: exceeded ? "var(--surface-2)" : "linear-gradient(135deg, var(--primary), #FF9A72)",
                color: exceeded ? "var(--foreground-muted)" : "white",
                opacity: loading ? 0.7 : 1,
            }}>
            {loading
                ? <span className="flex items-center justify-center gap-2"><Sparkles size={15} className="animate-spin" />{loadingLabel ?? "AI가 생성하고 있어요..."}</span>
                : exceeded
                    ? <span className="flex items-center justify-center gap-2"><ZapOff size={15} />오늘 생성 횟수 소진 — 내일 초기화</span>
                    : <span className="flex items-center justify-center gap-2"><Sparkles size={15} />{label}</span>}
        </button>
    );
}

type FormType = { contentType: string; businessName: string; productName: string; features: string; coreContent: string; target: string; tone: string; excludeWords: string; referenceStyle: string; contentGoal: string; slideCount: string };

// ── 입력 폼 공용 컴포넌트 ──
function FormFields({ form, setForm, showAdvanced, setShowAdvanced }: {
    form: FormType;
    setForm: React.Dispatch<React.SetStateAction<FormType>>;
    showAdvanced: boolean;
    setShowAdvanced: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
    const p = TONE_PREVIEWS[form.tone] ?? TONE_PREVIEWS["친근하고 감성적"];
    const typeCfg = TYPE_FORM_CONFIG[form.contentType] ?? TYPE_FORM_CONFIG.promotion;
    const isPromotion = form.contentType === "promotion";

    return (
        <div className="space-y-4">
            {/* ── 콘텐츠 유형 ── */}
            <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>카드뉴스 유형 <span style={{ color: "var(--primary)" }}>*</span></label>
                <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPES.map(ct => (
                        <button key={ct.value} onClick={() => setForm(f => ({ ...f, contentType: ct.value }))}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                            style={{
                                background: form.contentType === ct.value ? "var(--primary-light)" : "var(--surface-2)",
                                border: `1.5px solid ${form.contentType === ct.value ? "var(--primary)" : "var(--border)"}`,
                            }}>
                            <span className="text-base leading-none">{ct.emoji}</span>
                            <div>
                                <p className="text-xs font-black leading-none mb-0.5" style={{ color: form.contentType === ct.value ? "var(--primary)" : "var(--foreground)" }}>{ct.label}</p>
                                <p className="text-[10px]" style={{ color: "var(--foreground-muted)" }}>{ct.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 브랜드명 (홍보 유형만) ── */}
            {isPromotion && (
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>브랜드/상호명 <span style={{ fontWeight: 400 }}>(선택)</span></label>
                    <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder="예: 꽃다온 플로리스트"
                        value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                        onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                </div>
            )}

            {/* ── 주제/제품/서비스명 ── */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>{typeCfg.subjectLabel} <span style={{ color: "var(--primary)" }}>*</span></label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={typeCfg.subjectPlaceholder}
                    value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            </div>

            {/* ── 핵심 내용 (비홍보 유형은 필수, 홍보는 선택) ── */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {typeCfg.coreContentLabel}
                    {typeCfg.coreContentRequired
                        ? <span style={{ color: "var(--primary)" }}> *</span>
                        : <span style={{ fontWeight: 400 }}> (선택)</span>}
                </label>
                <textarea className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={typeCfg.coreContentPlaceholder}
                    rows={isPromotion ? 2 : 5}
                    value={form.coreContent} onChange={e => setForm(f => ({ ...f, coreContent: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                {!isPromotion && (
                    <p className="text-[10px] mt-1" style={{ color: "var(--foreground-muted)" }}>
                        💡 내용이 구체적일수록 각 슬라이드의 본문 텍스트가 풍부해져요
                    </p>
                )}
            </div>

            {/* ── 특징/장점 ── */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {typeCfg.featuresLabel}
                    {isPromotion ? <span style={{ color: "var(--primary)" }}> *</span> : <span style={{ fontWeight: 400 }}> (선택)</span>}
                </label>
                <textarea className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={typeCfg.featuresPlaceholder}
                    rows={2} value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            </div>

            {/* ── 대상 ── */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {isPromotion ? "타겟 고객" : "대상 독자"} <span style={{ fontWeight: 400 }}>(선택)</span>
                </label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={isPromotion ? "예: 건강을 중시하는 30-40대 직장인" : "예: AI에 처음 입문하는 직장인, 고등학생"}
                    value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = "var(--primary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
            </div>

            {/* 톤앤매너 */}
            <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>
                    톤앤매너 <span style={{ fontWeight: 400 }}>— 선택하면 예시가 아래에 표시돼요</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                    {TONES.map(t => {
                        const tp = TONE_PREVIEWS[t];
                        return (
                            <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={{
                                    background: form.tone === t ? "var(--primary)" : "var(--surface-2)",
                                    color: form.tone === t ? "white" : "var(--foreground-soft)",
                                    outline: form.tone === t ? "2px solid var(--primary)" : "none",
                                    outlineOffset: "2px",
                                }}>
                                {tp.emoji} {t}
                            </button>
                        );
                    })}
                </div>
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: p.color + "40", background: p.bg }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: p.color + "30", background: p.color + "15" }}>
                        <div className="flex items-center gap-2">
                            <span className="text-base">{p.emoji}</span>
                            <span className="text-xs font-black" style={{ color: p.color }}>{form.tone}</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: p.color + "20", color: p.color }}>{p.keyword}</span>
                    </div>
                    <div className="p-4 space-y-2.5">
                        <div><p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: p.color + "99" }}>표지 헤드라인</p><p className="text-base font-black" style={{ color: p.color }}>{p.headline}</p></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: p.color + "99" }}>본문</p><p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: p.color + "CC" }}>{p.body}</p></div>
                        <div><p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: p.color + "99" }}>CTA</p><p className="text-sm font-black" style={{ color: p.color }}>{p.cta}</p></div>
                        <div className="flex flex-wrap gap-1.5">{p.hashtags.map(tag => <span key={tag} className="text-[11px] font-semibold" style={{ color: p.color + "AA" }}>{tag}</span>)}</div>
                    </div>
                    <div className="px-4 pb-3"><p className="text-[10px]" style={{ color: p.color + "88" }}>※ 동일 제품·정보로 톤만 다르게 했을 때의 예시입니다</p></div>
                </div>
            </div>

            {/* 정확도 향상 옵션 */}
            <div>
                <button onClick={() => setShowAdvanced(v => !v)} className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--secondary)" }}>
                    <ChevronDown size={14} style={{ transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    {showAdvanced ? "정확도 향상 옵션 닫기" : "✨ 정확도 향상 옵션 열기 (선택)"}
                </button>
                {showAdvanced && (
                    <div className="mt-3 space-y-4 p-4 rounded-2xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                        <div>
                            <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>콘텐츠 목적</label>
                            <div className="grid grid-cols-2 gap-2">
                                {CONTENT_GOALS.map(g => (
                                    <button key={g.value} onClick={() => setForm(f => ({ ...f, contentGoal: g.value }))}
                                        className="flex flex-col items-start px-3 py-2.5 rounded-xl text-left transition-all"
                                        style={{ background: form.contentGoal === g.value ? "var(--secondary-light)" : "var(--surface)", border: `1.5px solid ${form.contentGoal === g.value ? "var(--secondary)" : "var(--border)"}` }}>
                                        <span className="text-xs font-black" style={{ color: form.contentGoal === g.value ? "var(--secondary)" : "var(--foreground)" }}>{g.label}</span>
                                        <span className="text-[10px] mt-0.5" style={{ color: "var(--foreground-muted)" }}>{g.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>슬라이드 수</label>
                            <div className="flex gap-2">
                                {["4", "5", "6", "8", "10"].map(n => (
                                    <button key={n} onClick={() => setForm(f => ({ ...f, slideCount: n }))}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={{ background: form.slideCount === n ? "var(--secondary)" : "var(--surface)", color: form.slideCount === n ? "white" : "var(--foreground-soft)", border: `1.5px solid ${form.slideCount === n ? "var(--secondary)" : "var(--border)"}` }}>
                                        {n}장
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>참고 브랜드 스타일</label>
                            <input className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                                style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                                placeholder="예: 올리브영, 무신사, 마켓컬리"
                                value={form.referenceStyle} onChange={e => setForm(f => ({ ...f, referenceStyle: e.target.value }))}
                                onFocus={e => (e.target.style.borderColor = "var(--secondary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>쓰지 말아야 할 단어 <span className="font-normal text-[11px]">— 쉼표로 구분</span></label>
                            <input className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                                style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                                placeholder="예: 최고, 특별한, 할인"
                                value={form.excludeWords} onChange={e => setForm(f => ({ ...f, excludeWords: e.target.value }))}
                                onFocus={e => (e.target.style.borderColor = "var(--secondary)")} onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
