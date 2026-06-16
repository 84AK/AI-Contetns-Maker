"use client";

import { useState, useEffect } from "react";
import { Film, Sparkles, Copy, Check, Music, Camera, Edit3, RotateCcw, BookmarkCheck, Bookmark, ZapOff, Link2 } from "lucide-react";
import RefinementPanel from "@/components/tools/RefinementPanel";
import { usePersistedForm } from "@/lib/hooks/usePersistedForm";
import AuthGate from "@/components/common/AuthGate";
import UsageBar from "@/components/common/UsageBar";
import { useUsage } from "@/lib/hooks/useUsage";
import { useLinkedContent } from "@/store/useLinkedContent";

interface Scene {
    sceneNum: number;
    time: string;
    action: string;
    script: string;
    caption: string;
}

interface ShortsResult {
    title: string;
    hook: string;
    scenes: Scene[];
    musicTip: string;
    hashtags: string[];
    shootingTips: string[];
}

const DURATIONS = ["15초", "30초", "60초"];
const MOODS = ["활기차고 트렌디", "감성적이고 따뜻한", "유머러스하고 재밌는", "전문적이고 신뢰감", "호기심 자극하는"];

const CONTENT_TYPES = [
    { value: "promotion", emoji: "🛍️", label: "상품/서비스 홍보" },
    { value: "education", emoji: "📚", label: "수업/강의 소개" },
    { value: "tutorial", emoji: "🔧", label: "사용법 튜토리얼" },
    { value: "info", emoji: "💡", label: "정보/지식 전달" },
];

const TYPE_SHORTS_CONFIG: Record<string, {
    subjectLabel: string; subjectPlaceholder: string;
    coreContentLabel: string; coreContentPlaceholder: string;
    coreContentRequired: boolean;
    hookLabel: string; hookPlaceholder: string;
}> = {
    promotion: {
        subjectLabel: "제품/서비스명", subjectPlaceholder: "예: 수제 비누, 강아지 간식",
        coreContentLabel: "핵심 메시지/특징", coreContentPlaceholder: "예: 천연 성분, 피부 진정, 아토피에 좋은",
        coreContentRequired: true,
        hookLabel: "첫 3초 훅 아이디어", hookPlaceholder: "예: '이거 하나로 피부가 바뀐다고?' / 사용 전후 비교 장면",
    },
    education: {
        subjectLabel: "수업/강의명", subjectPlaceholder: "예: AI 기초 수업, 포토샵 입문",
        coreContentLabel: "수업 핵심 내용", coreContentPlaceholder: "예:\n1강. AI란 무엇인가\n2강. ChatGPT 실전 사용법",
        coreContentRequired: true,
        hookLabel: "배우기 전/후 변화", hookPlaceholder: "예: '이 수업 듣기 전엔 AI가 두려웠는데, 지금은 매일 씁니다'",
    },
    tutorial: {
        subjectLabel: "서비스/앱 이름", subjectPlaceholder: "예: 클로드 AI, 네이버 스마트스토어",
        coreContentLabel: "단계별 사용 순서", coreContentPlaceholder: "예:\n1단계: 앱 설치 후 회원가입\n2단계: 메인 화면에서 클릭\n3단계: 결과 확인",
        coreContentRequired: true,
        hookLabel: "첫 3초 훅 문구", hookPlaceholder: "예: '이 앱 쓰는 법 모르면 손해' / '30초 만에 끝나는 방법'",
    },
    info: {
        subjectLabel: "주제", subjectPlaceholder: "예: SNS 마케팅 꿀팁, 건강한 아침 루틴",
        coreContentLabel: "전달할 핵심 내용", coreContentPlaceholder: "예:\n1. 기상 후 물 한 잔 - 신진대사 활성화\n2. 5분 스트레칭\n3. 단백질 아침 식사",
        coreContentRequired: true,
        hookLabel: "놀라운 사실 / 훅 문구", hookPlaceholder: "예: '아침에 이것만 해도 생산성이 23% 올라갑니다'",
    },
};

const ACCENT = "var(--accent)";
const ACCENT_BG = "#ECFDF5";

export default function ShortsPage() {
    const [form, setForm] = usePersistedForm("aicontents_shorts_form_v2", {
        contentType: "promotion",
        productName: "", coreContent: "", hookIdea: "", target: "",
        mood: "활기차고 트렌디", duration: "30초",
    });
    const [linkedBanner, setLinkedBanner] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ShortsResult | null>(null);
    const [error, setError] = useState("");
    const [selectedScene, setSelectedScene] = useState(0);
    const [showFormPanel, setShowFormPanel] = useState(false);
    const [copiedScene, setCopiedScene] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const usage = useUsage();
    const { linked, clearLinked } = useLinkedContent();

    // 갤러리에서 복원
    useEffect(() => {
        const saved = localStorage.getItem("ai_gallery_restore_shorts");
        if (!saved) return;
        try {
            const content = JSON.parse(saved) as ShortsResult;
            if (content.scenes?.length) setResult(content);
        } catch { /* 무시 */ }
        localStorage.removeItem("ai_gallery_restore_shorts");
    }, []);

    useEffect(() => {
        if (!linked) return;
        setForm(f => ({
            ...f,
            contentType: linked.contentType,
            productName: linked.productName,
            coreContent: linked.coreContent || linked.features,
            target: linked.target,
        }));
        setLinkedBanner(true);
        clearLinked();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async () => {
        const cfg = TYPE_SHORTS_CONFIG[form.contentType] ?? TYPE_SHORTS_CONFIG.promotion;
        if (!form.productName.trim()) {
            setError(`${cfg.subjectLabel}은(는) 필수입니다.`);
            return;
        }
        if (!form.coreContent.trim()) {
            setError(`${cfg.coreContentLabel}을(를) 입력해주세요.`);
            return;
        }
        setError("");
        setLoading(true);
        setResult(null);
        setSelectedScene(0);
        setShowFormPanel(false);

        try {
            const token = await usage.getToken();
            const res = await fetch("/api/ai/shorts", {
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

    const copyScene = async (scene: Scene) => {
        await navigator.clipboard.writeText(`[${scene.time}] ${scene.action}\n대사: ${scene.script}\n자막: ${scene.caption}`);
        setCopiedScene(scene.sceneNum);
        setTimeout(() => setCopiedScene(null), 2000);
    };

    const copyAll = async () => {
        if (!result) return;
        const text = [
            `📱 ${result.title}`,
            ``,
            `🎣 후킹: ${result.hook}`,
            ``,
            ...result.scenes.map(s => `[${s.time}] ${s.action}\n대사: ${s.script}\n자막: ${s.caption}`),
            ``,
            `🎵 배경음악: ${result.musicTip}`,
            ``,
            `#${result.hashtags.join(" #")}`,
        ].join("\n");
        await navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    const activeScene = result?.scenes[selectedScene];

    // ── 결과 화면 ──
    if (result) {
        return (
            <AuthGate toolName="쇼츠 스크립트 생성기">
            <div className="space-y-0 max-w-3xl mx-auto">
                {/* 상단 바 */}
                <div className="sticky top-0 z-10 flex items-center gap-2 px-1 py-3 flex-wrap"
                    style={{ background: "var(--background)" }}>
                    <button onClick={() => setShowFormPanel(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background: showFormPanel ? ACCENT : "var(--surface-2)", color: showFormPanel ? "white" : "var(--foreground-soft)" }}>
                        <Edit3 size={12} />입력 수정
                        {showFormPanel ? "▲" : "▼"}
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: "var(--foreground)" }}>{result.title}</p>
                        <p className="text-[10px]" style={{ color: "var(--foreground-muted)" }}>{form.duration} · {form.mood}</p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: justSaved ? ACCENT : "var(--foreground-muted)" }}>
                        {justSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                        {justSaved ? "갤러리에 저장됨" : "저장됨"}
                    </span>
                    <button onClick={() => { setResult(null); setShowFormPanel(false); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                        <RotateCcw size={12} />새로 만들기
                    </button>
                </div>

                {/* 접히는 입력 폼 */}
                {showFormPanel && (
                    <div className="edu-card p-5 mb-4 space-y-4">
                        <ShortsFormFields form={form} setForm={setForm as React.Dispatch<React.SetStateAction<ShortsForm>>} />
                        {error && <p className="text-xs px-3 py-2 rounded-lg font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>}
                        <GenerateButton
                            onClick={handleSubmit}
                            loading={loading}
                            canGenerate={usage.canGenerate}
                            label="다시 생성하기"
                            accentGradient={`linear-gradient(135deg, ${ACCENT}, #06D6A0)`}
                        />
                    </div>
                )}

                {/* 후킹 멘트 */}
                <div className="rounded-2xl p-4 mb-4 border-2" style={{ background: ACCENT_BG, borderColor: ACCENT }}>
                    <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: ACCENT }}>🎣 첫 3초 후킹 — 이 멘트로 시작하세요</p>
                    <p className="text-base font-black" style={{ color: "var(--foreground)" }}>"{result.hook}"</p>
                </div>

                {/* 장면 탭 + 전체 복사 */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-2 overflow-x-auto flex-1 pb-1" style={{ scrollbarWidth: "none" }}>
                        {result.scenes.map((scene, idx) => (
                            <button key={scene.sceneNum} onClick={() => setSelectedScene(idx)}
                                className="flex flex-col items-center gap-0.5 shrink-0 px-3 py-2.5 rounded-2xl transition-all"
                                style={{ minWidth: 64, background: selectedScene === idx ? ACCENT : "var(--surface-2)" }}>
                                <span className="text-sm font-black" style={{ color: selectedScene === idx ? "white" : "var(--foreground-soft)" }}>
                                    {scene.sceneNum}
                                </span>
                                <span className="text-[9px] font-bold" style={{ color: selectedScene === idx ? "rgba(255,255,255,0.8)" : "var(--foreground-muted)" }}>
                                    {scene.time}
                                </span>
                            </button>
                        ))}
                    </div>
                    <button onClick={copyAll}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0"
                        style={{ background: copiedAll ? ACCENT : "var(--surface-2)", color: copiedAll ? "white" : "var(--foreground-soft)" }}>
                        {copiedAll ? <Check size={11} /> : <Copy size={11} />}
                        전체 복사
                    </button>
                </div>

                {/* 선택된 장면 디테일 */}
                {activeScene && (
                    <div className="edu-card overflow-hidden mb-4">
                        <div className="px-5 py-4 border-b flex items-center justify-between"
                            style={{ background: ACCENT_BG, borderColor: "var(--border)" }}>
                            <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                                    style={{ background: ACCENT }}>{activeScene.sceneNum}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: "white", color: ACCENT }}>{activeScene.time}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setSelectedScene(Math.max(0, selectedScene - 1))} disabled={selectedScene === 0}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30"
                                    style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>‹</button>
                                <button onClick={() => setSelectedScene(Math.min(result.scenes.length - 1, selectedScene + 1))} disabled={selectedScene === result.scenes.length - 1}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold disabled:opacity-30"
                                    style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>›</button>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* 촬영 지시 */}
                            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                                style={{ background: "var(--surface-2)" }}>
                                <Camera size={13} className="shrink-0 mt-0.5" style={{ color: "var(--foreground-muted)" }} />
                                <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{activeScene.action}</p>
                            </div>

                            {/* 대사 */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--foreground-muted)" }}>대사 / 나레이션</p>
                                <p className="text-base font-semibold leading-relaxed" style={{ color: "var(--foreground)" }}>💬 {activeScene.script}</p>
                            </div>

                            {/* 자막 */}
                            {activeScene.caption && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--foreground-muted)" }}>화면 자막</p>
                                    <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                        {activeScene.caption}
                                    </p>
                                </div>
                            )}

                            {/* 이 장면 복사 */}
                            <button onClick={() => copyScene(activeScene)}
                                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                style={{ background: copiedScene === activeScene.sceneNum ? ACCENT : ACCENT_BG, color: copiedScene === activeScene.sceneNum ? "white" : ACCENT }}>
                                {copiedScene === activeScene.sceneNum ? <Check size={14} /> : <Copy size={14} />}
                                {copiedScene === activeScene.sceneNum ? "복사됨!" : "이 장면 복사"}
                            </button>
                        </div>
                    </div>
                )}

                {/* 배경음악 + 해시태그 + 촬영 팁 */}
                <div className="edu-card p-5 mb-4 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Music size={14} style={{ color: "var(--secondary)" }} />
                            <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>추천 배경음악</p>
                        </div>
                        <p className="text-sm" style={{ color: "var(--foreground-soft)" }}>{result.musicTip}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>해시태그</p>
                        <div className="flex flex-wrap gap-1.5">
                            {result.hashtags.map(tag => (
                                <span key={tag} className="text-xs font-semibold" style={{ color: "var(--secondary)" }}>#{tag}</span>
                            ))}
                        </div>
                    </div>
                    {result.shootingTips?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>촬영 팁</p>
                            <div className="space-y-1">
                                {result.shootingTips.map((tip, i) => (
                                    <p key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--foreground-soft)" }}>
                                        <span style={{ color: ACCENT }}>•</span>{tip}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI 수정 요청 */}
                <RefinementPanel contentType="shorts" originalInput={form}
                    currentResult={result as unknown as Record<string, unknown>}
                    onUpdate={(r) => { setResult(r as unknown as ShortsResult); setSelectedScene(0); }} />
            </div>
            </AuthGate>
        );
    }

    // ── 입력 화면 ──
    return (
        <AuthGate toolName="쇼츠 스크립트 생성기">
        <div className="space-y-8">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                    style={{ background: ACCENT_BG, color: ACCENT }}>
                    <Film size={12} />쇼츠 스크립트
                </div>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>쇼츠 스크립트 생성기</h1>
                    <UsageBar usage={usage} />
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                    콘텐츠 유형을 선택하면 바로 촬영 가능한 장면별 스크립트를 만들어드려요.
                </p>
            </div>

            {linkedBanner && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                    style={{ background: "#ECFDF5", borderColor: ACCENT }}>
                    <Link2 size={16} style={{ color: ACCENT, flexShrink: 0 }} />
                    <div className="flex-1">
                        <p className="text-xs font-black" style={{ color: ACCENT }}>카드뉴스에서 연동됨</p>
                        <p className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>입력 내용이 자동으로 채워졌어요. 추가 정보만 입력 후 생성하세요.</p>
                    </div>
                    <button onClick={() => setLinkedBanner(false)} className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="edu-card p-6 space-y-5">
                    <ShortsFormFields form={form} setForm={setForm} />
                    {error && <p className="text-xs px-3 py-2 rounded-lg font-semibold" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>}
                    <GenerateButton
                        onClick={handleSubmit}
                        loading={loading}
                        canGenerate={usage.canGenerate}
                        label="스크립트 생성하기"
                        loadingLabel="AI가 스크립트를 쓰고 있어요..."
                        accentGradient={`linear-gradient(135deg, ${ACCENT}, #06D6A0)`}
                    />
                </div>
                <div className="edu-card p-8 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 300 }}>
                    {loading ? (
                        <>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: ACCENT_BG }}>
                                <Sparkles size={22} className="animate-pulse" style={{ color: ACCENT }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>AI가 스크립트를 작성하고 있어요</p>
                            <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>보통 10-15초 정도 걸려요</p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: ACCENT_BG }}>
                                <Film size={26} style={{ color: ACCENT }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>왼쪽에 정보를 입력하면<br />장면별 스크립트가 여기 표시돼요</p>
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

function GenerateButton({ onClick, loading, canGenerate, label, loadingLabel, accentGradient }: {
    onClick: () => void;
    loading: boolean;
    canGenerate: boolean;
    label: string;
    loadingLabel?: string;
    accentGradient?: string;
}) {
    const exceeded = !canGenerate && !loading;
    const gradient = accentGradient ?? `linear-gradient(135deg, ${ACCENT}, #06D6A0)`;
    return (
        <button
            onClick={onClick}
            disabled={loading || !canGenerate}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
            style={{
                background: exceeded ? "var(--surface-2)" : gradient,
                color: exceeded ? "var(--foreground-muted)" : "white",
                opacity: loading ? 0.7 : 1,
            }}>
            {loading
                ? <span className="flex items-center justify-center gap-2"><Sparkles size={15} className="animate-spin" />{loadingLabel ?? "AI가 생성하고 있어요..."}</span>
                : exceeded
                    ? <span className="flex items-center justify-center gap-2"><ZapOff size={15} />오늘 생성 횟수 소진 — 내일 초기화</span>
                    : <span className="flex items-center justify-center gap-2"><Film size={15} />{label}</span>}
        </button>
    );
}

type ShortsForm = { contentType: string; productName: string; coreContent: string; hookIdea: string; target: string; mood: string; duration: string };

function ShortsFormFields({ form, setForm }: {
    form: ShortsForm;
    setForm: React.Dispatch<React.SetStateAction<ShortsForm>>;
}) {
    const cfg = TYPE_SHORTS_CONFIG[form.contentType] ?? TYPE_SHORTS_CONFIG.promotion;
    const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = ACCENT);
    const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "var(--border)");

    return (
        <div className="space-y-4">
            {/* 콘텐츠 유형 */}
            <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>콘텐츠 유형 <span style={{ color: ACCENT }}>*</span></label>
                <div className="grid grid-cols-2 gap-2">
                    {CONTENT_TYPES.map(ct => (
                        <button key={ct.value} onClick={() => setForm(f => ({ ...f, contentType: ct.value }))}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                            style={{ background: form.contentType === ct.value ? ACCENT_BG : "var(--surface-2)", border: `1.5px solid ${form.contentType === ct.value ? ACCENT : "var(--border)"}` }}>
                            <span className="text-base">{ct.emoji}</span>
                            <p className="text-xs font-black" style={{ color: form.contentType === ct.value ? ACCENT : "var(--foreground)" }}>{ct.label}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* 주제/제품명 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>{cfg.subjectLabel} <span style={{ color: ACCENT }}>*</span></label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={cfg.subjectPlaceholder}
                    value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 핵심 내용 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {cfg.coreContentLabel} <span style={{ color: ACCENT }}>*</span>
                </label>
                <textarea className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all resize-none"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={cfg.coreContentPlaceholder} rows={3}
                    value={form.coreContent} onChange={e => setForm(f => ({ ...f, coreContent: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 훅 아이디어 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                    {cfg.hookLabel} <span style={{ fontWeight: 400 }}>(선택 — 있으면 더 강력한 훅 생성)</span>
                </label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder={cfg.hookPlaceholder}
                    value={form.hookIdea} onChange={e => setForm(f => ({ ...f, hookIdea: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 대상 */}
            <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>대상 고객/독자 <span style={{ fontWeight: 400 }}>(선택)</span></label>
                <input className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                    placeholder="예: 민감성 피부를 가진 20-30대 여성"
                    value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    onFocus={focus} onBlur={blur} />
            </div>

            {/* 분위기 */}
            <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>영상 분위기</label>
                <div className="flex flex-wrap gap-2">
                    {MOODS.map(m => (
                        <button key={m} onClick={() => setForm(f => ({ ...f, mood: m }))}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                            style={{ background: form.mood === m ? ACCENT : "var(--surface-2)", color: form.mood === m ? "white" : "var(--foreground-soft)" }}>
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {/* 영상 길이 */}
            <div>
                <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>영상 길이</label>
                <div className="flex gap-2">
                    {DURATIONS.map(d => (
                        <button key={d} onClick={() => setForm(f => ({ ...f, duration: d }))}
                            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                            style={{ background: form.duration === d ? ACCENT : "var(--surface-2)", color: form.duration === d ? "white" : "var(--foreground-soft)" }}>
                            {d}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
