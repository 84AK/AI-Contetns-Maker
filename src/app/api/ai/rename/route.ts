import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(req: NextRequest) {
    const profile = await getAuthProfile(req);
    if (!profile) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

    const { id, title } = await req.json();
    if (!id || !title?.trim()) return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });

    const admin = createAdminClient();

    const { data: existing } = await admin
        .from("generated_contents")
        .select("user_id")
        .eq("id", id)
        .single();

    if (!existing || existing.user_id !== profile.id) {
        return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const { error } = await admin
        .from("generated_contents")
        .update({ title: title.trim() })
        .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
