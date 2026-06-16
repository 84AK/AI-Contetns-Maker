"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Sparkles, ChevronRight, ChevronLeft, Check,
    Layers, Film, FileText, Copy, Download,
    BookOpen, Target, Lightbulb, Palette,
    Users, MessageSquare, Image, LayoutGrid,
    ExternalLink, RotateCcw, ZapOff, AlertCircle,
    Feather, Pencil, X,
} from "lucide-react";
import AuthGate from "@/components/common/AuthGate";
import UsageBar from "@/components/common/UsageBar";
import { useUsage } from "@/lib/hooks/useUsage";

// ─── 타입 ──────────────────────────────────────────────────────────────
interface Slide {
    slideNum: number;
    type: string;
    headline: string;
    subtext?: string;
    body: string;
    imageDesc?: string;
    hashtags?: string[];
    gptPrompt?: string;
    geminiPrompt?: string;
    // 쇼츠 전용
    duration?: string;
    action?: string;
    camera?: string;
}

interface PlannerResult {
    title: string;
    styleGuide?: string;
    template?: string;
    slides: Slide[];
    prdDocument: string;
    copywritingPrompt: string;
    // 쇼츠 전용
    subjectDesignSheet?: string;
    fullVideoPrompt?: string;
}

type ImageModel = "gpt" | "gemini";

// ─── 상수 ──────────────────────────────────────────────────────────────
const RESEARCH_TEMPLATES = {
    "🏪 소상공인 홍보": `저는 [업종/상호명]을 운영하고 있습니다.
주요 고객층은 [연령대, 직업, 상황]이고,
주로 [인스타그램 / 블로그 / 카카오채널]을 통해 홍보하고 있습니다.

현재 고민:
- 고객들이 [제품/서비스의 이 부분]을 잘 모르는 것 같습니다
- [경쟁사 대비 우리 강점]이 있지만 전달이 안 되고 있어요
- [이번에 홍보하고 싶은 것]을 알리고 싶습니다

이번 콘텐츠로 [구매 전환 / 팔로워 확보 / 브랜드 인지도]를 높이고 싶습니다.`,

    "📚 수업·강의 소개": `저는 [과목/분야] 수업(강의)을 소개하는 콘텐츠를 만들려고 합니다.
대상은 [연령대, 수준 — 예: AI를 처음 접하는 고등학생]입니다.

이 수업에서 배울 수 있는 핵심:
- [핵심 내용 1]
- [핵심 내용 2]
- [핵심 내용 3]

많은 학생들이 [어떤 어려움이나 오해]를 갖고 있는데,
이 콘텐츠를 통해 [참여 동기 / 이해도]를 높이고 싶습니다.`,

    "💡 정보·꿀팁 공유": `저는 [주제]에 대한 정보를 [대상]에게 전달하고 싶습니다.

많은 사람들이 잘 모르는 사실:
- [흔한 오해 또는 잘 모르는 정보 1]
- [흔한 오해 또는 잘 모르는 정보 2]

이 콘텐츠로 [올바른 정보 / 실용적인 꿀팁]을 쉽고 친근하게
알려주고 싶습니다. 읽고 나면 [독자가 얻어가는 것]을 갖게 되면 좋겠습니다.`,

    "🎯 이벤트·캠페인": `저는 [이벤트/캠페인 명]을 알리는 콘텐츠를 만들려고 합니다.
기간: [시작일 ~ 종료일]
참여 대상: [누가 참여할 수 있나요?]

핵심 혜택:
- [혜택 1]
- [혜택 2]

참여 방법: [간단한 참여 절차]
이 캠페인을 통해 [브랜드/서비스]가 [목표]를 달성하길 원합니다.`,
};

const TEMPLATES = [
    {
        id: "cardnews",
        icon: Layers,
        name: "카드뉴스",
        tagline: "정보를 슬라이드로 시각적으로 전달",
        color: "var(--primary)",
        colorLight: "var(--primary-light)",
        whenToUse: [
            "복잡한 정보를 쉽게 정리하고 싶을 때",
            "저장·공유 유도 콘텐츠를 만들 때",
            "여러 내용을 순서대로 보여주고 싶을 때",
        ],
        output: "4~10컷 슬라이드 + 컷별 이미지 프롬프트",
        channels: "인스타그램 · 블로그 · 카카오채널",
        difficulty: "⭐⭐ 이미지 작업 필요",
        notSuitableFor: "단순한 제품 사진 한 장 홍보 → 쇼츠가 더 적합",
    },
    {
        id: "shorts",
        icon: Film,
        name: "쇼츠 스크립트",
        tagline: "60초 영상 대본 + 장면별 자막",
        color: "var(--accent)",
        colorLight: "#ECFDF5",
        whenToUse: [
            "제품을 직접 보여주고 싶을 때",
            "바이럴 효과를 원할 때",
            "말로 설명하면 더 잘 전달될 때",
        ],
        output: "장면별 스크립트 + 자막 + 음악 추천",
        channels: "유튜브 쇼츠 · 인스타 릴스 · 틱톡",
        difficulty: "⭐⭐⭐ 영상 편집 필요",
        notSuitableFor: "텍스트 정보 전달 → 카드뉴스가 더 적합",
    },
    {
        id: "story",
        icon: Feather,
        name: "썰 풀기 스토리",
        tagline: "공감으로 시작해 자연스럽게 제품을 소개하는 이야기형",
        color: "#8B5CF6",
        colorLight: "#F5F3FF",
        whenToUse: [
            "창업 계기나 브랜드 스토리를 전달할 때",
            "\"나도 이랬는데\" 공감 유발 후 자연스럽게 제품을 소개하고 싶을 때",
            "딱딱한 홍보 없이 바이럴 스토리로 팔고 싶을 때",
        ],
        output: "훅 → 갈등 → 전환 → 해결 → 공개 → CTA 구조 스토리",
        channels: "인스타그램 · 블로그 · 브런치",
        difficulty: "⭐ 스토리 소재만 있으면 OK",
        notSuitableFor: "빠른 정보 전달 목적 → 카드뉴스 정보형이 더 적합",
    },
    {
        id: "detail-page",
        icon: FileText,
        name: "상세페이지",
        tagline: "구매 전환 특화 스마트스토어 최적화",
        color: "var(--secondary)",
        colorLight: "var(--secondary-light)",
        whenToUse: [
            "온라인 스토어에 상품을 올릴 때",
            "구매 설득이 목적일 때",
            "가격 저항감을 줄이고 싶을 때",
        ],
        output: "후킹 헤드라인 + 특장점 + CTA 섹션 전체",
        channels: "스마트스토어 · 쿠팡 · 크몽 · 자사몰",
        difficulty: "⭐⭐ 디자인 작업 필요",
        notSuitableFor: "SNS 바이럴 → 카드뉴스·쇼츠가 더 적합",
    },
];

const TONES = [
    { value: "친근하고 감성적", emoji: "🤍", keyword: "공감 · 따뜻함 · 일상" },
    { value: "전문적이고 신뢰감", emoji: "🎯", keyword: "근거 · 수치 · 신뢰" },
    { value: "활기차고 트렌디", emoji: "🔥", keyword: "트렌드 · 바이럴 · MZ" },
    { value: "고급스럽고 프리미엄", emoji: "✨", keyword: "품격 · 희소성 · 가치" },
    { value: "유머러스하고 재밌는", emoji: "😄", keyword: "웃음 · 공감 · 바이럴" },
];

const IMAGE_STYLES = [
    {
        value: "일러스트",
        emoji: "🖌️",
        label: "일러스트",
        desc: "따뜻하고 감성적인 느낌. 손그림·벡터 캐릭터로 친근감을 줄 때.",
        fit: "교육 콘텐츠, 라이프스타일, 감성 브랜드",
        promptHint: "flat illustration, soft pastel colors, friendly",
    },
    {
        value: "실사",
        emoji: "📷",
        label: "실사 사진",
        desc: "현실적이고 신뢰감 있는 느낌. 실제 제품·사람을 보여줄 때.",
        fit: "식품, 뷰티, 소상공인 제품 홍보",
        promptHint: "realistic photography, natural lighting, authentic",
    },
    {
        value: "플랫디자인",
        emoji: "🔲",
        label: "플랫디자인",
        desc: "깔끔하고 현대적인 느낌. 정보를 명료하게 전달할 때.",
        fit: "IT, 스타트업, 정보 전달 콘텐츠",
        promptHint: "flat design, minimalist, bold colors, clean",
    },
    {
        value: "타이포 중심",
        emoji: "✍️",
        label: "타이포 중심",
        desc: "텍스트가 주인공. 강렬한 카피를 시각적으로 강조할 때.",
        fit: "명언·동기부여, 유머 콘텐츠, 프리미엄 브랜드",
        promptHint: "typography-focused, bold text, creative font",
    },
];

const CONTENT_TYPES = [
    { value: "promotion", emoji: "🛍️", label: "제품/서비스 홍보" },
    { value: "education", emoji: "📚", label: "수업/강의 소개" },
    { value: "tutorial", emoji: "🔧", label: "사용법 튜토리얼" },
    { value: "info", emoji: "💡", label: "정보/지식 전달" },
];

const SLIDE_TYPE_LABEL: Record<string, string> = {
    // 쇼츠 장면
    scene_hook: "훅 장면", scene_problem: "문제 장면", scene_solution: "해결 장면",
    scene_demo: "시연 장면", scene_cta: "CTA 장면",
    // 상세페이지 섹션
    dp_hero: "히어로", dp_pain: "고객 고충", dp_solution: "해결책",
    dp_feature1: "특징 1", dp_feature2: "특징 2", dp_review: "후기/증명", dp_cta: "구매 유도",
    // 카드뉴스 (기존)
    cover: "표지", problem: "공감", solution: "해결책",
    feature1: "포인트 1", feature2: "포인트 2", feature3: "포인트 3",
    review: "후기", comparison: "비교", howto: "사용법", cta: "행동 유도",
    story_hook: "훅", story_conflict: "갈등", story_conflict2: "갈등 심화",
    story_turning: "전환점", story_resolve: "해결", story_resolve2: "해결 심화",
    story_resolve3: "효과 확인", story_reveal: "제품 공개", story_proof: "신뢰/증거",
};

const SLIDE_TYPE_COLOR: Record<string, string> = {
    // 쇼츠 장면
    scene_hook: "#8B5CF6", scene_problem: "#F59E0B", scene_solution: "#06D6A0",
    scene_demo: "#4361EE", scene_cta: "#FF6B35",
    // 상세페이지 섹션
    dp_hero: "#FF6B35", dp_pain: "#F59E0B", dp_solution: "#06D6A0",
    dp_feature1: "#4361EE", dp_feature2: "#8B5CF6", dp_review: "#0EA5E9", dp_cta: "#FF6B35",
    // 카드뉴스 (기존)
    cover: "#FF6B35", problem: "#F59E0B", solution: "#06D6A0",
    feature1: "#4361EE", feature2: "#4361EE", feature3: "#4361EE",
    review: "#8B5CF6", comparison: "#EC4899", howto: "#0EA5E9", cta: "#FF6B35",
    story_hook: "#8B5CF6", story_conflict: "#F59E0B", story_conflict2: "#F59E0B",
    story_turning: "#4361EE", story_resolve: "#06D6A0", story_resolve2: "#06D6A0",
    story_resolve3: "#06D6A0", story_reveal: "#FF6B35", story_proof: "#8B5CF6",
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function PlannerPage() {
    const router = useRouter();
    const usage = useUsage();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PlannerResult | null>(null);
    const [error, setError] = useState("");
    const [selectedModel, setSelectedModel] = useState<ImageModel>("gpt");
    const [selectedSlide, setSelectedSlide] = useState(0);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"storyboard" | "prd" | "prompts">("storyboard");
    // 마지막 생성 시점의 폼 스냅샷 (변경 여부 감지용)
    const [formSnapshot, setFormSnapshot] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [autoSaving, setAutoSaving] = useState(false);

    // ── 폼 상태 ──
    const DEFAULT_FORM = {
        researchContext: "",
        problemStatement: "",
        solutionDirection: "",
        topicStatement: "",
        template: "",
        contentType: "promotion",
        businessName: "",
        productName: "",
        features: "",
        coreContent: "",
        target: "",
        tone: "친근하고 감성적",
        imageStyle: "일러스트",
        slideCount: "6",
        contentGoal: "purchase",
    };
    const [form, setForm] = useState(DEFAULT_FORM);

    const setField = (key: string, value: string) =>
        setForm(f => ({ ...f, [key]: value }));

    // 폼 변경 시마다 sessionStorage에 저장
    useEffect(() => {
        sessionStorage.setItem("planner_form_draft", JSON.stringify(form));
    }, [form]);

    // 마운트 시 sessionStorage에서 폼 복원 (페이지 이동 후 돌아와도 유지)
    useEffect(() => {
        const saved = sessionStorage.getItem("planner_form_draft");
        if (!saved) return;
        try {
            const f = JSON.parse(saved);
            setForm(prev => ({ ...prev, ...f }));
        } catch { /* 무시 */ }
    }, []);

    // 갤러리에서 복원
    useEffect(() => {
        const saved = localStorage.getItem("ai_gallery_restore_planner");
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.slides?.length) {
                const { _savedId, ...content } = parsed;
                setResult(content as PlannerResult);
                setSavedId(_savedId ?? null);
                setStep(4);
            }
        } catch { /* 무시 */ }
        localStorage.removeItem("ai_gallery_restore_planner");
    }, []);

    const updateSlide = async (idx: number, updates: Partial<Slide>) => {
        setResult(prev => {
            if (!prev) return prev;
            const slides = [...prev.slides];
            slides[idx] = { ...slides[idx], ...updates };
            const next = { ...prev, slides };
            // savedId가 있으면 DB에 자동 저장
            if (savedId) {
                const token = usage.getToken();
                token.then(t => {
                    setAutoSaving(true);
                    fetch("/api/ai/save", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
                        body: JSON.stringify({ id: savedId, content: next }),
                    }).finally(() => {
                        setAutoSaving(false);
                    });
                });
            }
            return next;
        });
    };

    // 마지막 생성 후 폼이 변경됐는지 여부
    const isFormDirty = formSnapshot !== null && JSON.stringify(form) !== formSnapshot;
    // 이미 생성된 결과가 있고 폼이 변경되지 않았으면 → 다음 단계 이동 가능
    const canSkipGenerate = result !== null && !isFormDirty;

    // ── 유효성 검사 ──
    const canProceed = (s: number): boolean => {
        if (s === 1) return form.researchContext.trim().length > 10;
        if (s === 2) return form.topicStatement.trim().length > 5 && form.template !== "";
        if (s === 3) return form.productName.trim().length > 0;
        return true;
    };

    // ── AI 생성 ──
    const handleGenerate = async () => {
        setError("");
        setLoading(true);
        setResult(null);

        try {
            const token = await usage.getToken();
            const res = await fetch("/api/ai/planner", {
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
            setResult(content as PlannerResult);
            setSavedId(_savedId ?? null);
            setSelectedSlide(0);
            setFormSnapshot(JSON.stringify(form));
            usage.refresh();
            setStep(4);
        } catch (e) {
            setError(e instanceof Error ? e.message : "오류가 발생했어요.");
        } finally {
            setLoading(false);
        }
    };

    const copyText = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const STEPS = [
        { num: 1, label: "리서치", icon: BookOpen },
        { num: 2, label: "템플릿", icon: LayoutGrid },
        { num: 3, label: "구성", icon: Palette },
        { num: 4, label: "스토리보드", icon: Image },
        { num: 5, label: "기획서", icon: FileText },
    ];

    return (
        <AuthGate toolName="마케팅 기획 플래너">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* ── 헤더 ── */}
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-3"
                        style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                        <Sparkles size={13} />
                        5단계 마케팅 기획 플래너
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>
                                기획부터 결과물까지
                            </h1>
                            <p className="text-base mt-1" style={{ color: "var(--foreground-soft)" }}>
                                리서치 → 주제 → 구성 → 스토리보드 → PRD 기획서
                            </p>
                        </div>
                        <UsageBar usage={usage} />
                    </div>
                </div>

                {/* ── 진행 바 ── */}
                <div className="edu-card p-4">
                    <div className="flex items-center">
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            const isActive = step === s.num;
                            const isDone = step > s.num;
                            return (
                                <div key={s.num} className="flex items-center flex-1 min-w-0">
                                    <button
                                        onClick={() => { if (isDone || isActive) setStep(s.num); }}
                                        disabled={!isDone && !isActive}
                                        className="flex flex-col items-center gap-1 min-w-0 flex-1 transition-all"
                                    >
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center font-black shrink-0 transition-all"
                                            style={{
                                                background: isDone ? "var(--accent)" : isActive ? "var(--primary)" : "var(--surface-3)",
                                                color: isDone || isActive ? "white" : "var(--foreground-soft)",
                                            }}
                                        >
                                            {isDone ? <Check size={15} /> : <Icon size={14} />}
                                        </div>
                                        <span className="text-xs font-bold hidden sm:block"
                                            style={{ color: isActive ? "var(--primary)" : isDone ? "var(--accent)" : "var(--foreground-soft)" }}>
                                            {s.label}
                                        </span>
                                    </button>
                                    {i < STEPS.length - 1 && (
                                        <div className="flex-1 h-0.5 mx-1 rounded-full transition-all"
                                            style={{ background: step > s.num ? "var(--accent)" : "var(--surface-3)" }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════
                    STEP 1 · 리서치 및 문제 정의
                ══════════════════════════════════════════════════ */}
                {step === 1 && (
                    <div className="space-y-5">
                        <StepHeader
                            num={1}
                            title="리서치 및 문제 정의"
                            desc="콘텐츠가 해결할 문제를 먼저 정의하세요. 이 내용이 구체적일수록 AI가 더 맥락 있는 결과를 만들어줍니다."
                        />

                        {/* 배경 자료 */}
                        <div className="edu-card p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "var(--primary-light)" }}>
                                    <BookOpen size={14} style={{ color: "var(--primary)" }} />
                                </div>
                                <span className="text-base font-black" style={{ color: "var(--foreground)" }}>
                                    배경 자료 & 콘텐츠 맥락 <span style={{ color: "var(--primary)" }}>*</span>
                                </span>
                            </div>

                            <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                어떤 상황에서, 누구를 위해, 왜 이 콘텐츠를 만드나요? 자유롭게 써도 되고, 아래 빠른 시작 버튼을 눌러 시작하세요.
                            </p>

                            {/* 템플릿 버튼 */}
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(RESEARCH_TEMPLATES).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setField("researchContext", RESEARCH_TEMPLATES[key as keyof typeof RESEARCH_TEMPLATES])}
                                        className="px-3 py-2 rounded-full text-sm font-bold transition-all"
                                        style={{ background: "var(--primary-light)", color: "var(--primary)", border: "1.5px solid var(--primary)" }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.background = "var(--primary)";
                                            (e.currentTarget as HTMLElement).style.color = "white";
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.background = "var(--primary-light)";
                                            (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                                        }}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                                style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)", minHeight: 180, lineHeight: 1.7 }}
                                placeholder={"예시)\n저는 수제 캔들을 만드는 소상공인입니다.\n인스타그램으로 홍보하고 있는데, 제품의 천연 재료 사용이나\n손으로 직접 만드는 과정의 특별함이 잘 전달되지 않아요.\n구매 고민 중인 30대 여성들이 안심하고 구매할 수 있도록\n신뢰감 있는 카드뉴스를 만들고 싶습니다."}
                                rows={7}
                                value={form.researchContext}
                                onChange={e => setField("researchContext", e.target.value)}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />

                            <HintBox>
                                💡 <strong>더 구체적으로 쓸수록 AI 결과가 달라져요.</strong> "소상공인입니다"보다
                                "수제 캔들을 만드는 소상공인이고, 주 고객은 선물 구매하는 30대 여성"처럼 쓰면
                                AI가 훨씬 맥락 있는 카피를 만들어줍니다.
                            </HintBox>
                        </div>

                        {/* 핵심 문제 */}
                        <div className="edu-card p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "#FFF3CD" }}>
                                    <Target size={14} style={{ color: "#B45309" }} />
                                </div>
                                <span className="text-base font-black" style={{ color: "var(--foreground)" }}>
                                    핵심 문제 정리{" "}
                                    <span className="text-sm font-normal" style={{ color: "var(--foreground-soft)" }}>(선택)</span>
                                </span>
                            </div>

                            {/* 형식 가이드 */}
                            <div className="rounded-2xl overflow-hidden border"
                                style={{ borderColor: "var(--secondary)" + "40" }}>
                                <div className="px-4 py-2.5"
                                    style={{ background: "var(--secondary-light)", borderBottom: "1px solid " + "var(--secondary)" + "30" }}>
                                    <p className="text-sm font-black" style={{ color: "var(--secondary)" }}>
                                        📝 이렇게 써보세요
                                    </p>
                                </div>
                                <div className="px-4 py-3 space-y-2" style={{ background: "white" }}>
                                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                        <span className="font-bold" style={{ color: "var(--foreground)" }}>"~한 사람들이</span> ~를 몰라서 ~가 문제인데,
                                        콘텐츠로 ~을 <span className="font-bold" style={{ color: "var(--foreground)" }}>해결하고 싶다"</span>
                                    </p>
                                    <div className="pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                                        <p className="text-sm font-bold" style={{ color: "#059669" }}>
                                            ✅ 예시
                                        </p>
                                        <p className="text-sm mt-1" style={{ color: "#065F46" }}>
                                            "선물 구매 고민 중인 고객들이 천연 재료의 안전성을 모르고 망설이는데,
                                            제작 과정과 재료를 보여주는 카드뉴스로 신뢰를 높이고 싶다"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <textarea
                                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                                style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)", lineHeight: 1.7 }}
                                placeholder="핵심 문제를 한 문장으로 정리해보세요 (비워도 됩니다)"
                                rows={3}
                                value={form.problemStatement}
                                onChange={e => setField("problemStatement", e.target.value)}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>

                        {/* 해결 방향 */}
                        <div className="edu-card p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "var(--accent-light)" }}>
                                    <Lightbulb size={14} style={{ color: "var(--accent)" }} />
                                </div>
                                <span className="text-base font-black" style={{ color: "var(--foreground)" }}>
                                    해결 방향{" "}
                                    <span className="text-sm font-normal" style={{ color: "var(--foreground-soft)" }}>(선택)</span>
                                </span>
                            </div>
                            <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                이 콘텐츠를 보고 나서 독자에게 어떤 변화가 일어나면 좋겠나요?
                            </p>
                            <div className="px-4 py-3 rounded-xl text-sm font-semibold"
                                style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", color: "#065F46" }}>
                                ✅ 예시: "카드뉴스를 보고 재료의 안전성에 안심한 고객이 DM으로 구매 문의를 하게 된다"
                            </div>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                                style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)", lineHeight: 1.7 }}
                                placeholder="예: 콘텐츠를 보고 나서 독자가 직접 DM을 보내거나 구매 버튼을 누르게 하고 싶습니다"
                                rows={2}
                                value={form.solutionDirection}
                                onChange={e => setField("solutionDirection", e.target.value)}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>

                        <NavButtons
                            step={step} totalSteps={5}
                            canNext={canProceed(1)}
                            onNext={() => setStep(2)}
                            nextHint={!canProceed(1) ? "배경 자료를 10자 이상 입력해주세요" : ""}
                        />
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    STEP 2 · 주제 선정 + 템플릿 선택
                ══════════════════════════════════════════════════ */}
                {step === 2 && (
                    <div className="space-y-5">
                        <StepHeader
                            num={2}
                            title="주제 선정 & 템플릿 선택"
                            desc="만들 콘텐츠의 핵심 주제를 한 문장으로 정의하고, 어떤 형식으로 만들지 선택하세요."
                        />

                        {/* 주제 한 문장 */}
                        <div className="edu-card p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "var(--primary-light)" }}>
                                    <MessageSquare size={14} style={{ color: "var(--primary)" }} />
                                </div>
                                <span className="text-base font-black" style={{ color: "var(--foreground)" }}>
                                    콘텐츠 주제 한 문장 <span style={{ color: "var(--primary)" }}>*</span>
                                </span>
                            </div>

                            {/* 형식 가이드 박스 */}
                            <div className="rounded-2xl overflow-hidden border"
                                style={{ borderColor: "var(--primary)" + "40" }}>
                                <div className="px-4 py-2.5"
                                    style={{ background: "var(--primary-light)", borderBottom: "1px solid " + "var(--primary)" + "25" }}>
                                    <p className="text-sm font-black" style={{ color: "var(--primary)" }}>
                                        📝 이 형식을 참고하세요
                                    </p>
                                </div>
                                <div className="px-4 py-3 space-y-3" style={{ background: "white" }}>
                                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                        "나는{" "}
                                        <span className="font-black px-1.5 py-0.5 rounded-md" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>[누구]</span>
                                        {" "}에게{" "}
                                        <span className="font-black px-1.5 py-0.5 rounded-md" style={{ background: "var(--secondary-light)", color: "var(--secondary)" }}>[어떤 문제/정보]</span>
                                        {" "}를 전달하는{" "}
                                        <span className="font-black px-1.5 py-0.5 rounded-md" style={{ background: "#ECFDF5", color: "var(--accent)" }}>[형식]</span>
                                        을 만든다"
                                    </p>
                                    <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                                        <p className="text-sm" style={{ color: "#065F46" }}>
                                            ✅ "선물 구매 고민 중인 30대 여성에게 <span className="font-bold">수제 캔들 재료의 안전성</span>을 알려주는 카드뉴스를 만든다"
                                        </p>
                                        <p className="text-sm" style={{ color: "#065F46" }}>
                                            ✅ "AI를 처음 배우는 고등학생에게 <span className="font-bold">ChatGPT 기초 사용법</span>을 알려주는 카드뉴스를 만든다"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <input
                                className="w-full px-4 py-3.5 rounded-xl text-base border outline-none transition-all"
                                style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)" }}
                                placeholder="나는 [누구]에게 [어떤 내용]을 전달하는 [형식]을 만든다"
                                value={form.topicStatement}
                                onChange={e => setField("topicStatement", e.target.value)}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>

                        {/* 템플릿 선택 */}
                        <div className="edu-card p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: "var(--secondary-light)" }}>
                                    <LayoutGrid size={14} style={{ color: "var(--secondary)" }} />
                                </div>
                                <span className="text-base font-black" style={{ color: "var(--foreground)" }}>
                                    콘텐츠 형식 선택 <span style={{ color: "var(--primary)" }}>*</span>
                                </span>
                            </div>

                            <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                어떤 형식이 맞는지 모르겠다면 각 카드의 설명을 참고하세요.
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {TEMPLATES.map(tmpl => {
                                    const Icon = tmpl.icon;
                                    const isSelected = form.template === tmpl.id;
                                    return (
                                        <button
                                            key={tmpl.id}
                                            onClick={() => setField("template", tmpl.id)}
                                            className="text-left rounded-2xl overflow-hidden border-2 transition-all"
                                            style={{
                                                borderColor: isSelected ? tmpl.color : "var(--border)",
                                                background: isSelected ? tmpl.colorLight : "white",
                                            }}
                                        >
                                            {/* 카드 헤더 */}
                                            <div className="flex items-center gap-3 px-4 py-3.5 border-b"
                                                style={{ borderColor: isSelected ? tmpl.color + "30" : "var(--border)" }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: isSelected ? tmpl.color : tmpl.colorLight }}>
                                                    <Icon size={20} style={{ color: isSelected ? "white" : tmpl.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-black" style={{ color: isSelected ? tmpl.color : "var(--foreground)" }}>
                                                        {tmpl.name}
                                                    </p>
                                                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                                        {tmpl.tagline}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                                        style={{ background: tmpl.color }}>
                                                        <Check size={14} className="text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* 카드 본문 */}
                                            <div className="px-4 py-3.5 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm font-black mb-2" style={{ color: tmpl.color }}>✅ 이럴 때 선택</p>
                                                    <ul className="space-y-1.5">
                                                        {tmpl.whenToUse.map((w, i) => (
                                                            <li key={i} className="text-sm" style={{ color: "var(--foreground-soft)" }}>· {w}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-xs font-black mb-1" style={{ color: "var(--foreground-soft)" }}>💡 결과물</p>
                                                        <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{tmpl.output}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black mb-1" style={{ color: "var(--foreground-soft)" }}>📱 채널</p>
                                                        <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{tmpl.channels}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black mb-1" style={{ color: "var(--foreground-soft)" }}>⏱️ 난이도</p>
                                                        <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{tmpl.difficulty}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 부적합 케이스 */}
                                            <div className="px-4 pb-4">
                                                <p className="text-sm px-3 py-2 rounded-xl"
                                                    style={{ background: "#FFF8E7", color: "#92400E", border: "1px solid #FDE68A" }}>
                                                    ⚠️ {tmpl.notSuitableFor}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <NavButtons
                            step={step} totalSteps={5}
                            canNext={canProceed(2)}
                            onPrev={() => setStep(1)}
                            onNext={() => setStep(3)}
                            nextHint={!canProceed(2) ? "주제를 입력하고 형식을 선택해주세요" : ""}
                        />
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    STEP 3 · 상세 구성 및 제작 가이드
                ══════════════════════════════════════════════════ */}
                {step === 3 && (
                    <div className="space-y-5">
                        <StepHeader
                            num={3}
                            title="상세 구성 및 제작 가이드"
                            desc="콘텐츠의 세부 요소를 결정합니다. 구체적으로 입력할수록 AI 결과물의 품질이 높아집니다."
                        />

                        {/* 콘텐츠 유형 (카드뉴스만) */}
                        {form.template === "cardnews" && (
                            <div className="edu-card p-5 space-y-3">
                                <FieldLabel icon={<LayoutGrid size={14} />} label="카드뉴스 유형" required />
                                <div className="grid grid-cols-2 gap-2">
                                    {CONTENT_TYPES.map(ct => (
                                        <button key={ct.value}
                                            onClick={() => setField("contentType", ct.value)}
                                            className="flex items-center gap-2 px-3 py-3 rounded-xl text-left transition-all"
                                            style={{
                                                background: form.contentType === ct.value ? "var(--primary-light)" : "white",
                                                border: `2px solid ${form.contentType === ct.value ? "var(--primary)" : "var(--border)"}`,
                                            }}>
                                            <span className="text-lg">{ct.emoji}</span>
                                            <span className="text-sm font-black"
                                                style={{ color: form.contentType === ct.value ? "var(--primary)" : "var(--foreground)" }}>
                                                {ct.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 핵심 정보 */}
                        <div className="edu-card p-5 space-y-5">
                            <FieldLabel icon={<Target size={14} />} label="핵심 정보" />

                            {form.contentType === "promotion" && (
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground-soft)" }}>
                                        브랜드/상호명 <span style={{ fontWeight: 400, color: "var(--foreground-muted)" }}>(선택)</span>
                                    </label>
                                    <input className="w-full px-4 py-3 rounded-xl text-base border outline-none transition-all"
                                        style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)" }}
                                        placeholder="예: 꽃다온 캔들 스튜디오"
                                        value={form.businessName}
                                        onChange={e => setField("businessName", e.target.value)}
                                        onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                        onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground-soft)" }}>
                                    {form.contentType === "promotion" ? "제품/서비스명" :
                                        form.contentType === "education" ? "수업/강의명" :
                                            form.contentType === "tutorial" ? "서비스/앱 이름" : "주제"}{" "}
                                    <span style={{ color: "var(--primary)" }}>*</span>
                                </label>
                                <input className="w-full px-4 py-3 rounded-xl text-base border outline-none transition-all"
                                    style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)" }}
                                    placeholder={
                                        form.contentType === "promotion" ? "예: 천연 재료 수제 소이 캔들" :
                                            form.contentType === "education" ? "예: AI 기초 수업 — ChatGPT 활용편" :
                                                form.contentType === "tutorial" ? "예: 클로드 AI" : "예: SNS 마케팅 꿀팁 5가지"
                                    }
                                    value={form.productName}
                                    onChange={e => setField("productName", e.target.value)}
                                    onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                    onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground-soft)" }}>
                                    핵심 특징 / 장점 <span style={{ color: "var(--primary)" }}>*</span>
                                </label>
                                <div className="px-4 py-3 rounded-xl mb-3 text-sm font-semibold"
                                    style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", color: "#065F46" }}>
                                    ✅ 예시: "100% 천연 소이 왁스, 무독성, 100시간 이상 연소, 직접 제작"
                                </div>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl text-base border outline-none transition-all resize-none"
                                    style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)", lineHeight: 1.7 }}
                                    placeholder={
                                        form.contentType === "promotion" ? "예: 100% 천연 소이 왁스 사용, 무독성 인증, 손으로 직접 제작" :
                                            form.contentType === "education" ? "예: 입문자 눈높이, 실습 위주, 즉시 활용 가능" :
                                                "주요 특징이나 장점을 쉼표로 구분해서 써주세요"
                                    }
                                    rows={2}
                                    value={form.features}
                                    onChange={e => setField("features", e.target.value)}
                                    onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                    onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                            </div>

                            {(form.contentType !== "promotion") && (
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground-soft)" }}>
                                        상세 내용 <span style={{ color: "var(--primary)" }}>*</span>
                                    </label>
                                    <HintBox>
                                        이 내용이 구체적일수록 각 슬라이드 본문이 풍부해져요. 단계, 항목, 수치 등을 포함해주세요.
                                    </HintBox>
                                    <textarea
                                        className="w-full mt-3 px-4 py-3 rounded-xl text-base border outline-none transition-all resize-none"
                                        style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)", lineHeight: 1.7 }}
                                        placeholder={
                                            form.contentType === "education"
                                                ? "예:\n1강. ChatGPT란 무엇인가 — 인공지능 기초 개념\n2강. 프롬프트 작성법 — 원하는 결과를 얻는 비법\n3강. 실습: 나만의 챗봇 만들기"
                                                : "내용을 단계별로 구체적으로 작성해주세요"
                                        }
                                        rows={5}
                                        value={form.coreContent}
                                        onChange={e => setField("coreContent", e.target.value)}
                                        onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                        onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                                </div>
                            )}
                        </div>

                        {/* 타겟 & 톤앤매너 */}
                        <div className="edu-card p-5 space-y-5">
                            <FieldLabel icon={<Users size={14} />} label="타겟 & 톤앤매너" />

                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground-soft)" }}>
                                    타겟 독자 <span className="font-normal" style={{ color: "var(--foreground-muted)" }}>(선택)</span>
                                </label>
                                <div className="px-4 py-3 rounded-xl mb-3 text-sm font-semibold"
                                    style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", color: "#065F46" }}>
                                    ✅ 예시: "선물 구매를 고민하는 30~40대 여성, 친환경 제품에 관심 있는 분들"
                                </div>
                                <input
                                    className="w-full px-4 py-3 rounded-xl text-base border outline-none transition-all"
                                    style={{ background: "white", border: "2px solid var(--border)", color: "var(--foreground)" }}
                                    placeholder="예: 창업 3년 이하 소상공인, SNS 홍보 초보"
                                    value={form.target}
                                    onChange={e => setField("target", e.target.value)}
                                    onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                    onBlur={e => (e.target.style.borderColor = "var(--border)")} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-3" style={{ color: "var(--foreground-soft)" }}>
                                    톤앤매너 <span style={{ color: "var(--primary)" }}>*</span>
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {TONES.map(t => (
                                        <button key={t.value}
                                            onClick={() => setField("tone", t.value)}
                                            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                                            style={{
                                                background: form.tone === t.value ? "var(--primary-light)" : "white",
                                                border: `2px solid ${form.tone === t.value ? "var(--primary)" : "var(--border)"}`,
                                            }}>
                                            <span className="text-2xl">{t.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-black" style={{ color: form.tone === t.value ? "var(--primary)" : "var(--foreground)" }}>
                                                    {t.value}
                                                </p>
                                                <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{t.keyword}</p>
                                            </div>
                                            {form.tone === t.value && <Check size={16} className="shrink-0" style={{ color: "var(--primary)" }} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 이미지 스타일 */}
                        <div className="edu-card p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: "var(--secondary-light)" }}>
                                    <Image size={14} style={{ color: "var(--secondary)" }} />
                                </div>
                                <div>
                                    <p className="text-base font-black" style={{ color: "var(--foreground)" }}>이미지 스타일</p>
                                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>
                                        선택한 스타일이 AI 이미지 프롬프트에 직접 반영됩니다
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {IMAGE_STYLES.map(s => {
                                    const isSelected = form.imageStyle === s.value;
                                    return (
                                        <button
                                            key={s.value}
                                            onClick={() => setField("imageStyle", s.value)}
                                            className="rounded-2xl p-4 text-left transition-all border-2"
                                            style={{
                                                borderColor: isSelected ? "var(--secondary)" : "var(--border)",
                                                background: isSelected ? "var(--secondary-light)" : "white",
                                            }}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-2xl">{s.emoji}</span>
                                                <span className="text-sm font-black"
                                                    style={{ color: isSelected ? "var(--secondary)" : "var(--foreground)" }}>
                                                    {s.label}
                                                </span>
                                            </div>
                                            <p className="text-sm leading-relaxed mb-2"
                                                style={{ color: "var(--foreground-soft)" }}>{s.desc}</p>
                                            <p className="text-xs font-semibold px-2 py-1 rounded-lg inline-block"
                                                style={{
                                                    background: isSelected ? "var(--secondary)" + "20" : "var(--surface-2)",
                                                    color: isSelected ? "var(--secondary)" : "var(--foreground-soft)",
                                                }}>
                                                {s.fit}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 선택된 스타일 프롬프트 힌트 */}
                            {form.imageStyle && (
                                <div className="px-4 py-3 rounded-xl"
                                    style={{ background: "var(--secondary-light)", border: "1px solid " + "var(--secondary)" + "40" }}>
                                    <span className="text-sm font-bold" style={{ color: "var(--secondary)" }}>프롬프트 키워드: </span>
                                    <span className="text-sm" style={{ color: "var(--secondary)" }}>
                                        {IMAGE_STYLES.find(s => s.value === form.imageStyle)?.promptHint}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 슬라이드 수 (카드뉴스만) */}
                        {form.template === "cardnews" && (
                            <div className="edu-card p-5 space-y-3">
                                <FieldLabel icon={<Layers size={14} />} label="슬라이드 수" />
                                <div className="flex gap-2">
                                    {["4", "6", "8", "10"].map(n => (
                                        <button key={n}
                                            onClick={() => setField("slideCount", n)}
                                            className="flex-1 py-3.5 rounded-xl text-base font-bold transition-all"
                                            style={{
                                                background: form.slideCount === n ? "var(--primary)" : "white",
                                                color: form.slideCount === n ? "white" : "var(--foreground-soft)",
                                                border: `2px solid ${form.slideCount === n ? "var(--primary)" : "var(--border)"}`,
                                            }}>
                                            {n}컷
                                        </button>
                                    ))}
                                </div>
                                <div className="px-4 py-3 rounded-xl text-sm font-semibold"
                                    style={{ background: "#FFF8E7", border: "1px solid #FDE68A", color: "#92400E" }}>
                                    💡 4컷: 핵심만 빠르게 · 6컷: 표준 (추천) · 8~10컷: 풍부한 정보 전달
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                                style={{ background: "#FEE2E2", border: "1px solid #FECACA" }}>
                                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                                <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>{error}</p>
                            </div>
                        )}

                        <div className="space-y-3">
                            {canSkipGenerate ? (
                                /* 이미 생성된 결과 있고 폼 변경 없음 → 다음 단계 바로 이동 */
                                <>
                                    <button
                                        onClick={() => setStep(4)}
                                        className="w-full py-4 rounded-2xl font-black text-base transition-all"
                                        style={{
                                            background: "linear-gradient(135deg, var(--secondary), #6B8FFF)",
                                            color: "white",
                                            boxShadow: "0 4px 20px rgba(67,97,238,0.35)",
                                        }}>
                                        <span className="flex items-center justify-center gap-2">
                                            <ChevronRight size={18} />
                                            다음 단계로 이동 → (생성된 스토리보드 보기)
                                        </span>
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading || !usage.canGenerate}
                                        className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:cursor-not-allowed"
                                        style={{
                                            background: "var(--surface-2)",
                                            color: loading ? "var(--foreground-muted)" : "var(--foreground-soft)",
                                            opacity: loading ? 0.7 : 1,
                                        }}>
                                        <span className="flex items-center justify-center gap-2">
                                            <RotateCcw size={14} />
                                            {loading ? "AI가 스토리보드를 기획하고 있어요..." : "↺ 처음부터 다시 생성하기"}
                                        </span>
                                    </button>
                                </>
                            ) : (
                                /* 결과 없거나 폼 변경됨 → 생성 버튼 */
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !canProceed(3) || !usage.canGenerate}
                                    className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:cursor-not-allowed"
                                    style={{
                                        background: !usage.canGenerate ? "var(--surface-2)" :
                                            "linear-gradient(135deg, var(--primary), #FF9A72)",
                                        color: !usage.canGenerate ? "var(--foreground-muted)" : "white",
                                        opacity: loading ? 0.8 : 1,
                                        boxShadow: (!loading && canProceed(3) && usage.canGenerate)
                                            ? "0 4px 20px rgba(255,107,53,0.35)" : "none",
                                    }}>
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles size={18} className="animate-spin" />
                                            AI가 스토리보드를 기획하고 있어요... (15~25초)
                                        </span>
                                    ) : !usage.canGenerate ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <ZapOff size={18} />오늘 생성 횟수 소진 — 내일 초기화
                                        </span>
                                    ) : isFormDirty ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles size={18} />
                                            수정된 내용으로 다시 생성하기 →
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles size={18} />
                                            스토리보드 생성하기 →
                                        </span>
                                    )}
                                </button>
                            )}
                            <button onClick={() => setStep(2)}
                                className="w-full py-3 rounded-2xl font-bold text-sm transition-all"
                                style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                ← 이전 단계로
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    STEP 4 · 스토리보드 미리보기
                ══════════════════════════════════════════════════ */}
                {step === 4 && result && (
                    <div className="space-y-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-2"
                                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                                    <Check size={13} />
                                    스토리보드 완성
                                </div>
                                <h2 className="text-xl font-black" style={{ color: "var(--foreground)" }}>{result.title}</h2>
                                {result.styleGuide && (
                                    <p className="text-sm mt-1" style={{ color: "var(--foreground-soft)" }}>🎨 {result.styleGuide}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {autoSaving && (
                                    <span className="text-xs px-2.5 py-1 rounded-full font-bold animate-pulse"
                                        style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                                        저장 중...
                                    </span>
                                )}
                                {!autoSaving && savedId && (
                                    <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                                        style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}>
                                        ✓ 자동 저장
                                    </span>
                                )}
                                <button onClick={() => setStep(3)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all"
                                    style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                    <RotateCcw size={13} />
                                    재생성
                                </button>
                            </div>
                        </div>

                        {/* 이미지 모델 선택 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: "var(--foreground-soft)" }}>이미지 모델:</span>
                            {(["gpt", "gemini"] as ImageModel[]).map(m => (
                                <button key={m}
                                    onClick={() => setSelectedModel(m)}
                                    className="px-3 py-2 rounded-full text-sm font-bold transition-all"
                                    style={{
                                        background: selectedModel === m ? (m === "gpt" ? "#10A37F" : "#4F46E5") : "var(--surface-2)",
                                        color: selectedModel === m ? "white" : "var(--foreground-soft)",
                                    }}>
                                    {m === "gpt" ? "GPT Image 2.0" : "Nanobanana Pro"}
                                </button>
                            ))}
                        </div>

                        {/* 쇼츠: 디자인 시트 패널 */}
                        {(result.template ?? form.template) === "shorts" && result.subjectDesignSheet && (
                            <div className="edu-card overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b"
                                    style={{ borderColor: "var(--border)", background: "#F5F3FF" }}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">🎨</span>
                                        <p className="text-sm font-black" style={{ color: "#7C3AED" }}>주인공/제품 디자인 시트 프롬프트</p>
                                    </div>
                                    <button
                                        onClick={() => copyText(result.subjectDesignSheet!, "designSheet")}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                        style={{
                                            background: copiedKey === "designSheet" ? "#7C3AED" : "white",
                                            color: copiedKey === "designSheet" ? "white" : "#7C3AED",
                                            border: "1px solid #7C3AED40",
                                        }}>
                                        {copiedKey === "designSheet" ? <Check size={11} /> : <Copy size={11} />}
                                        복사
                                    </button>
                                </div>
                                <div className="p-4">
                                    <p className="text-xs mb-2" style={{ color: "var(--foreground-soft)" }}>
                                        💡 이 프롬프트로 GPT Image 2.0에서 레퍼런스 이미지를 먼저 생성하세요. 생성된 이미지를 각 장면 프롬프트 사용 시 업로드하면 일관성이 유지됩니다.
                                    </p>
                                    <p className="text-xs leading-relaxed px-3 py-2.5 rounded-xl"
                                        style={{ background: "#F5F3FF", color: "var(--foreground-soft)", border: "1px solid #DDD6FE" }}>
                                        {result.subjectDesignSheet.length > 200
                                            ? result.subjectDesignSheet.slice(0, 200) + "..."
                                            : result.subjectDesignSheet}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 스토리보드 그리드 */}
                        <div className="grid grid-cols-2 gap-3">
                            {result.slides.map((slide, idx) => {
                                const color = SLIDE_TYPE_COLOR[slide.type] || "var(--primary)";
                                const isSelected = selectedSlide === idx;
                                const isShorts = slide.type.startsWith("scene_");
                                return (
                                    <button
                                        key={slide.slideNum}
                                        onClick={() => setSelectedSlide(idx)}
                                        className="text-left rounded-2xl overflow-hidden border-2 transition-all"
                                        style={{
                                            borderColor: isSelected ? color : "var(--border)",
                                            background: isSelected ? color + "08" : "white",
                                        }}>
                                        {/* 헤더 */}
                                        <div className="flex items-center justify-between px-3 py-2.5"
                                            style={{ background: color + "15" }}>
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white"
                                                    style={{ background: color }}>
                                                    {slide.slideNum}
                                                </span>
                                                <span className="text-xs font-black" style={{ color }}>
                                                    {SLIDE_TYPE_LABEL[slide.type] ?? slide.type}
                                                </span>
                                            </div>
                                            {isShorts && slide.duration && (
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                    style={{ background: color + "25", color }}>
                                                    {slide.duration}
                                                </span>
                                            )}
                                        </div>

                                        {/* 내용 */}
                                        <div className="px-3 py-3 space-y-2">
                                            <p className="text-sm font-black leading-snug" style={{ color: "var(--foreground)" }}>
                                                {slide.headline}
                                            </p>
                                            {!isShorts && slide.subtext && (
                                                <p className="text-xs font-semibold" style={{ color }}>{slide.subtext}</p>
                                            )}
                                            <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-soft)" }}>
                                                {slide.body.length > 60 ? slide.body.slice(0, 60) + "..." : slide.body}
                                            </p>
                                            {isShorts && slide.camera && (
                                                <p className="text-xs font-semibold" style={{ color: "var(--foreground-muted)" }}>
                                                    📷 {slide.camera}
                                                </p>
                                            )}
                                        </div>

                                        {/* 이미지 설명 */}
                                        {slide.imageDesc && (
                                            <div className="px-3 pb-3">
                                                <div className="px-2.5 py-2 rounded-lg text-xs leading-relaxed"
                                                    style={{ background: "var(--secondary-light)", color: "var(--secondary)" }}>
                                                    🖼️ {slide.imageDesc.length > 50 ? slide.imageDesc.slice(0, 50) + "..." : slide.imageDesc}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* 선택된 슬라이드 상세 */}
                        {result.slides[selectedSlide] && (
                            <SlideDetail
                                key={selectedSlide}
                                slide={result.slides[selectedSlide]}
                                selectedModel={selectedModel}
                                template={result.template ?? form.template}
                                editContext={{
                                    productName: form.productName,
                                    tone: form.tone,
                                    imageStyle: form.imageStyle,
                                }}
                                onUpdate={(updates) => updateSlide(selectedSlide, updates)}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setStep(3)}
                                className="py-4 rounded-2xl font-bold text-sm transition-all"
                                style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                ← 구성 수정하기
                            </button>
                            <button
                                onClick={() => setStep(5)}
                                className="py-4 rounded-2xl font-black text-base transition-all"
                                style={{
                                    background: "linear-gradient(135deg, var(--secondary), #6B8FFF)",
                                    color: "white",
                                    boxShadow: "0 4px 20px rgba(67,97,238,0.35)",
                                }}>
                                <span className="flex items-center justify-center gap-2">
                                    <FileText size={16} />
                                    PRD 완성하기 →
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    STEP 5 · PRD 기획서 + 프롬프트 패키지
                ══════════════════════════════════════════════════ */}
                {step === 5 && result && (
                    <div className="space-y-5">
                        <StepHeader
                            num={5}
                            title="PRD 기획서 완성"
                            desc="전체 기획 내용과 AI 이미지 프롬프트, 카피라이팅 프롬프트가 모두 준비됐습니다."
                        />

                        {/* 탭 */}
                        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: "var(--surface-2)" }}>
                            {[
                                { id: "storyboard" as const, label: "📋 스토리보드", icon: Image },
                                { id: "prd" as const, label: "📄 PRD 기획서", icon: FileText },
                                { id: "prompts" as const, label: "✨ 프롬프트", icon: Sparkles },
                            ].map(tab => (
                                <button key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                                    style={{
                                        background: activeTab === tab.id ? "var(--surface)" : "transparent",
                                        color: activeTab === tab.id ? "var(--foreground)" : "var(--foreground-soft)",
                                        boxShadow: activeTab === tab.id ? "var(--shadow-sm)" : "none",
                                    }}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* 스토리보드 탭 */}
                        {activeTab === "storyboard" && (
                            <div className="space-y-3">
                                {result.slides.map(slide => {
                                    const color = SLIDE_TYPE_COLOR[slide.type] || "var(--primary)";
                                    return (
                                        <div key={slide.slideNum} className="edu-card overflow-hidden">
                                            <div className="flex items-center gap-2 px-4 py-2.5"
                                                style={{ background: color + "12", borderBottom: `1px solid ${color}20` }}>
                                                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                                                    style={{ background: color }}>
                                                    {slide.slideNum}
                                                </span>
                                                <span className="text-sm font-black" style={{ color }}>
                                                    {SLIDE_TYPE_LABEL[slide.type] ?? slide.type}
                                                </span>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide mb-1"
                                                        style={{ color: "var(--foreground-soft)" }}>헤드라인</p>
                                                    <p className="text-base font-black" style={{ color: "var(--foreground)" }}>{slide.headline}</p>
                                                    {slide.subtext && <p className="text-sm mt-0.5" style={{ color }}>{slide.subtext}</p>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide mb-1"
                                                        style={{ color: "var(--foreground-soft)" }}>본문</p>
                                                    <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{slide.body}</p>
                                                </div>
                                                {slide.imageDesc && (
                                                    <div className="px-3 py-2.5 rounded-xl"
                                                        style={{ background: "var(--secondary-light)", border: "1px solid " + "var(--secondary)" + "30" }}>
                                                        <p className="text-xs font-bold mb-1" style={{ color: "var(--secondary)" }}>
                                                            🖼️ 이미지 설명 (스토리보드)
                                                        </p>
                                                        <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-soft)" }}>
                                                            {slide.imageDesc}
                                                        </p>
                                                    </div>
                                                )}
                                                {slide.hashtags && slide.hashtags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {slide.hashtags.map(tag => (
                                                            <span key={tag} className="text-sm font-semibold"
                                                                style={{ color: "var(--secondary)" }}>#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* PRD 기획서 탭 */}
                        {activeTab === "prd" && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>
                                        마케팅 PRD 기획서
                                    </p>
                                    <button
                                        onClick={() => copyText(result.prdDocument, "prd")}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            background: copiedKey === "prd" ? "var(--accent)" : "var(--surface-2)",
                                            color: copiedKey === "prd" ? "white" : "var(--foreground-soft)",
                                        }}>
                                        {copiedKey === "prd" ? <Check size={11} /> : <Copy size={11} />}
                                        {copiedKey === "prd" ? "복사됨!" : "전체 복사"}
                                    </button>
                                </div>
                                <div className="edu-card p-5">
                                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto"
                                        style={{ color: "var(--foreground-soft)" }}>
                                        {result.prdDocument}
                                    </pre>
                                </div>
                                <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                                    style={{ background: "#FFF8E7", border: "1px solid #FFC23340" }}>
                                    <Download size={15} className="shrink-0 mt-0.5" style={{ color: "#B45309" }} />
                                    <p className="text-sm" style={{ color: "#92400E" }}>
                                        <strong>PDF 저장:</strong> 복사 후 Google Docs에 붙여넣기 → 파일 → PDF 내보내기
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 프롬프트 탭 */}
                        {activeTab === "prompts" && (
                            <div className="space-y-4">
                                {/* 쇼츠: 디자인 시트 + 전체 영상 프롬프트 */}
                                {(result.template ?? form.template) === "shorts" && (
                                    <>
                                        {result.subjectDesignSheet && (
                                            <div className="edu-card overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 border-b"
                                                    style={{ borderColor: "var(--border)", background: "#F5F3FF" }}>
                                                    <div>
                                                        <p className="text-sm font-black" style={{ color: "#7C3AED" }}>
                                                            🎨 디자인 시트 프롬프트 (Step 1 — 먼저 생성)
                                                        </p>
                                                        <p className="text-xs mt-0.5" style={{ color: "#7C3AED99" }}>
                                                            GPT Image 2.0 → 생성 이미지를 아래 장면 프롬프트 사용 시 업로드
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyText(result.subjectDesignSheet!, "step1Sheet")}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
                                                        style={{
                                                            background: copiedKey === "step1Sheet" ? "#7C3AED" : "white",
                                                            color: copiedKey === "step1Sheet" ? "white" : "#7C3AED",
                                                            border: "1px solid #7C3AED40",
                                                        }}>
                                                        {copiedKey === "step1Sheet" ? <Check size={11} /> : <Copy size={11} />}
                                                        복사
                                                    </button>
                                                </div>
                                                <div className="p-4">
                                                    <pre className="text-xs leading-relaxed whitespace-pre-wrap"
                                                        style={{ color: "var(--foreground-soft)" }}>
                                                        {result.subjectDesignSheet}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                        {result.fullVideoPrompt && (
                                            <div className="edu-card overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 border-b"
                                                    style={{ borderColor: "var(--border)", background: "#ECFDF5" }}>
                                                    <div>
                                                        <p className="text-sm font-black" style={{ color: "#065F46" }}>
                                                            🎬 전체 영상 프롬프트 (Sora / Kling / Runway)
                                                        </p>
                                                        <p className="text-xs mt-0.5" style={{ color: "#065F4699" }}>
                                                            디자인 시트 이미지와 함께 영상 생성 AI에 사용
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyText(result.fullVideoPrompt!, "fullVideo")}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
                                                        style={{
                                                            background: copiedKey === "fullVideo" ? "#065F46" : "white",
                                                            color: copiedKey === "fullVideo" ? "white" : "#065F46",
                                                            border: "1px solid #6EE7B7",
                                                        }}>
                                                        {copiedKey === "fullVideo" ? <Check size={11} /> : <Copy size={11} />}
                                                        복사
                                                    </button>
                                                </div>
                                                <div className="p-4">
                                                    <pre className="text-xs leading-relaxed whitespace-pre-wrap"
                                                        style={{ color: "var(--foreground-soft)" }}>
                                                        {result.fullVideoPrompt}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* AI 이미지 프롬프트 */}
                                <div className="edu-card overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b"
                                        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>
                                            🖼️ AI 이미지 프롬프트 ({(result.template ?? form.template) === "shorts" ? "장면별" : "컷별"})
                                        </p>
                                        <div className="flex items-center gap-2">
                                            {(["gpt", "gemini"] as ImageModel[]).map(m => (
                                                <button key={m}
                                                    onClick={() => setSelectedModel(m)}
                                                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                                    style={{
                                                        background: selectedModel === m ? (m === "gpt" ? "#10A37F" : "#4F46E5") : "var(--surface)",
                                                        color: selectedModel === m ? "white" : "var(--foreground-soft)",
                                                    }}>
                                                    {m === "gpt" ? "GPT" : "Gemini"}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const all = result.slides.map(s => {
                                                        const p = selectedModel === "gpt" ? s.gptPrompt : s.geminiPrompt;
                                                        return `[${s.slideNum}컷 · ${SLIDE_TYPE_LABEL[s.type] ?? s.type}]\n${p || ""}`;
                                                    }).join("\n\n");
                                                    copyText(all, "allPrompts");
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                                style={{
                                                    background: copiedKey === "allPrompts" ? "var(--accent)" : "var(--surface)",
                                                    color: copiedKey === "allPrompts" ? "white" : "var(--foreground-soft)",
                                                }}>
                                                {copiedKey === "allPrompts" ? <Check size={11} /> : <Copy size={11} />}
                                                전체 복사
                                            </button>
                                        </div>
                                    </div>
                                    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                                        {result.slides.map(slide => {
                                            const prompt = selectedModel === "gpt" ? slide.gptPrompt : slide.geminiPrompt;
                                            const color = SLIDE_TYPE_COLOR[slide.type] || "var(--primary)";
                                            const key = `prompt-${slide.slideNum}`;
                                            return (
                                                <div key={slide.slideNum} className="p-4 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white"
                                                                style={{ background: color }}>
                                                                {slide.slideNum}
                                                            </span>
                                                            <span className="text-sm font-black" style={{ color }}>
                                                                {SLIDE_TYPE_LABEL[slide.type]} — {slide.headline}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => copyText(prompt || "", key)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                            style={{
                                                                background: copiedKey === key ? "var(--accent)" : "var(--surface-2)",
                                                                color: copiedKey === key ? "white" : "var(--foreground-soft)",
                                                            }}>
                                                            {copiedKey === key ? <Check size={10} /> : <Copy size={10} />}
                                                            복사
                                                        </button>
                                                    </div>
                                                    {prompt && (
                                                        <p className="text-sm leading-relaxed px-4 py-3 rounded-xl"
                                                            style={{ background: "var(--secondary-light)", color: "var(--foreground-soft)", border: "1px solid " + "var(--secondary)" + "25" }}>
                                                            {prompt}
                                                        </p>
                                                    )}
                                                    <a href={selectedModel === "gpt" ? "https://chat.openai.com" : "https://gemini.google.com"}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-sm font-bold"
                                                        style={{ color: selectedModel === "gpt" ? "#10A37F" : "#4F46E5" }}>
                                                        <ExternalLink size={10} />
                                                        {selectedModel === "gpt" ? "ChatGPT에서 생성" : "Gemini에서 생성"}
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 카피라이팅 프롬프트 */}
                                <div className="edu-card overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b"
                                        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>
                                            ✏️ 카피라이팅 수정 프롬프트
                                        </p>
                                        <button
                                            onClick={() => copyText(result.copywritingPrompt, "copyPrompt")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                                            style={{
                                                background: copiedKey === "copyPrompt" ? "var(--accent)" : "var(--surface)",
                                                color: copiedKey === "copyPrompt" ? "white" : "var(--foreground-soft)",
                                            }}>
                                            {copiedKey === "copyPrompt" ? <Check size={11} /> : <Copy size={11} />}
                                            복사
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm mb-3" style={{ color: "var(--foreground-soft)" }}>
                                            복사 후 Claude 또는 ChatGPT에 붙여넣고, 원하는 수정 내용을 입력하세요.
                                        </p>
                                        <pre className="text-sm leading-relaxed whitespace-pre-wrap"
                                            style={{ color: "var(--foreground-soft)" }}>
                                            {result.copywritingPrompt}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 하단 액션 */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { setStep(4); setActiveTab("storyboard"); }}
                                className="py-3 rounded-2xl font-bold text-sm transition-all"
                                style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                ← 스토리보드로
                            </button>
                            <button
                                onClick={() => {
                                    setResult(null);
                                    setFormSnapshot(null);
                                    sessionStorage.removeItem("planner_form_draft");
                                    setStep(1);
                                    setForm(DEFAULT_FORM);
                                }}
                                className="py-3 rounded-2xl font-bold text-sm transition-all"
                                style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                                + 새 기획 시작
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </AuthGate>
    );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────

function StepHeader({ num, title, desc }: { num: number; title: string; desc: string }) {
    return (
        <div className="edu-card p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl text-white"
                style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}>
                {num}
            </div>
            <div>
                <h2 className="text-lg font-black" style={{ color: "var(--foreground)" }}>
                    Step {num} · {title}
                </h2>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{desc}</p>
            </div>
        </div>
    );
}

function HintBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "#FFF8E7", border: "1px solid #FFC23340" }}>
            <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: "#B45309" }} />
            <p style={{ color: "#92400E" }}>{children}</p>
        </div>
    );
}

function FieldLabel({ icon, label, required }: { icon: React.ReactNode; label: string; required?: boolean }) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                {icon}
            </div>
            <span className="text-base font-black" style={{ color: "var(--foreground)" }}>
                {label} {required && <span style={{ color: "var(--primary)" }}>*</span>}
            </span>
        </div>
    );
}

function NavButtons({
    step, totalSteps, canNext, onPrev, onNext, nextHint,
}: {
    step: number; totalSteps: number; canNext: boolean;
    onPrev?: () => void; onNext?: () => void; nextHint?: string;
}) {
    return (
        <div className="space-y-2">
            {nextHint && !canNext && (
                <p className="text-sm text-center font-semibold" style={{ color: "var(--foreground-soft)" }}>
                    ⚠️ {nextHint}
                </p>
            )}
            <div className="flex gap-3">
                {onPrev && (
                    <button onClick={onPrev}
                        className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                        ← 이전
                    </button>
                )}
                {onNext && (
                    <button onClick={onNext} disabled={!canNext}
                        className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all disabled:cursor-not-allowed"
                        style={{
                            background: canNext ? "var(--primary)" : "var(--surface-2)",
                            color: canNext ? "white" : "var(--foreground-muted)",
                        }}>
                        다음 단계 →
                    </button>
                )}
            </div>
        </div>
    );
}

function SlideDetail({
    slide,
    selectedModel,
    editContext,
    onUpdate,
    template = "",
}: {
    slide: Slide;
    selectedModel: ImageModel;
    editContext: { productName: string; tone: string; imageStyle: string };
    onUpdate: (updates: Partial<Slide>) => void;
    template?: string;
}) {
    const [copied, setCopied] = useState(false);
    const [editMode, setEditMode] = useState<"none" | "direct" | "ai">("none");
    const [draft, setDraft] = useState<Partial<Slide>>({});
    const [aiRequest, setAiRequest] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");

    const isShorts = template === "shorts";
    const prompt = selectedModel === "gpt" ? slide.gptPrompt : slide.geminiPrompt;
    const color = SLIDE_TYPE_COLOR[slide.type] || "var(--primary)";
    const linkUrl = selectedModel === "gpt" ? "https://chat.openai.com" : "https://gemini.google.com";

    const enterDirectEdit = () => {
        setDraft({
            headline: slide.headline,
            subtext: slide.subtext || "",
            body: slide.body,
            imageDesc: slide.imageDesc || "",
        });
        setEditMode("direct");
    };

    const saveDirectEdit = () => {
        onUpdate(draft);
        setEditMode("none");
    };

    const handleAIEdit = async () => {
        if (!aiRequest.trim()) return;
        setAiLoading(true);
        setAiError("");
        try {
            const res = await fetch("/api/ai/planner/edit-slide", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slide,
                    editRequest: aiRequest,
                    context: editContext,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "오류 발생");
            onUpdate(data.slide);
            setAiRequest("");
            setEditMode("none");
        } catch (e) {
            setAiError(e instanceof Error ? e.message : "오류가 발생했어요.");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="edu-card overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ background: color + "10", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                        style={{ background: color }}>{slide.slideNum}</span>
                    <span className="text-sm font-black" style={{ color }}>
                        {SLIDE_TYPE_LABEL[slide.type] ?? slide.type} 상세
                    </span>
                </div>
                <div className="flex gap-2">
                    {editMode === "none" ? (
                        <>
                            <button
                                onClick={enterDirectEdit}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                <Pencil size={11} />직접 수정
                            </button>
                            <button
                                onClick={() => setEditMode("ai")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                                <Sparkles size={11} />AI 수정 요청
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => { setEditMode("none"); setAiError(""); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                            <X size={11} />닫기
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* ── 보기 모드 ── */}
                {editMode === "none" && (
                    <>
                        {/* 쇼츠 전용: 타임코드 + 카메라 배지 */}
                        {isShorts && (slide.duration || slide.camera) && (
                            <div className="flex flex-wrap gap-2">
                                {slide.duration && (
                                    <span className="text-xs font-black px-3 py-1.5 rounded-full"
                                        style={{ background: color + "20", color }}>
                                        ⏱ {slide.duration}
                                    </span>
                                )}
                                {slide.camera && (
                                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                                        style={{ background: "var(--secondary-light)", color: "var(--secondary)" }}>
                                        📷 {slide.camera}
                                    </span>
                                )}
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase mb-1" style={{ color: "var(--foreground-soft)" }}>
                                {isShorts ? "장면 제목" : "헤드라인"}
                            </p>
                            <p className="text-lg font-black" style={{ color: "var(--foreground)" }}>{slide.headline}</p>
                            {!isShorts && slide.subtext && <p className="text-base mt-1" style={{ color }}>{slide.subtext}</p>}
                        </div>
                        {isShorts && slide.action && (
                            <div>
                                <p className="text-xs font-bold uppercase mb-1" style={{ color: "var(--foreground-soft)" }}>화면 동작</p>
                                <p className="text-sm leading-relaxed px-4 py-3 rounded-xl"
                                    style={{ background: color + "10", border: `1px solid ${color}30`, color: "var(--foreground-soft)" }}>
                                    {slide.action}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase mb-1" style={{ color: "var(--foreground-soft)" }}>
                                {isShorts ? "대사 / 나레이션 자막" : "본문"}
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{slide.body}</p>
                        </div>
                        {slide.imageDesc && (
                            <div>
                                <p className="text-xs font-bold uppercase mb-1" style={{ color: "var(--secondary)" }}>이미지 설명</p>
                                <p className="text-sm leading-relaxed px-4 py-3 rounded-xl"
                                    style={{ background: "var(--secondary-light)", border: "1px solid " + "var(--secondary)" + "30", color: "var(--foreground-soft)" }}>
                                    {slide.imageDesc}
                                </p>
                            </div>
                        )}
                        {prompt && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold uppercase" style={{ color: "var(--foreground-soft)" }}>
                                        이미지 프롬프트 ({selectedModel === "gpt" ? "GPT" : "Gemini"})
                                    </p>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(prompt);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            style={{
                                                background: copied ? "var(--accent)" : "var(--surface-2)",
                                                color: copied ? "white" : "var(--foreground-soft)",
                                            }}>
                                            {copied ? <Check size={11} /> : <Copy size={11} />}
                                            {copied ? "복사됨" : "복사"}
                                        </button>
                                        <a href={linkUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                            style={{ background: selectedModel === "gpt" ? "#10A37F" : "#4F46E5", color: "white" }}>
                                            <ExternalLink size={11} />열기
                                        </a>
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed px-4 py-3 rounded-xl"
                                    style={{ background: "var(--secondary-light)", border: "1px solid " + "var(--secondary)" + "25", color: "var(--foreground-soft)" }}>
                                    {prompt}
                                </p>
                            </div>
                        )}
                        {slide.hashtags && slide.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {slide.hashtags.map(tag => (
                                    <span key={tag} className="text-sm font-semibold" style={{ color: "var(--secondary)" }}>#{tag}</span>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── 직접 수정 모드 ── */}
                {editMode === "direct" && (
                    <div className="space-y-3">
                        <div className="px-3 py-2 rounded-xl text-xs font-semibold"
                            style={{ background: "#FFF8E7", border: "1px solid #FDE68A", color: "#92400E" }}>
                            💡 수정 후 저장하면 스토리보드 그리드에 바로 반영됩니다
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-soft)" }}>
                                헤드라인 <span style={{ color: "var(--foreground-muted)", fontWeight: 400 }}>(15자 이내)</span>
                            </label>
                            <input
                                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                                style={{ border: "2px solid var(--primary)", background: "white", color: "var(--foreground)" }}
                                value={draft.headline || ""}
                                onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-soft)" }}>
                                부제목 <span style={{ color: "var(--foreground-muted)", fontWeight: 400 }}>(선택, 20자 이내)</span>
                            </label>
                            <input
                                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                                style={{ border: "2px solid var(--border)", background: "white", color: "var(--foreground)" }}
                                value={draft.subtext || ""}
                                onChange={e => setDraft(d => ({ ...d, subtext: e.target.value }))}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-soft)" }}>
                                본문
                            </label>
                            <textarea
                                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none transition-all"
                                style={{ border: "2px solid var(--border)", background: "white", color: "var(--foreground)", lineHeight: 1.7 }}
                                rows={4}
                                value={draft.body || ""}
                                onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-soft)" }}>
                                이미지 설명
                            </label>
                            <textarea
                                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none transition-all"
                                style={{ border: "2px solid var(--border)", background: "white", color: "var(--foreground)", lineHeight: 1.7 }}
                                rows={2}
                                value={draft.imageDesc || ""}
                                onChange={e => setDraft(d => ({ ...d, imageDesc: e.target.value }))}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setEditMode("none")}
                                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                                style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                취소
                            </button>
                            <button
                                onClick={saveDirectEdit}
                                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                                style={{ background: "var(--primary)", color: "white" }}>
                                ✅ 저장
                            </button>
                        </div>
                    </div>
                )}

                {/* ── AI 수정 요청 모드 ── */}
                {editMode === "ai" && (
                    <div className="space-y-3">
                        {/* 현재 내용 요약 */}
                        <div className="px-4 py-3 rounded-xl"
                            style={{ background: color + "10", border: "1px solid " + color + "30" }}>
                            <p className="text-xs font-bold mb-0.5" style={{ color }}>현재 내용</p>
                            <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>{slide.headline}</p>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--foreground-soft)" }}>
                                {slide.body.length > 80 ? slide.body.slice(0, 80) + "..." : slide.body}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground-soft)" }}>
                                어떻게 수정할까요?
                            </label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl text-base border outline-none resize-none transition-all"
                                style={{ border: "2px solid var(--border)", background: "white", color: "var(--foreground)", lineHeight: 1.7 }}
                                rows={3}
                                placeholder={"예시:\n• 헤드라인을 더 강렬하게 바꿔줘\n• 본문에 구체적인 수치나 사례를 추가해줘\n• 더 유머러스하고 가벼운 톤으로 수정해줘\n• 타겟을 20대 여성으로 맞춰 다시 써줘"}
                                value={aiRequest}
                                onChange={e => setAiRequest(e.target.value)}
                                onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                                onBlur={e => (e.target.style.borderColor = "var(--border)")}
                            />
                        </div>
                        {aiError && (
                            <p className="text-sm font-semibold text-center" style={{ color: "#DC2626" }}>⚠️ {aiError}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => { setEditMode("none"); setAiError(""); setAiRequest(""); }}
                                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
                                style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                취소
                            </button>
                            <button
                                onClick={handleAIEdit}
                                disabled={aiLoading || !aiRequest.trim()}
                                className="rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
                                style={{
                                    flex: 2,
                                    padding: "12px",
                                    background: aiLoading || !aiRequest.trim()
                                        ? "var(--surface-2)"
                                        : "linear-gradient(135deg, var(--primary), #FF9A72)",
                                    color: aiLoading || !aiRequest.trim() ? "var(--foreground-muted)" : "white",
                                }}>
                                {aiLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Sparkles size={14} className="animate-spin" />
                                        수정 중...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Sparkles size={14} />
                                        AI 수정하기
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
