import { NextRequest, NextResponse } from "next/server";
import { getAuthProfile, getTodayUsage, PLAN_DAILY_LIMIT } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    const profile = await getAuthProfile(req);
    if (!profile) {
        return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
    }

    const used = await getTodayUsage(profile.id);
    const limit = PLAN_DAILY_LIMIT[profile.plan];
    const remaining = isFinite(limit) ? Math.max(0, limit - used) : Infinity;

    return NextResponse.json({
        used,
        limit: isFinite(limit) ? limit : null,
        remaining: isFinite(remaining) ? remaining : null,
        plan: profile.plan,
        canGenerate: isFinite(limit) ? used < limit : true,
    });
}
