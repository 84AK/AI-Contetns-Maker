"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Sparkles, Layers, FileText, Film } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [loadingProvider, setLoadingProvider] = useState<"google" | "kakao" | null>(null);

    useEffect(() => {
        // 이미 로그인된 경우 홈으로
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace("/");
        });
    }, [router]);

    const handleOAuth = async (provider: "google" | "kakao") => {
        setLoadingProvider(provider);
        await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: "var(--background)" }}>
            <div className="w-full max-w-sm space-y-6">
                {/* 로고 */}
                <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}>
                        <Sparkles size={26} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black" style={{ color: "var(--foreground)" }}>AI 콘텐츠 메이커</h1>
                        <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                            마케팅 콘텐츠를 AI로 3분 만에
                        </p>
                    </div>
                </div>

                {/* 기능 미리보기 */}
                <div className="space-y-2">
                    {[
                        { icon: Layers, label: "카드뉴스 생성기", desc: "슬라이드 구성 + 카피 + 이미지 프롬프트" },
                        { icon: FileText, label: "상세페이지 빌더", desc: "섹션별 카피 + GPT 이미지 프롬프트" },
                        { icon: Film, label: "쇼츠 스크립트", desc: "장면별 대사 + 자막 + 촬영 팁" },
                    ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ background: "var(--surface-2)" }}>
                            <Icon size={16} style={{ color: "var(--primary)" }} />
                            <div>
                                <p className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{label}</p>
                                <p className="text-[11px]" style={{ color: "var(--foreground-muted)" }}>{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 무료 한도 안내 */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "var(--primary-light)" }}>
                    <span className="text-xl">🎁</span>
                    <p className="text-xs" style={{ color: "var(--primary)" }}>
                        <span className="font-black">무료 회원: 하루 3회 생성</span><br />
                        수정 요청은 횟수 제한 없이 무제한이에요.
                    </p>
                </div>

                {/* 로그인 버튼 */}
                <div className="space-y-3">
                    <button
                        onClick={() => handleOAuth("google")}
                        disabled={loadingProvider !== null}
                        className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] disabled:opacity-70"
                        style={{ background: "white", color: "#3C4043", border: "1.5px solid #E5E7EB", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    >
                        {loadingProvider === "google" ? (
                            <span className="flex items-center gap-2"><Sparkles size={16} className="animate-spin" />연결 중...</span>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google로 계속하기
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => handleOAuth("kakao")}
                        disabled={loadingProvider !== null}
                        className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] disabled:opacity-70"
                        style={{ background: "#FEE500", color: "#3C1E1E" }}
                    >
                        {loadingProvider === "kakao" ? (
                            <span className="flex items-center gap-2"><Sparkles size={16} className="animate-spin" />연결 중...</span>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E">
                                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.82 1.69 5.3 4.27 6.79L5.2 21l4.07-2.14c.88.2 1.79.3 2.73.3 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
                                </svg>
                                카카오로 계속하기
                            </>
                        )}
                    </button>
                </div>

                <p className="text-center text-xs" style={{ color: "var(--foreground-muted)" }}>
                    로그인하면 생성 기록이 저장되고<br />어떤 기기에서도 확인할 수 있어요.
                </p>
            </div>
        </div>
    );
}
