import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
    const profile = await getAuthProfile(req);
    if (!profile) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "cardnews";
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 10);

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("generated_contents")
        .select("id, title, created_at, content")
        .eq("user_id", profile.id)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[history API]", error.message);
        return NextResponse.json({ error: "히스토리 로드 실패" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
}
