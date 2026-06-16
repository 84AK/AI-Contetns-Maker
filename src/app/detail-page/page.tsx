"use client";

import { useState, useEffect } from "react";
import { FileText, Sparkles, Copy, Check, ExternalLink, Tag, Edit3, RotateCcw, BookmarkCheck, Bookmark, ZapOff, Link2 } from "lucide-react";
import RefinementPanel from "@/components/tools/RefinementPanel";
import { usePersistedForm } from "@/lib/hooks/usePersistedForm";
import AuthGate from "@/components/common/AuthGate";
import UsageBar from "@/components/common/UsageBar";
import { useUsage } from "@/lib/hooks/useUsage";
import { useLinkedContent } from "@/store/useLinkedContent";

interface FeatureItem { icon: string; title: string; desc: string; }
interface ReviewItem { rating: number; text: string; }
interface Section {
    type: string; title: string;
    content?: string; items?: FeatureItem[]; steps?: string[];
    reviews?: ReviewItem[]; urgency?: string; button?: string; note?: string;
    gptPrompt?: string;
}
interface DetailPageResult {
    hookHeadline: string; subHeadline: string;
    sections: Section[]; seoKeywords: string[];
}

type FormType = {
    contentType: string;
    productName: string;
    features: string;
    coreContent: string;
    target: string;
    price: string;
    urgency: string;
    socialProof: string;
    differentiator: string;
    ctaText: string;
};

const CONTENT_TYPES = [
    { value: "promotion", emoji: "🛍️", label: "상품/서비스 홍보", desc: "제품 판매·홍보용" },
    { value: "education", emoji: "📚", label: "수업/강의 소개", desc: "교육 콘텐츠 안내" },
    { value: "tutorial", emoji: "🔧", label: "사용법 튜토리얼", desc: "단계별 사용 안내" },
    { value: "info", emoji: "💡", label: "정보/지식 전달", desc: "유용한 정보 공유" },
];

const TYPE_CONFIG: Record<string, {
    subjectLabel: string; subjectPlaceholder: string;
    featuresLabel: string; featuresPlaceholder: string;
    coreContentLabel: string; coreContentPlaceholder: string;
    coreContentRequired: boolean;
    urgencyLabel: string; urgencyPlaceholder: string;
    socialProofLabel: string; socialProofPlaceholder: string;
    ctaLabel: string; ctaPlaceholder: string;
}> = {
    promotion: {
        subjectLabel: "제품/서비스명", subjectPlaceholder: "예: 유기농 마누카 꿀 500g",
        featuresLabel: "핵심 특징/기능", featuresPlaceholder: "예: 뉴질랜드 UMF10+ 등급, 항균 효과, 천연 원료",
        coreContentLabel: "홍보 포인트", coreContentPlaceholder: "예: 오픈 기념 20% 할인. 선착순 50명 무료 배송 쿠폰 제공.",
        coreContentRequired: false,
        urgencyLabel: "긴급성 문구", urgencyPlaceholder: "예: 선착순 50명 한정, D-3 마감",
        socialProofLabel: "소셜 증거", socialProofPlaceholder: "예: 누적 판매 2,000건, 별점 4.9 / 리뷰 320개",
        ctaLabel: "구매 버튼 문구", ctaPlaceholder: "예: 지금 바로 구매하기",
    },
    education: {
        subjectLabel: "수업/강의명", subjectPlaceholder: "예: AI 기초 수업, 포토샵 입문 강의",
        featuresLabel: "수업 특징", featuresPlaceholder: "예: 실습 위주, 입문자 친화적, 1:1 피드백",
        coreContentLabel: "커리큘럼/수업 내용", coreContentPlaceholder: "예:\n1강. AI란 무엇인가\n2강. ChatGPT 실전 사용법\n3강. 업무 자동화 실습",
        coreContentRequired: true,
        urgencyLabel: "수강 기간/일정", urgencyPlaceholder: "예: 4주 과정, 매주 화·목 오후 7시",
        socialProofLabel: "수강생 수/후기", socialProofPlaceholder: "예: 수강생 500명 돌파, 만족도 98%",
        ctaLabel: "수강 신청 버튼 문구", ctaPlaceholder: "예: 지금 수강 신청하기",
    },
    tutorial: {
        subjectLabel: "서비스/앱 이름", subjectPlaceholder: "예: 클로드 AI, 네이버 스마트스토어",
        featuresLabel: "주요 기능", featuresPlaceholder: "예: 문서 작성, 이미지 생성, 코드 작성",
        coreContentLabel: "단계별 사용 순서", coreContentPlaceholder: "예:\n1단계: 앱 설치 후 회원가입\n2단계: 메인 화면에서 '새 채팅' 클릭\n3단계: 질문 입력 후 전송",
        coreContentRequired: true,
        urgencyLabel: "지원 환경", urgencyPlaceholder: "예: iOS, Android, 웹 브라우저",
        socialProofLabel: "사용자 수/평점", socialProofPlaceholder: "예: 월 활성 사용자 100만명, 앱스토어 4.8점",
        ctaLabel: "시작 버튼 문구", ctaPlaceholder: "예: 무료로 시작하기",
    },
    info: {
        subjectLabel: "주제", subjectPlaceholder: "예: 건강한 아침 루틴 5가지",
        featuresLabel: "핵심 메시지", featuresPlaceholder: "예: 실용적이고 당장 실천 가능한 내용",
        coreContentLabel: "전달할 핵심 내용", coreContentPlaceholder: "예:\n1. 기상 후 물 한 잔 - 신진대사 활성화\n2. 5분 스트레칭 - 혈액순환 개선\n3. 단백질 아침 식사 - 집중력 유지",
        coreContentRequired: true,
        urgencyLabel: "출처/근거", urgencyPlaceholder: "예: 2024 보건복지부 발표, 하버드 의대 연구",
        socialProofLabel: "관련 통계/사실", socialProofPlaceholder: "예: 아침 루틴 실천자 생산성 23% 향상 (연구 결과)",
        ctaLabel: "실천 유도 문구", ctaPlaceholder: "예: 오늘부터 시작해보세요",
    },
};

const SECTION_META: Record<string, { label: string; color: string }> = {
    problem:    { label: "공감",     color: "var(--primary)" },
    solution:   { label: "해결책",   color: "var(--secondary)" },
    features:   { label: "특장점",   color: "var(--accent)" },
    curriculum: { label: "커리큘럼", color: "var(--secondary)" },
    howto:      { label: "사용법",   color: "#F59E0B" },
    review:     { label: "후기",     color: "#8B5CF6" },
    instructor: { label: "강사소개", color: "#EC4899" },
    benefit:    { label: "수강혜택", color: "var(--accent)" },
    points:     { label: "핵심내용", color: "var(--secondary)" },
    cta:        { label: "행동유도", color: "var(--primary)" },
};

const SEC = "var(--secondary)";
const SEC_LIGHT = "var(--secondary-light)";

export default function DetailPageBuilderPage() {
    const [form, setForm] = usePersistedForm("aicontents_detail_form_v2", {
        contentType: "promotion",
        productName: "", features: "", coreContent: "",
        target: "", price: "", urgency: "", socialProof: "",
        differentiator: "", ctaText: "",
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DetailPageResult | null>(null);
    const [error, setError] = useState("");
    const [selectedSection, setSelectedSection] = useState(0);
    const [showFormPanel, setShowFormPanel] = useState(false);
    const [copiedContent, setCopiedContent] = useState<string | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const [linkedBanner, setLinkedBanner] = useState(false);

    const usage = useUsage();
    const { linked, clearLinked } = useLinkedContent();

    // 갤러리에서 복원
    useEffect(() => {
        const saved = localStorage.getItem("ai_gallery_restore_detailpage");
        if (!saved) return;
        try {
            const content = JSON.parse(saved) as DetailPageResult;
            if (content.hookHeadline) setResult(content);
        } catch { /* 무시 */ }
        localStorage.removeItem("ai_gallery_restore_detailpage");
    }, []);

    useEffect(() => {
        if (!linked) return;
        setForm(f => ({
            ...f,
            contentType: linked.contentType,
            productName: linked.productName,
            features: linked.features,
            coreContent: linked.coreContent,
            target: linked.target,
        }));
        setLinkedBanner(true);
        clearLinked();
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async () => {
        const cfg = TYPE_CONFIG[form.contentType] ?? TYPE_CONFIG.promotion;
        if (!form.productName.trim()) {
            setError(`${cfg.subjectLabel}은(는) 필수입니다.`);
            return;
        }
        if (cfg.coreContentRequired && !form.coreContent.trim()) {
            setError(`${cfg.coreContentLabel}을(를) 입력해주세요.`);
            return;
        }
        if (form.contentType === "promotion" && !form.features.trim()) {
            setError("핵심 특징/기능은 필수입니다.");
            return;
        }
        setError("");
        setLoading(true);
        setResult(null);
        setSelectedSection(0);
        setShowFormPanel(false);

        try {
            const token = await usage.getToken();
            const res = await fetch("/api/ai/detail-page", {
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
            setResult(data);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000);
            usage.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "오류가 발생했어요.");
        } finally {
            setLoading(false);
        }
    };

    const copyText = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedContent(key);
        setTimeout(() => setCopiedContent(null), 2000);
    };
    const copyGptPrompt = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedPrompt(key);
        setTimeout(() => setCopiedPrompt(null), 2000);
    };

    const activeSection = result?.sections[selectedSection];
    const activeMeta = activeSection ? (SECTION_META[activeSection.type] ?? { label: activeSection.type, color: SEC }) : null;

    if (result) {
        return (
            <AuthGate toolName="상세페이지 빌더">
            <div className="space-y-0 max-w-3xl mx-auto">
                <div className="sticky top-0 z-10 flex items-center gap-2 px-1 py-3 flex-wrap"
                    style={{ background: "var(--background)" }}>
                    <button onClick={() => setShowFormPanel(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: showFormPanel ? SEC : "var(--surface-2)", color: showFormPanel ? "white" : "var(--foreground-soft)" }}>
                        <Edit3 size={12} />입력 수정{showFormPanel ? "▲" : "▼"}
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: "var(--foreground)" }}>{result.hookHeadline}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--foreground-muted)" }}>{form.productName} · {CONTENT_TYPES.find(t => t.value === form.contentType)?.label}</p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: justSaved ? "var(--accent)" : "var(--foreground-muted)" }}>
                        {justSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        {justSaved ? "갤러리에 저장됨" : "저장됨"}
                    </span>
                    <button onClick={() => { setResult(null); setShowFormPanel(false); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                        <RotateCcw size={12} />새로 만들기
                    </button>
                </div>

                {showFormPanel && (
                    <div className="edu-card p-5 mb-4 space-y-4">
                        <DetailFormFields form={form} setForm={setForm as React.Dispatch<React.SetStateAction<FormType>>} />
                        {error && <p className="text-xs px-3 py-2 rounded-lg font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>}
                        <GenerateButton onClick={handleSubmit} loading={loading} canGenerate={usage.canGenerate} label="다시 생성하기" accentColor={SEC} />
                    </div>
                )}

                <div className="rounded-2xl p-5 mb-4 border-2 space-y-2" style={{ background: SEC_LIGHT, borderColor: SEC }}>
                    <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: SEC }}>📣 상단 후킹 헤드라인</p>
                    <p className="text-xl font-black leading-snug" style={{ color: "var(--foreground)" }}>{result.hookHeadline}</p>
                    <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{result.subHeadline}</p>
                    <button onClick={() => copyText(`${result.hookHeadline}\n${result.subHeadline}`, "headline")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: copiedContent === "headline" ? "var(--accent)" : "white", color: copiedContent === "headline" ? "white" : SEC }}>
                        {copiedContent === "headline" ? <Check size={11} /> : <Copy size={11} />} 헤드라인 복사
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
                    {result.sections.map((section, idx) => {
                        const meta = SECTION_META[section.type] ?? { label: section.type, color: SEC };
                        const isActive = selectedSection === idx;
                        return (
                            <button key={idx} onClick={() => setSelectedSection(idx)}
                                className="flex flex-col items-center gap-0.5 shrink-0 px-4 py-2.5 rounded-2xl transition-all"
                                style={{ minWidth: 72, background: isActive ? meta.color : "var(--surface-2)" }}>
                                <span className="text-xs font-black" style={{ color: isActive ? "white" : "var(--foreground-soft)" }}>{meta.label}</span>
                                <span className="text-[9px] font-semibold" style={{ color: isActive ? "rgba(255,255,255,0.75)" : "var(--foreground-muted)" }}>{idx + 1}/{result.sections.length}</span>
                            </button>
                        );
                    })}
                </div>

                {activeSection && activeMeta && (
                    <div className="edu-card overflow-hidden mb-4">
                        <div className="px-5 py-4 border-b flex items-center justify-between"
                            style={{ background: activeMeta.color + "10", borderColor: "var(--border)" }}>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                                    style={{ background: activeMeta.color + "20", color: activeMeta.color }}>{activeMeta.label}</span>
                                <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{activeSection.title}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setSelectedSection(Math.max(0, selectedSection - 1))} disabled={selectedSection === 0}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30"
                                    style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>‹</button>
                                <button onClick={() => setSelectedSection(Math.min(result.sections.length - 1, selectedSection + 1))} disabled={selectedSection === result.sections.length - 1}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30"
                                    style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>›</button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {activeSection.content && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>본문 카피</p>
                                        <button onClick={() => copyText(activeSection.content!, `sec-${selectedSection}`)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold"
                                            style={{ background: copiedContent === `sec-${selectedSection}` ? "var(--accent)" : "var(--surface-2)", color: copiedContent === `sec-${selectedSection}` ? "white" : "var(--foreground-muted)" }}>
                                            {copiedContent === `sec-${selectedSection}` ? <Check size={10} /> : <Copy size={10} />} 복사
                                        </button>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--foreground-soft)" }}>{activeSection.content}</p>
                                </div>
                            )}
                            {activeSection.items && (
                                <div className="space-y-2">
                                    {activeSection.items.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                                            <span className="text-xl shrink-0">{item.icon}</span>
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{item.title}</p>
                                                <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeSection.steps && (
                                <div className="space-y-2">
                                    {activeSection.steps.map((step, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground-soft)" }}>
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                                                style={{ background: activeMeta.color }}>{i + 1}</span>
                                            {step}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeSection.reviews && (
                                <div className="space-y-2">
                                    {activeSection.reviews.map((r, i) => (
                                        <div key={i} className="p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                                            <div className="flex gap-0.5 mb-1">{Array.from({ length: r.rating }).map((_, j) => <span key={j} style={{ color: "var(--highlight)" }}>★</span>)}</div>
                                            <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{r.text}</p>
                                        </div>
                                    ))}
                                    <p className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>* AI 예시 후기입니다. 실제 후기로 교체하세요.</p>
                                </div>
                            )}
                            {activeSection.type === "cta" && (
                                <div className="p-4 rounded-xl space-y-2" style={{ background: activeMeta.color + "10", border: `1.5px solid ${activeMeta.color}40` }}>
                                    {activeSection.urgency && <p className="text-sm font-black" style={{ color: activeMeta.color }}>{activeSection.urgency}</p>}
                                    {activeSection.button && <div className="py-2 px-4 rounded-xl text-center font-black text-white text-sm inline-block" style={{ background: activeMeta.color }}>{activeSection.button}</div>}
                                    {activeSection.note && <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>{activeSection.note}</p>}
                                </div>
                            )}
                            {activeSection.gptPrompt && (
                                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#10A37F30" }}>
                                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#ECFDF5", borderBottom: "1px solid #10A37F20" }}>
                                        <span className="text-xs font-black" style={{ color: "#10A37F" }}>🖼️ GPT Image 이미지 프롬프트</span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => copyGptPrompt(activeSection.gptPrompt!, `p-${selectedSection}`)}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                                style={{ background: copiedPrompt === `p-${selectedSection}` ? "#10A37F" : "white", color: copiedPrompt === `p-${selectedSection}` ? "white" : "#10A37F" }}>
                                                {copiedPrompt === `p-${selectedSection}` ? <Check size={10} /> : <Copy size={10} />} 복사
                                            </button>
                                            <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                                style={{ background: "#10A37F", color: "white" }}>
                                                <ExternalLink size={10} />ChatGPT
                                            </a>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
                                        <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{activeSection.gptPrompt}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="edu-card p-4 mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <Tag size={13} style={{ color: SEC }} />
                        <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>SEO 추천 키워드</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {result.seoKeywords.map(kw => (
                            <span key={kw} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: SEC_LIGHT, color: SEC }}>{kw}</span>
                        ))}
                    </div>
                </div>

                <RefinementPanel contentType="detail-page" originalInput={form}
                    currentResult={result as unknown as Record<string, unknown>}
                    onUpdate={(r) => { setResult(r as unknown as DetailPageResult); setSelectedSection(0); }} />
            </div>
            </AuthGate>
        );
    }

    return (
        <AuthGate toolName="상세페이지 빌더">
        <div className="space-y-8">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                    style={{ background: SEC_LIGHT, color: SEC }}>
                    <FileText size={12} />상세페이지 빌더
                </div>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>상세페이지 빌더</h1>
                    <UsageBar usage={usage} />
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                    콘텐츠 유형을 선택하면 맞춤형 상세페이지 구성안을 만들어드려요.
                </p>
            </div>

            {linkedBanner && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                    style={{ background: "var(--primary-light)", borderColor: "var(--primary)" }}>
                    <Link2 size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <div className="flex-1">
                        <p className="text-xs font-black" style={{ color: "var(--primary)" }}>카드뉴스에서 연동됨</p>
                        <p className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>입력 내용이 자동으로 채워졌어요. 추가 정보만 입력 후 생성하세요.</p>
                    </div>
                    <button onClick={() => setLinkedBanner(false)} className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="edu-card p-6 space-y-5">
                    <DetailFormFields form={form} setForm={setForm as React.Dispatch<React.SetStateAction<FormType>>} />
                    {error && <p className="text-xs px-3 py-2 rounded-lg font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>}
                    <GenerateButton onClick={handleSubmit} loading={loading} canGenerate={usage.canGenerate}
                        label="상세페이지 생성하기" loadingLabel="AI가 상세페이지를 구성하고 있어요..."
                        accentColor={SEC} accentGradient={`linear-gradient(135deg, ${SEC}, #6B8EFF)`} />
                </div>
                <div className="edu-card p-8 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 300 }}>
                    {loading ? (
                        <>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: SEC_LIGHT }}>
                                <Sparkles size={22} className="animate-pulse" style={{ color: SEC }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>AI가 상세페이지를 구성하고 있어요</p>
                            <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>보통 15-20초 정도 걸려요</p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: SEC_LIGHT }}>
                                <FileText size={26} style={{ color: SEC }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>왼쪽에 정보를 입력하면<br />상세페이지 구성안이 여기 표시돼요</p>
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

function GenerateButton({ onClick, loading, canGenerate, label, loadingLabel, accentColor, accentGradient }: {
    onClick: () => void; loading: boolean; canGenerate: boolean;
    label: string; loadingLabel?: string; accentColor?: string; accentGradient?: string;
}) {
    const exceeded = !canGenerate && !loading;
    const gradient = accentGradient ?? "linear-gradient(135deg, var(--primary), #FF9A72)";
    return (
        <button onClick={onClick} disabled={loading || !canGenerate}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
            style={{ background: exceeded ? "var(--surface-2)" : gradient, color: exceeded ? "var(--foreground-muted)" : "white", opacity: loading ? 0.7 : 1 }}>
            {loading
                ? <span className="flex items-center justify-center gap-2"><Sparkles size={15} className="animate-spin" />{loadingLabel ?? "AI가 생성하고 있어요..."}</span>
                : exceeded
                    ? <span className="flex items-center justify-center gap-2"><ZapOff size={15} />오늘 생성 횟수 소진 — 내일 초기화</span>
                    : <span className="flex items-center justify-center gap-2">{accentColor ? <FileText size={15} /> : <Sparkles size={15} />}{label}</span>}
        </button>
    );
}

function DetailFormFields({ form, setForm }: { form: FormType; setForm: React.Dispatch<React.SetStateAction<FormType>> }) {
    const cfg = TYPE_CONFIG[form.contentType] ?? TYPE_CONFIG.promotion;
    const isPromotion = form.contentType === "promotion";
    const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = SEC);
    const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "var(--border)");

    return (
        <div className="space-y-4">
            {/* 콘텐츠 유형 */}
            <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>콘텐츠 유형 <span style={{ color: SEC }}>*</span></label>
                <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPES.map(ct => (
                        <button key={ct.value} onClick={() => setForm(f => ({ ...f, contentType: ct.value }))}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                            style={{ background: form.contentType === ct.value ? SEC_LIGHT : "var(--surface-2)", border: `1.5px solid ${form.contentType === ct.value ? SEC : "var(--border)"}` }}>
                            <span className="text-base leading-none">{ct.emoji}</span>
                            <div>
                                <p className="text-xs font-black leading-none mb-0.5" style={{ color: form.contentType === ct.value ? SEC : "var(--foreground)" }}>{ct.label}</p>
                                <p className="text-[10px]" style={{ color: "var(--foreground-muted)" }}>{ct.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 주제/제품명 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>{cfg.subjectLabel} <span style={{ color: SEC }}>*</span></label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={cfg.subjectPlaceholder}
                    value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 핵심 내용 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {cfg.coreContentLabel}
                    {cfg.coreContentRequired ? <span style={{ color: SEC }}> *</span> : <span style={{ fontWeight: 400 }}> (선택)</span>}
                </label>
                <textarea className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={cfg.coreContentPlaceholder} rows={isPromotion ? 2 : 4}
                    value={form.coreContent} onChange={e => setForm(f => ({ ...f, coreContent: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 특징/기능 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {cfg.featuresLabel}
                    {isPromotion ? <span style={{ color: SEC }}> *</span> : <span style={{ fontWeight: 400 }}> (선택)</span>}
                </label>
                <textarea className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={cfg.featuresPlaceholder} rows={2}
                    value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 대상 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {isPromotion ? "타겟 고객" : "대상 독자"} <span style={{ fontWeight: 400 }}>(선택)</span>
                </label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={isPromotion ? "예: 건강을 중시하는 30-40대 직장인" : "예: AI에 처음 입문하는 직장인"}
                    value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 가격 (홍보 유형만) */}
            {isPromotion && (
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>가격 (원) <span style={{ fontWeight: 400 }}>(선택)</span></label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder="35000" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        onFocus={focus} onBlur={blur} />
                </div>
            )}

            {/* 유형별 추가 필드 */}
            <div className="grid grid-cols-1 gap-3 p-4 rounded-2xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--foreground-muted)" }}>✨ 퀄리티 향상 옵션</p>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>{cfg.urgencyLabel} <span style={{ fontWeight: 400 }}>(선택)</span></label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder={cfg.urgencyPlaceholder} value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
                        onFocus={focus} onBlur={blur} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>{cfg.socialProofLabel} <span style={{ fontWeight: 400 }}>(선택)</span></label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder={cfg.socialProofPlaceholder} value={form.socialProof} onChange={e => setForm(f => ({ ...f, socialProof: e.target.value }))}
                        onFocus={focus} onBlur={blur} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>{cfg.ctaLabel} <span style={{ fontWeight: 400 }}>(선택)</span></label>
                    <input className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder={cfg.ctaPlaceholder} value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                        onFocus={focus} onBlur={blur} />
                </div>
                {isPromotion && (
                    <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>차별화 포인트 <span style={{ fontWeight: 400 }}>(선택)</span></label>
                        <input className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                            style={{ background: "var(--surface)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                            placeholder="예: 국내 직접 소분, 냉장 배송, 인증 취득" value={form.differentiator}
                            onChange={e => setForm(f => ({ ...f, differentiator: e.target.value }))}
                            onFocus={focus} onBlur={blur} />
                    </div>
                )}
            </div>
        </div>
    );
}
