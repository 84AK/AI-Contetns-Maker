"use client";

import { useState } from "react";
import {
    Smartphone, Monitor, Tablet, Share2, MoreVertical,
    PlusSquare, Download, Bell, CheckCircle, ChevronRight,
    ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

type DeviceTab = "iphone" | "android" | "ipad" | "pc";

const TABS: { id: DeviceTab; label: string; icon: React.ReactNode }[] = [
    { id: "iphone",  label: "아이폰",   icon: <Smartphone size={16} /> },
    { id: "android", label: "안드로이드", icon: <Smartphone size={16} /> },
    { id: "ipad",    label: "아이패드",  icon: <Tablet size={16} /> },
    { id: "pc",      label: "PC / 태블릿 PC", icon: <Monitor size={16} /> },
];

const GUIDES: Record<DeviceTab, {
    title: string;
    subtitle: string;
    warning?: string;
    steps: { icon: React.ReactNode; title: string; desc: string; image?: string }[];
}> = {
    iphone: {
        title: "아이폰에 앱 설치",
        subtitle: "Safari 브라우저에서만 설치 가능해요 (iOS 16.4 이상)",
        warning: "⚠️ 크롬, 네이버 앱 등 다른 브라우저는 설치가 지원되지 않아요.",
        steps: [
            {
                icon: <Smartphone size={20} />,
                title: "Safari로 접속",
                desc: "아이폰 기본 브라우저인 Safari를 열고 셀스타그램 주소를 입력해주세요.",
            },
            {
                icon: <Share2 size={20} />,
                title: "공유 버튼 탭",
                desc: "화면 하단 가운데의 '공유' 버튼(네모에 화살표 아이콘)을 탭해주세요.",
            },
            {
                icon: <PlusSquare size={20} />,
                title: "'홈 화면에 추가' 선택",
                desc: "아래로 스크롤해서 '홈 화면에 추가'를 탭하고, 오른쪽 상단 '추가'를 눌러주세요.",
            },
            {
                icon: <Bell size={20} />,
                title: "앱 실행 후 알림 허용",
                desc: "홈 화면 아이콘으로 앱을 실행하면 알림 허용 메시지가 나타나요. '허용'을 눌러주세요.",
            },
        ],
    },
    android: {
        title: "안드로이드에 앱 설치",
        subtitle: "크롬(Chrome) 브라우저 사용을 권장해요",
        steps: [
            {
                icon: <Smartphone size={20} />,
                title: "크롬으로 접속",
                desc: "Google Chrome을 열고 셀스타그램 주소를 입력해주세요.",
            },
            {
                icon: <MoreVertical size={20} />,
                title: "메뉴 버튼 탭",
                desc: "주소창 오른쪽 끝의 점 세 개 메뉴(⋮)를 탭해주세요.",
            },
            {
                icon: <Download size={20} />,
                title: "'앱 설치' 또는 '홈 화면에 추가' 선택",
                desc: "메뉴에서 '앱 설치' 또는 '홈 화면에 추가'를 탭해주세요. 팝업이 뜨면 '설치'를 누르면 돼요.",
            },
            {
                icon: <Bell size={20} />,
                title: "알림 허용",
                desc: "앱 설치 후 첫 실행 시 알림 허용 메시지가 나타나요. '허용'을 탭해주세요.",
            },
        ],
    },
    ipad: {
        title: "아이패드에 앱 설치",
        subtitle: "Safari 브라우저에서만 설치 가능해요 (iPadOS 16.4 이상)",
        warning: "⚠️ 아이폰과 동일하게 Safari에서만 설치할 수 있어요.",
        steps: [
            {
                icon: <Smartphone size={20} />,
                title: "Safari로 접속",
                desc: "아이패드의 Safari를 열고 셀스타그램 주소로 이동해주세요.",
            },
            {
                icon: <Share2 size={20} />,
                title: "공유 버튼 탭",
                desc: "상단 주소창 오른쪽의 '공유' 아이콘(네모에 화살표)을 탭해주세요.",
            },
            {
                icon: <PlusSquare size={20} />,
                title: "'홈 화면에 추가' 선택",
                desc: "'홈 화면에 추가'를 탭하고 오른쪽 상단 '추가'를 눌러주세요.",
            },
            {
                icon: <Bell size={20} />,
                title: "앱 실행 후 알림 허용",
                desc: "홈 화면에서 셀스타그램 아이콘으로 실행하면 알림 허용 메시지가 나타나요.",
            },
        ],
    },
    pc: {
        title: "PC / 태블릿 PC에 앱 설치",
        subtitle: "Chrome, Edge 브라우저를 사용하면 설치할 수 있어요",
        steps: [
            {
                icon: <Monitor size={20} />,
                title: "크롬 또는 엣지로 접속",
                desc: "Google Chrome 또는 Microsoft Edge를 열고 셀스타그램 주소로 이동해주세요.",
            },
            {
                icon: <Download size={20} />,
                title: "주소창의 설치 아이콘 클릭",
                desc: "주소창 오른쪽 끝에 나타나는 '설치' 아이콘(모니터+화살표)을 클릭해주세요. 안 보이면 메뉴(⋮)→ '셀스타그램 설치'를 선택하세요.",
            },
            {
                icon: <PlusSquare size={20} />,
                title: "'설치' 클릭",
                desc: "팝업창에서 '설치' 버튼을 클릭하면 바탕화면에 앱이 추가돼요.",
            },
            {
                icon: <Bell size={20} />,
                title: "알림 허용",
                desc: "앱 실행 후 알림 허용 메시지에서 '허용'을 클릭해주세요.",
            },
        ],
    },
};

export default function InstallGuidePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<DeviceTab>("iphone");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const permission = "default" as any;
    const isSubscribed = false;
    const isSupported = false;
    const isLoading = false;
    const subscribe = async () => false;
    const unsubscribe = async () => {};
    const [pushResult, setPushResult] = useState<"success" | "denied" | null>(null);
    const guide = GUIDES[activeTab];

    async function handlePushToggle() {
        if (isSubscribed) {
            await unsubscribe();
        } else {
            const ok = await subscribe();
            setPushResult(ok ? "success" : "denied");
        }
    }

    return (
        <div className="min-h-screen pb-24" style={{ background: "var(--background)" }}>
            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 border-b"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <button onClick={() => router.back()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                    style={{ background: "var(--surface-2)", color: "var(--foreground)" }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-base font-black" style={{ color: "var(--foreground)" }}>앱 설치 가이드</h1>
                    <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                        셀스타그램을 홈 화면에 추가하고 알림을 받아보세요
                    </p>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 py-6 flex flex-col gap-6">
                {/* 알림 상태 카드 */}
                <div className="rounded-2xl p-4 flex items-center gap-3"
                    style={{
                        background: isSubscribed
                            ? "linear-gradient(135deg, #06D6A015, #06D6A008)"
                            : "linear-gradient(135deg, #FF6B3515, #FF6B3508)",
                        border: `1.5px solid ${isSubscribed ? "#06D6A040" : "#FF6B3540"}`,
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: isSubscribed ? "#06D6A022" : "#FF6B3522" }}>
                        {isSubscribed
                            ? <CheckCircle size={20} style={{ color: "#06D6A0" }} />
                            : <Bell size={20} style={{ color: "#FF6B35" }} />
                        }
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>
                            {isSubscribed ? "알림 설정됨" : "알림 미설정"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                            {!isSupported
                                ? "이 브라우저/기기는 푸시 알림을 지원하지 않아요"
                                : permission === "denied"
                                    ? "브라우저 설정에서 알림을 허용해야 해요"
                                    : isSubscribed
                                        ? "미션, 공지, AI 결과 알림을 받고 있어요"
                                        : "아래 버튼을 눌러 알림을 설정해보세요"}
                        </p>
                        {pushResult === "success" && (
                            <p className="text-xs font-bold mt-1" style={{ color: "#06D6A0" }}>알림 설정 완료!</p>
                        )}
                        {pushResult === "denied" && (
                            <p className="text-xs font-bold mt-1" style={{ color: "#FF6B35" }}>
                                브라우저 설정에서 알림 권한을 허용해 주세요.
                            </p>
                        )}
                    </div>
                    {isSupported && permission !== "denied" && (
                        <button
                            onClick={handlePushToggle}
                            disabled={isLoading}
                            className="shrink-0 px-3 py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95 disabled:opacity-60"
                            style={{
                                background: isSubscribed
                                    ? "var(--surface-2)"
                                    : "linear-gradient(135deg, #FF6B35, #FF9A72)",
                                color: isSubscribed ? "var(--foreground-muted)" : "white",
                            }}>
                            {isLoading ? "..." : isSubscribed ? "해제" : "알림 켜기"}
                        </button>
                    )}
                </div>

                {/* 기기 탭 */}
                <div>
                    <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: "var(--foreground-muted)" }}>
                        기기 선택
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
                                style={{
                                    background: activeTab === tab.id
                                        ? "linear-gradient(135deg, var(--primary), #FF9A72)"
                                        : "var(--surface-2)",
                                    color: activeTab === tab.id ? "white" : "var(--foreground-soft)",
                                    border: `1.5px solid ${activeTab === tab.id ? "transparent" : "var(--border)"}`,
                                }}>
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 가이드 단계 */}
                <div className="rounded-2xl overflow-hidden"
                    style={{ border: "1.5px solid var(--border)" }}>
                    <div className="px-5 py-4 border-b" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                        <h2 className="text-base font-black" style={{ color: "var(--foreground)" }}>{guide.title}</h2>
                        <p className="text-xs mt-1" style={{ color: "var(--foreground-muted)" }}>{guide.subtitle}</p>
                        {guide.warning && (
                            <p className="text-xs mt-2 px-3 py-2 rounded-xl"
                                style={{ background: "#FFC23320", color: "#a07000" }}>
                                {guide.warning}
                            </p>
                        )}
                    </div>
                    <div className="divide-y" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                        {guide.steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-4 px-5 py-4">
                                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                        style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)", color: "white" }}>
                                        <span className="text-xs font-black">{i + 1}</span>
                                    </div>
                                </div>
                                <div className="flex-1 pb-1">
                                    <div className="flex items-center gap-2">
                                        <span style={{ color: "var(--primary)" }}>{step.icon}</span>
                                        <p className="text-sm font-black" style={{ color: "var(--foreground)" }}>
                                            {step.title}
                                        </p>
                                    </div>
                                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 알림 종류 안내 */}
                <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
                    <p className="text-sm font-black mb-3" style={{ color: "var(--foreground)" }}>받을 수 있는 알림 종류</p>
                    <div className="flex flex-col gap-2">
                        {[
                            { emoji: "🎯", title: "미션 알림",     desc: "선생님이 새 미션을 시작하면 알려드려요" },
                            { emoji: "📢", title: "공지 알림",     desc: "수업 공지, 안내 메시지를 받아요" },
                            { emoji: "🤖", title: "AI 분석 완료", desc: "AI 피드백이 준비되면 알려드려요" },
                            { emoji: "🏆", title: "순위 변동",     desc: "팀 순위가 바뀌었을 때 알려드려요" },
                        ].map((item) => (
                            <div key={item.title} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                                style={{ background: "var(--surface-2)" }}>
                                <span className="text-lg">{item.emoji}</span>
                                <div>
                                    <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{item.title}</p>
                                    <p className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* iOS 버전 안내 */}
                {(activeTab === "iphone" || activeTab === "ipad") && (
                    <div className="rounded-2xl p-4 text-xs"
                        style={{ background: "#4361EE10", border: "1.5px solid #4361EE30", color: "#4361EE" }}>
                        <p className="font-black mb-1">iOS 버전 확인 방법</p>
                        <p style={{ color: "var(--foreground-muted)" }}>
                            설정 앱 → 일반 → 소프트웨어 업데이트에서 버전을 확인하세요.
                            iOS 16.4 이상이면 푸시 알림을 사용할 수 있어요.
                            구버전은 앱 설치 후 알림이 오지 않을 수 있어요.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
