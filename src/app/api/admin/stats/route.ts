import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
    const profile = await getAuthProfile(req);
    if (!profile || profile.plan !== "admin") {
        return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const admin = createAdminClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const [
        { count: totalUsers },
        { count: totalContents },
        { count: todayGenerations },
        { count: weekGenerations },
        { data: recentContents },
        { data: userStats },
        { data: toolStats },
    ] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("generated_contents").select("id", { count: "exact", head: true }),
        admin.from("usage_logs").select("id", { count: "exact", head: true })
            .eq("action", "generate")
            .gte("created_at", todayStart.toISOString()),
        admin.from("usage_logs").select("id", { count: "exact", head: true })
            .eq("action", "generate")
            .gte("created_at", weekStart.toISOString()),
        admin.from("generated_contents")
            .select("id, type, title, product_name, created_at, profiles(name, email)")
            .order("created_at", { ascending: false })
            .limit(20),
        admin.from("profiles")
            .select("id, name, email, plan, created_at"),
        admin.from("usage_logs")
            .select("tool")
            .eq("action", "generate"),
    ]);

    // 도구별 생성 횟수 집계
    const toolCounts: Record<string, number> = {};
    (toolStats ?? []).forEach((row: { tool: string }) => {
        toolCounts[row.tool] = (toolCounts[row.tool] ?? 0) + 1;
    });

    return NextResponse.json({
        stats: {
            totalUsers: totalUsers ?? 0,
            totalContents: totalContents ?? 0,
            todayGenerations: todayGenerations ?? 0,
            weekGenerations: weekGenerations ?? 0,
        },
        toolCounts,
        recentContents: recentContents ?? [],
        users: userStats ?? [],
    });
}
