"use client";

import { useState } from "react";
import { Sparkles, Send, Info, ChevronDown, ChevronUp, Clock, AlertCircle } from "lucide-react";

type ContentType = "cardnews" | "detail-page" | "shorts";

interface RefinementLog {
    request: string;
    at: string;
}

interface Props {
    contentType: ContentType;
    originalInput: Record<string, string>;
    currentResult: Record<string, unknown>;
    onUpdate: (newResult: Record<string, unknown>) => void;
}

const QUICK_ACTIONS: Record<ContentType, { label: string; prompt: string }[]> = {
    cardnews: [
        { label: "✨ 더 친근한 톤으로", prompt: "전체 텍스트 톤을 더 친근하고 편안한 말투로 바꿔줘" },
        { label: "🔥 CTA 더 강하게", prompt: "마지막 슬라이드의 행동 유도 문구를 더 강력하고 긴급하게 바꿔줘" },
        { label: "✂️ 더 간결하게", prompt: "모든 슬라이드 텍스트를 30% 줄여서 더 간결하게 만들어줘" },
        { label: "💎 고급스럽게", prompt: "전체 분위기를 더 고급스럽고 프리미엄한 느낌으로 바꿔줘" },
        { label: "#️⃣ 해시태그 보강", prompt: "마지막 슬라이드의 해시태그를 트렌드에 맞는 것으로 8개로 늘려줘" },
        { label: "🖼️ 이미지 프롬프트 강화", prompt: "GPT 이미지 프롬프트를 더 상세하고 구체적으로 보강해줘" },
    ],
    shorts: [
        { label: "🎣 후킹 더 강하게", prompt: "첫 3초 후킹 멘트를 더 강렬하고 호기심을 자극하는 방향으로 바꿔줘" },
        { label: "😄 더 유머러스하게", prompt: "전체 스크립트 톤을 더 가볍고 유머러스하게 바꿔줘" },
        { label: "💬 자막 임팩트 강화", prompt: "모든 장면의 자막을 더 임팩트 있고 기억에 남는 문구로 바꿔줘" },
        { label: "📣 CTA 명확하게", prompt: "마지막 장면의 행동 유도를 더 명확하고 직접적으로 바꿔줘" },
        { label: "⏱️ 더 빠른 템포로", prompt: "장면 전환이 더 빠르게 느껴지도록 각 장면 스크립트를 짧게 압축해줘" },
        { label: "🎵 음악 추천 변경", prompt: "배경음악 추천을 더 트렌디하고 젊은 느낌으로 바꿔줘" },
    ],
    "detail-page": [
        { label: "💥 헤드라인 더 강렬하게", prompt: "상단 후킹 헤드라인을 더 강렬하고 구매 욕구를 자극하는 문구로 바꿔줘" },
        { label: "🔍 특장점 더 구체적으로", prompt: "핵심 특장점 섹션의 각 항목을 더 구체적인 수치나 근거를 포함해서 보강해줘" },
        { label: "💰 가격 저항감 줄이기", prompt: "구매 유도 섹션에서 가격 저항감을 줄이는 문구(분할 결제, 대비 효과 등)를 추가해줘" },
        { label: "⭐ 후기 더 자연스럽게", prompt: "고객 후기를 더 자연스럽고 신뢰감 있는 표현으로 바꿔줘" },
        { label: "🚨 긴급성 추가", prompt: "구매 유도 섹션에 한정 수량, 기간 한정 등 긴급성을 부여하는 문구를 추가해줘" },
        { label: "🔑 SEO 키워드 보강", prompt: "SEO 키워드를 검색량이 높을 것 같은 키워드 위주로 10개로 늘려줘" },
    ],
};

const GUIDE_TIPS = [
    {
        good: "1번 슬라이드 헤드라인을 '지금 바로 바꿔야 하는 이유' 느낌으로 수정해줘",
        bad: "더 좋게 해줘",
        tip: "수정할 위치와 원하는 방향을 구체적으로 지정하세요",
    },
    {
        good: "톤을 20대 여성이 공감할 수 있는 친근한 말투로 전체 수정해줘",
        bad: "말투 바꿔줘",
        tip: "타겟과 원하는 느낌을 함께 설명하면 더 정확해요",
    },
    {
        good: "CTA 문구에 '오늘만 20% 할인' 혜택을 강조해서 넣어줘",
        bad: "할인 넣어줘",
        tip: "추가할 구체적인 내용을 직접 알려주세요",
    },
];

export default function RefinementPanel({ contentType, originalInput, currentResult, onUpdate }: Props) {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showGuide, setShowGuide] = useState(false);
    const [logs, setLogs] = useState<RefinementLog[]>([]);

    const quickActions = QUICK_ACTIONS[contentType];

    const handleSubmit = async (prompt: string) => {
        const trimmed = prompt.trim();
        if (!trimmed || loading) return;

        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/ai/refine-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType,
                    originalInput,
                    currentResult,
                    userMessage: trimmed,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "오류 발생");

            onUpdate(data);
            setLogs(prev => [{ request: trimmed, at: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 5));
            setMessage("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "오류가 발생했어요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="edu-card overflow-hidden">
            {/* 헤더 */}
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} style={{ color: "var(--primary)" }} />
                        <span className="text-sm font-black" style={{ color: "var(--foreground)" }}>
                            AI에게 수정 요청
                        </span>
                    </div>
                    <button
                        onClick={() => setShowGuide(v => !v)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{ background: "var(--surface-2)", color: "var(--foreground-muted)" }}
                    >
                        <Info size={11} />
                        효과적으로 요청하기
                        {showGuide ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                </div>

                {/* 이전 대화 참조 불가 안내 */}
                <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-xl"
                    style={{ background: "#FFF8E7", border: "1px solid #FFC23340" }}>
                    <AlertCircle size={13} className="shrink-0 mt-0.5" style={{ color: "#B45309" }} />
                    <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
                        <span className="font-bold">매 요청은 현재 결과물 기준으로 독립적으로 처리돼요.</span>{" "}
                        이전 대화 내용은 참조되지 않으니, 수정 요청마다 원하는 내용을 구체적으로 입력해주세요.
                    </p>
                </div>
            </div>

            {/* 효과적인 수정 요청 가이드 (토글) */}
            {showGuide && (
                <div className="p-5 border-b space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                    <p className="text-xs font-black" style={{ color: "var(--foreground)" }}>💡 이렇게 요청하면 더 잘 돼요</p>
                    {GUIDE_TIPS.map((tip, i) => (
                        <div key={i} className="space-y-1.5">
                            <p className="text-[11px] font-bold" style={{ color: "var(--foreground-muted)" }}>팁 {i + 1}: {tip.tip}</p>
                            <div className="grid grid-cols-1 gap-1.5">
                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
                                    style={{ background: "#ECFDF5" }}>
                                    <span className="text-xs font-black shrink-0" style={{ color: "var(--accent)" }}>✅</span>
                                    <p className="text-xs" style={{ color: "#065F46" }}>{tip.good}</p>
                                </div>
                                <div className="flex items-start gap-2 px-3 py-2 rounded-lg"
                                    style={{ background: "#FEE2E2" }}>
                                    <span className="text-xs font-black shrink-0" style={{ color: "#DC2626" }}>❌</span>
                                    <p className="text-xs" style={{ color: "#991B1B" }}>{tip.bad}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 빠른 수정 버튼 */}
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-bold mb-3" style={{ color: "var(--foreground-muted)" }}>빠른 수정</p>
                <div className="flex flex-wrap gap-2">
                    {quickActions.map(action => (
                        <button
                            key={action.label}
                            onClick={() => handleSubmit(action.prompt)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "var(--surface-2)", color: "var(--foreground-soft)" }}
                            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--primary-light)"; (e.currentTarget as HTMLElement).style.color = "var(--primary)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--foreground-soft)"; }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 직접 입력 */}
            <div className="p-5 space-y-3">
                <p className="text-xs font-bold" style={{ color: "var(--foreground-muted)" }}>직접 입력</p>
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder="예: 2번 슬라이드 본문을 더 감성적으로 바꿔줘"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(message); } }}
                        onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                        disabled={loading}
                    />
                    <button
                        onClick={() => handleSubmit(message)}
                        disabled={loading || !message.trim()}
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}
                    >
                        {loading
                            ? <Sparkles size={16} className="text-white animate-spin" />
                            : <Send size={16} className="text-white" />}
                    </button>
                </div>

                {error && (
                    <p className="text-xs px-3 py-2 rounded-lg font-semibold"
                        style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</p>
                )}

                {loading && (
                    <p className="text-xs text-center animate-pulse" style={{ color: "var(--foreground-muted)" }}>
                        AI가 수정하고 있어요... 보통 10-15초 걸려요
                    </p>
                )}

                {/* 수정 이력 */}
                {logs.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-bold" style={{ color: "var(--foreground-muted)" }}>최근 수정 요청</p>
                        {logs.map((log, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                style={{ background: "var(--surface-2)" }}>
                                <Clock size={11} className="shrink-0" style={{ color: "var(--foreground-muted)" }} />
                                <p className="text-xs flex-1 truncate" style={{ color: "var(--foreground-soft)" }}>{log.request}</p>
                                <span className="text-[10px] shrink-0" style={{ color: "var(--foreground-muted)" }}>{log.at}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
