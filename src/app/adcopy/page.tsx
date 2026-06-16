"use client";

import { useState, useEffect } from "react";
import { Megaphone, Sparkles, Copy, Check, ChevronDown, ChevronUp, Zap, Hash, Target, MousePointerClick, AlignLeft } from "lucide-react";
import AuthGate from "@/components/common/AuthGate";
import UsageBar from "@/components/common/UsageBar";
import { useUsage } from "@/lib/hooks/useUsage";
import { usePersistedForm } from "@/lib/hooks/usePersistedForm";
import VersionSwitcher from "@/components/common/VersionSwitcher";

interface Headline { type: string; text: string; hook: string; }
interface BodyText { length: string; label: string; text: string; }
interface CTA { style: string; text: string; }
interface VisualIdentityCard {
    brandColor?: string;
    visualStyle?: string;
    productAppearance?: string;
    backgroundSetting?: string;
    adCardPrompt: string;
}
interface AdImagePrompt { headlineType: string; prompt: string; }

interface AdCopyResult {
    productName: string;
    platform: string;
    goal: string;
    visualIdentityCard?: VisualIdentityCard;
    headlines: Headline[];
    adImagePrompts?: AdImagePrompt[];
    bodyTexts: BodyText[];
    ctas: CTA[];
    hashtags: string[];
    abTestTip: string;
    _savedId?: string;
}

const TONES = ["친근하고 감성적", "전문적이고 신뢰감", "활기차고 트렌디", "고급스럽고 프리미엄", "유머러스하고 재밌는", "직접적이고 도발적"];

const PLATFORMS = [
    { value: "all", label: "🌐 전 채널", desc: "모든 채널 범용" },
    { value: "instagram", label: "📸 인스타그램", desc: "피드·스토리·릴스" },
    { value: "naver", label: "🛒 스마트스토어", desc: "네이버 쇼핑" },
    { value: "kakao", label: "💬 카카오", desc: "카카오톡 채널" },
    { value: "youtube", label: "▶️ 유튜브", desc: "영상 광고·설명" },
    { value: "facebook", label: "📘 페이스북", desc: "피드·광고" },
];

const GOALS = [
    { value: "purchase", label: "🛒 즉각 구매 유도" },
    { value: "awareness", label: "🧠 인지도 향상" },
    { value: "follow", label: "❤️ 팔로워 확보" },
    { value: "traffic", label: "🔗 트래픽 유도" },
];

const HEADLINE_COLORS: Record<string, string> = {
    "감성형": "var(--primary)",
    "혜택형": "var(--accent)",
    "질문형": "var(--secondary)",
    "긴급형": "#EF4444",
    "숫자형": "#8B5CF6",
};

export default function AdCopyPage() {
    const [form, setForm] = usePersistedForm("adcopy_form_draft", {
        productName: "", features: "", target: "", tone: "친근하고 감성적",
        platform: "all", goal: "purchase",
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AdCopyResult | null>(null);
    const [error, setError] = useState("");
    const [showFormPanel, setShowFormPanel] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [copiedAdCard, setCopiedAdCard] = useState(false);
    const [expandedImgPrompt, setExpandedImgPrompt] = useState<string | null>(null);
    const [justSaved, setJustSaved] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [versionTrigger, setVersionTrigger] = useState(0);

    const usage = useUsage();

    // 갤러리에서 복원
    useEffect(() => {
        const saved = localStorage.getItem("ai_gallery_restore_adcopy");
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.headlines?.length) {
                const { _input, ...content } = parsed;
                setResult(content as AdCopyResult);
                if (_input) setForm(f => ({ ...f, ..._input }));
            }
        } catch { /* 무시 */ }
        localStorage.removeItem("ai_gallery_restore_adcopy");
    }, []);

    const handleSubmit = async () => {
        if (!form.productName.trim()) { setError("제품/서비스명은 필수입니다."); return; }
        setError("");
        setLoading(true);
        setResult(null);
        setShowFormPanel(false);

        try {
            const token = await usage.getToken();
            const res = await fetch("/api/ai/adcopy", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 429 && data.limitExceeded) usage.refresh();
                throw new Error(data.error || "오류 발생");
            }
            const { _savedId, ...content } = data;
            setResult(content as AdCopyResult);
            setSavedId(_savedId ?? null);
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000);
            setVersionTrigger(t => t + 1);
            usage.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "오류가 발생했어요.");
        } finally {
            setLoading(false);
        }
    };

    const copyAdCard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedAdCard(true);
        setTimeout(() => setCopiedAdCard(false), 2000);
    };

    const copy = async (text: string, key: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const CopyBtn = ({ text, id }: { text: string; id: string }) => (
        <button onClick={() => copy(text, id)}
            className="p-1.5 rounded-lg transition-all shrink-0"
            style={{ background: copiedKey === id ? "var(--accent)" : "var(--surface-2)", color: copiedKey === id ? "white" : "var(--foreground-muted)" }}>
            {copiedKey === id ? <Check size={12} /> : <Copy size={12} />}
        </button>
    );

    return (
        <AuthGate>
            <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                            style={{ background: "#FFF0EB", color: "var(--primary)" }}>
                            <Megaphone size={12} />광고 카피 생성기
                        </div>
                        <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>광고 카피 생성기</h1>
                        <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                            헤드라인 5종 · 본문 3종 · CTA 3종 · 해시태그를 한 번에
                        </p>
                    </div>
                    {result && (
                        <button onClick={() => { setResult(null); setShowFormPanel(false); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                            <Sparkles size={13} />새로 생성
                        </button>
                    )}
                </div>

                <UsageBar usage={usage} />

                {/* 입력 폼 */}
                {(!result || showFormPanel) && (
                    <div className="edu-card p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--foreground)" }}>
                                제품/서비스명 <span style={{ color: "var(--primary)" }}>*</span>
                            </label>
                            <input
                                value={form.productName}
                                onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                                placeholder="예: 수제 아메리카노, 온라인 영어 강의, 핸드메이드 캔들"
                                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                                style={{ background: "white", borderColor: "var(--border)", color: "var(--foreground)" }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--foreground)" }}>핵심 특징/장점</label>
                            <textarea
                                value={form.features}
                                onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                                placeholder="예: 매일 아침 신선하게 로스팅, 설탕·시럽 무첨가, 1잔 2,500원"
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                                style={{ background: "white", borderColor: "var(--border)", color: "var(--foreground)" }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1.5" style={{ color: "var(--foreground)" }}>타겟</label>
                            <input
                                value={form.target}
                                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                                placeholder="예: 20~30대 직장인, 다이어트 중인 여성, 카페 창업 준비자"
                                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                                style={{ background: "white", borderColor: "var(--border)", color: "var(--foreground)" }}
                            />
                        </div>

                        {/* 톤앤매너 */}
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground)" }}>톤앤매너</label>
                            <div className="flex flex-wrap gap-2">
                                {TONES.map(t => (
                                    <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                        style={{
                                            background: form.tone === t ? "var(--primary)" : "var(--surface-2)",
                                            color: form.tone === t ? "white" : "var(--foreground-soft)",
                                        }}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 채널 */}
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground)" }}>주요 채널</label>
                            <div className="grid grid-cols-3 gap-2">
                                {PLATFORMS.map(p => (
                                    <button key={p.value} onClick={() => setForm(f => ({ ...f, platform: p.value }))}
                                        className="px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all"
                                        style={{
                                            background: form.platform === p.value ? "var(--primary-light)" : "var(--surface-2)",
                                            color: form.platform === p.value ? "var(--primary)" : "var(--foreground-soft)",
                                            border: `1.5px solid ${form.platform === p.value ? "var(--primary)" : "transparent"}`,
                                        }}>
                                        <div>{p.label}</div>
                                        <div className="text-[10px] mt-0.5 opacity-70">{p.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 광고 목표 */}
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: "var(--foreground)" }}>광고 목표</label>
                            <div className="flex flex-wrap gap-2">
                                {GOALS.map(g => (
                                    <button key={g.value} onClick={() => setForm(f => ({ ...f, goal: g.value }))}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                        style={{
                                            background: form.goal === g.value ? "var(--secondary)" : "var(--surface-2)",
                                            color: form.goal === g.value ? "white" : "var(--foreground-soft)",
                                        }}>
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm px-4 py-3 rounded-xl" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>
                        )}

                        <button onClick={handleSubmit} disabled={loading}
                            className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                            style={{
                                background: loading ? "var(--surface-2)" : "var(--primary)",
                                color: loading ? "var(--foreground-muted)" : "white",
                            }}>
                            {loading ? (
                                <><Sparkles size={16} className="animate-spin" />광고 카피 생성 중...</>
                            ) : (
                                <><Megaphone size={16} />광고 카피 생성하기</>
                            )}
                        </button>
                    </div>
                )}

                {/* 결과 */}
                {result && (
                    <div className="space-y-4">
                        {/* 결과 헤더 */}
                        {!showFormPanel && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                                        style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                                        {justSaved ? <><Check size={11} />갤러리 저장됨</> : <><Sparkles size={11} />생성 완료</>}
                                    </div>
                                    <VersionSwitcher
                                        type="adcopy"
                                        currentId={savedId}
                                        getToken={usage.getToken}
                                        refreshTrigger={versionTrigger}
                                        onSelect={(id, content) => {
                                            setResult(content as unknown as AdCopyResult);
                                            setSavedId(id);
                                        }}
                                    />
                                </div>
                                <button onClick={() => setShowFormPanel(!showFormPanel)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                    style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}>
                                    {showFormPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {showFormPanel ? "접기" : "수정하기"}
                                </button>
                            </div>
                        )}

                        {/* 광고 비주얼 아이덴티티 카드 */}
                        {result.visualIdentityCard?.adCardPrompt && (
                            <div className="edu-card overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2.5"
                                    style={{ background: "#ECFDF5", borderBottom: "1px solid #10A37F20" }}>
                                    <div>
                                        <p className="text-xs font-black" style={{ color: "#10A37F" }}>🎨 광고 비주얼 레퍼런스 카드 — GPT Image 2.0 전용</p>
                                        <p className="text-[10px]" style={{ color: "#10A37F88" }}>이 프롬프트로 먼저 광고 비주얼 가이드를 생성한 뒤 각 광고 이미지에 첨부하세요</p>
                                    </div>
                                    <button onClick={() => copyAdCard(result.visualIdentityCard!.adCardPrompt)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0"
                                        style={{ background: copiedAdCard ? "#10A37F" : "white", color: copiedAdCard ? "white" : "#10A37F" }}>
                                        {copiedAdCard ? <Check size={10} /> : <Copy size={10} />}
                                        {copiedAdCard ? "복사됨!" : "프롬프트 복사"}
                                    </button>
                                </div>
                                {(result.visualIdentityCard.brandColor || result.visualIdentityCard.visualStyle) && (
                                    <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                        {[
                                            { label: "브랜드 컬러", value: result.visualIdentityCard.brandColor },
                                            { label: "비주얼 스타일", value: result.visualIdentityCard.visualStyle },
                                            { label: "제품 외형", value: result.visualIdentityCard.productAppearance },
                                            { label: "배경/환경", value: result.visualIdentityCard.backgroundSetting },
                                        ].filter(x => x.value).map(x => (
                                            <div key={x.label}>
                                                <p className="text-[10px] font-bold" style={{ color: "var(--foreground-muted)" }}>{x.label}</p>
                                                <p className="text-[11px] mt-0.5" style={{ color: "var(--foreground-soft)" }}>{x.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-soft)" }}>
                                        {result.visualIdentityCard.adCardPrompt}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 헤드라인 */}
                        <div className="edu-card p-5 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap size={16} style={{ color: "var(--primary)" }} />
                                <h2 className="text-sm font-black" style={{ color: "var(--foreground)" }}>헤드라인 5종</h2>
                            </div>
                            {result.headlines.map((h, i) => {
                                const color = HEADLINE_COLORS[h.type] ?? "var(--primary)";
                                const imgPrompt = result.adImagePrompts?.find(p => p.headlineType === h.type);
                                const isExpanded = expandedImgPrompt === h.type;
                                return (
                                    <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                                        <div className="flex items-start justify-between gap-2 p-4" style={{ background: "var(--surface-2)" }}>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                                                    style={{ background: color + "18", color }}>
                                                    {h.type}
                                                </span>
                                                <p className="text-base font-black leading-snug" style={{ color: "var(--foreground)" }}>{h.text}</p>
                                                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--foreground-soft)" }}>💡 {h.hook}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 shrink-0">
                                                <CopyBtn text={h.text} id={`h-${i}`} />
                                                {imgPrompt && (
                                                    <button onClick={() => setExpandedImgPrompt(isExpanded ? null : h.type)}
                                                        className="p-1.5 rounded-lg text-[9px] font-bold"
                                                        style={{ background: isExpanded ? "#10A37F" : "var(--surface)", color: isExpanded ? "white" : "#10A37F", border: "1px solid #10A37F30" }}>
                                                        🖼️
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {imgPrompt && isExpanded && (
                                            <div>
                                                <div className="flex items-center justify-between px-3 py-2" style={{ background: "#ECFDF5" }}>
                                                    <span className="text-[11px] font-black" style={{ color: "#10A37F" }}>🖼️ 광고 이미지 GPT Image 프롬프트</span>
                                                    <CopyBtn text={imgPrompt.prompt} id={`ip-${i}`} />
                                                </div>
                                                <div className="px-3 py-2.5" style={{ background: "var(--surface)" }}>
                                                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--foreground-soft)" }}>{imgPrompt.prompt}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 본문 카피 */}
                        <div className="edu-card p-5 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlignLeft size={16} style={{ color: "var(--secondary)" }} />
                                <h2 className="text-sm font-black" style={{ color: "var(--foreground)" }}>본문 카피 3종</h2>
                            </div>
                            {result.bodyTexts.map((b, i) => (
                                <div key={i} className="p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] font-bold mb-1.5 inline-block" style={{ color: "var(--foreground-muted)" }}>
                                                {b.label}
                                            </span>
                                            <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{b.text}</p>
                                        </div>
                                        <CopyBtn text={b.text} id={`b-${i}`} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="edu-card p-5 space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <MousePointerClick size={16} style={{ color: "var(--accent)" }} />
                                <h2 className="text-sm font-black" style={{ color: "var(--foreground)" }}>CTA 버튼 문구</h2>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {result.ctas.map((c, i) => (
                                    <div key={i} className="p-3 rounded-xl border text-center relative" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                                        <p className="text-[10px] mb-1.5" style={{ color: "var(--foreground-muted)" }}>{c.style}</p>
                                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>{c.text}</p>
                                        <button onClick={() => copy(c.text, `c-${i}`)}
                                            className="mt-2 px-2.5 py-1 rounded-lg text-[10px] font-bold w-full"
                                            style={{
                                                background: copiedKey === `c-${i}` ? "var(--accent)" : "white",
                                                color: copiedKey === `c-${i}` ? "white" : "var(--foreground-muted)",
                                            }}>
                                            {copiedKey === `c-${i}` ? "복사됨!" : "복사"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 해시태그 */}
                        <div className="edu-card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Hash size={16} style={{ color: "#8B5CF6" }} />
                                    <h2 className="text-sm font-black" style={{ color: "var(--foreground)" }}>추천 해시태그</h2>
                                </div>
                                <CopyBtn text={"#" + result.hashtags.join(" #")} id="hashtags" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {result.hashtags.map((tag, i) => (
                                    <button key={i} onClick={() => copy(`#${tag}`, `tag-${i}`)}
                                        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                        style={{
                                            background: copiedKey === `tag-${i}` ? "#8B5CF6" : "#F5F3FF",
                                            color: copiedKey === `tag-${i}` ? "white" : "#8B5CF6",
                                        }}>
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* A/B 테스트 팁 */}
                        {result.abTestTip && (
                            <div className="p-4 rounded-xl" style={{ background: "var(--highlight-light)", border: "1px solid var(--highlight)" }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Target size={14} style={{ color: "var(--highlight-dark)" }} />
                                    <span className="text-xs font-black" style={{ color: "var(--highlight-dark)" }}>A/B 테스트 전략</span>
                                </div>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--highlight-dark)" }}>{result.abTestTip}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AuthGate>
    );
}
