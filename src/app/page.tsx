import Link from "next/link";
import { Layers, FileText, Film, ArrowRight, Sparkles, Zap, Target, ClipboardList, ChevronRight } from "lucide-react";

const tools = [
    {
        href: "/cardnews",
        icon: Layers,
        title: "카드뉴스 생성기",
        description: "제품 정보를 입력하면 AI가 슬라이드 구성, 카피, GPT 이미지 프롬프트까지 한 번에 만들어줘요.",
        tag: "인스타그램 · 블로그",
        color: "var(--primary)",
        colorLight: "var(--primary-light)",
    },
    {
        href: "/detail-page",
        icon: FileText,
        title: "상세페이지 빌더",
        description: "제품 정보만 넣으면 후킹 문구, 특장점, 사용법, CTA까지 상세페이지 전체 구성을 만들어줘요.",
        tag: "스마트스토어 · 쿠팡",
        color: "var(--secondary)",
        colorLight: "var(--secondary-light)",
    },
    {
        href: "/shorts",
        icon: Film,
        title: "쇼츠 스크립트",
        description: "제품 키워드만 입력하면 후킹 첫 장면부터 장면별 스크립트, 자막까지 완성된 쇼츠 대본을 만들어줘요.",
        tag: "유튜브 쇼츠 · 릴스 · 틱톡",
        color: "var(--accent)",
        colorLight: "#ECFDF5",
    },
];

const plannerSteps = [
    { num: "1", text: "리서치 & 문제 정의" },
    { num: "2", text: "주제 + 템플릿 선택" },
    { num: "3", text: "구성 + 스타일 결정" },
    { num: "4", text: "스토리보드 생성" },
    { num: "5", text: "PRD 기획서 완성" },
];

const steps = [
    { icon: Target, text: "제품 정보 입력" },
    { icon: Sparkles, text: "AI가 구성 + 텍스트 생성" },
    { icon: Zap, text: "GPT에 프롬프트 붙여넣기" },
];

export default function HomePage() {
    return (
        <div className="space-y-10">
            {/* 헤더 */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
                    style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                    <Sparkles size={12} />
                    AI 마케팅 콘텐츠 메이커
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3" style={{ color: "var(--foreground)" }}>
                    3분 안에<br />
                    <span style={{ color: "var(--primary)" }}>마케팅 콘텐츠</span> 완성
                </h1>
                <p className="text-base" style={{ color: "var(--foreground-muted)", maxWidth: 480 }}>
                    제품 정보만 입력하면 AI가 카드뉴스, 상세페이지, 쇼츠 스크립트를 만들어드려요.
                    GPT Image로 이미지까지 바로 생성할 수 있는 프롬프트도 제공합니다.
                </p>
            </div>

            {/* 기획 플래너 CTA 배너 */}
            <Link
                href="/planner"
                className="block rounded-3xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                    background: "linear-gradient(135deg, var(--primary), #FF9A72, var(--secondary))",
                    boxShadow: "0 8px 32px rgba(255,107,53,0.3)",
                    textDecoration: "none",
                }}>
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <ClipboardList size={16} className="text-white" />
                                <span className="text-xs font-bold text-white opacity-90">NEW — 5단계 마케팅 기획 플래너</span>
                            </div>
                            <h2 className="text-lg font-black text-white mb-1">
                                리서치부터 PRD 기획서까지
                            </h2>
                            <p className="text-sm text-white opacity-85">
                                문제 정의 → 템플릿 선택 → 스토리보드 → PRD 기획서 + 프롬프트 패키지
                            </p>
                        </div>
                        <div className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.25)" }}>
                            <ChevronRight size={20} className="text-white" />
                        </div>
                    </div>

                    {/* 미니 스텝 */}
                    <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                        {plannerSteps.map((s, i) => (
                            <div key={s.num} className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
                                    style={{ background: "rgba(255,255,255,0.22)", color: "white" }}>
                                    <span style={{ opacity: 0.75 }}>{s.num}</span>
                                    <span>{s.text}</span>
                                </div>
                                {i < plannerSteps.length - 1 && (
                                    <ChevronRight size={10} className="text-white opacity-60 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </Link>

            {/* 작동 방식 */}
            <div className="flex flex-wrap gap-3">
                {steps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                                style={{ background: "var(--surface-2)", color: "var(--foreground)" }}>
                                <Icon size={14} style={{ color: "var(--primary)" }} />
                                {step.text}
                            </div>
                            {i < steps.length - 1 && (
                                <ArrowRight size={14} style={{ color: "var(--foreground-muted)" }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 도구 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <Link
                            key={tool.href}
                            href={tool.href}
                            className="group edu-card p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1"
                            style={{ textDecoration: "none" }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                                    style={{ background: tool.colorLight }}>
                                    <Icon size={22} style={{ color: tool.color }} />
                                </div>
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"
                                    style={{ color: "var(--foreground-muted)" }} />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-black mb-1.5" style={{ color: "var(--foreground)" }}>
                                    {tool.title}
                                </h2>
                                <p className="text-[13px] leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                                    {tool.description}
                                </p>
                            </div>
                            <div className="mt-auto">
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                                    style={{ background: tool.colorLight, color: tool.color }}>
                                    {tool.tag}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* 하단 안내 */}
            <div className="edu-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#FFF8E7" }}>
                    <Sparkles size={18} style={{ color: "var(--highlight)" }} />
                </div>
                <div>
                    <p className="text-sm font-bold mb-1" style={{ color: "var(--foreground)" }}>
                        이미지는 GPT Image 2.0으로 만드세요
                    </p>
                    <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                        각 도구에서 생성된 프롬프트를 ChatGPT에 붙여넣으면
                        한글 텍스트가 완벽하게 포함된 고퀄리티 이미지를 만들 수 있어요.
                    </p>
                </div>
            </div>
        </div>
    );
}
