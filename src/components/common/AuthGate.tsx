"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Sparkles, LogIn } from "lucide-react";
import BrandLoader from "./BrandLoader";

interface Props {
    children: React.ReactNode;
    toolName?: string;
}

export default function AuthGate({ children, toolName }: Props) {
    const [status, setStatus] = useState<"loading" | "ok" | "needLogin">("loading");

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setStatus(session ? "ok" : "needLogin");
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setStatus(session ? "ok" : "needLogin");
        });
        return () => subscription.unsubscribe();
    }, []);

    if (status === "loading") return <BrandLoader text="확인 중..." />;

    if (status === "needLogin") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}>
                    <Sparkles size={28} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black mb-2" style={{ color: "var(--foreground)" }}>
                        로그인이 필요해요
                    </h2>
                    <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                        {toolName ? `${toolName}을 사용하려면` : "이 기능을 사용하려면"} 로그인해주세요.<br />
                        무료 회원도 하루 3회 생성할 수 있어요.
                    </p>
                </div>
                <Link href="/login"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg, var(--primary), #FF9A72)" }}>
                    <LogIn size={16} />
                    로그인하기
                </Link>
                <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                    Google 또는 카카오 계정으로 1초 만에 시작
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
