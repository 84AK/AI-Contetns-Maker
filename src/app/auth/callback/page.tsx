"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Suspense } from "react";
import BrandLoader from "@/components/common/BrandLoader";

function AuthCallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code");

        const processAuth = async () => {
            if (code) {
                await supabase.auth.exchangeCodeForSession(code);
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login?error=auth");
                return;
            }

            // 신규 OAuth 유저 프로필 자동 생성
            const { data: existing } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", session.user.id)
                .maybeSingle();

            if (!existing) {
                const meta = session.user.user_metadata;
                const fullName: string = meta?.full_name ?? meta?.name ?? session.user.email?.split("@")[0] ?? "사용자";
                const handle = fullName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + session.user.id.slice(0, 4);

                await supabase.from("profiles").insert({
                    id: session.user.id,
                    name: fullName,
                    handle,
                    avatar: meta?.avatar_url ?? "🏪",
                    plan: "free",
                });
            }

            router.push("/");
        };

        processAuth();
    }, [router, searchParams]);

    return <BrandLoader text="로그인 처리 중..." />;
}

export default function AuthCallback() {
    return (
        <Suspense fallback={<BrandLoader text="로그인 처리 중..." />}>
            <AuthCallbackInner />
        </Suspense>
    );
}
