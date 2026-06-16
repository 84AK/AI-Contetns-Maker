import { NextRequest } from "next/server";
import { createAdminClient } from "./admin";

export type UserPlan = "free" | "pro" | "admin";

export const PLAN_DAILY_LIMIT: Record<UserPlan, number> = {
    free: 3,
    pro: 30,
    admin: Infinity,
};

interface AuthProfile {
    id: string;
    name: string;
    plan: UserPlan;
}

/** Authorization: Bearer <token> 헤더에서 유저+플랜 반환. 인증 실패 시 null. */
export async function getAuthProfile(req: NextRequest): Promise<AuthProfile | null> {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return null;

    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await admin
        .from("profiles")
        .select("id, name, plan")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) return null;

    return {
        id: profile.id,
        name: profile.name ?? "사용자",
        plan: (profile.plan as UserPlan) ?? "free",
    };
}

/** 오늘(KST 기준) generate 액션 횟수 반환 */
export async function getTodayUsage(userId: string): Promise<number> {
    const admin = createAdminClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await admin
        .from("usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", "generate")
        .gte("created_at", todayStart.toISOString());

    return count ?? 0;
}

/** 생성 가능 여부 확인. 가능하면 null, 불가능하면 에러 메시지 반환. */
export async function checkGenerateLimit(
    userId: string,
    plan: UserPlan
): Promise<{ ok: true } | { ok: false; used: number; limit: number }> {
    const limit = PLAN_DAILY_LIMIT[plan];
    if (!isFinite(limit)) return { ok: true }; // admin

    const used = await getTodayUsage(userId);
    if (used >= limit) return { ok: false, used, limit };
    return { ok: true };
}

/** 생성 완료 후 usage_log 기록 */
export async function logUsage(
    userId: string,
    tool: string,
    action: "generate" | "refine" = "generate"
): Promise<void> {
    const admin = createAdminClient();
    await admin.from("usage_logs").insert({ user_id: userId, tool, action });
}

/** 결과물 DB 저장 */
export async function saveGeneratedContent(params: {
    userId: string;
    type: "cardnews" | "detail-page" | "shorts";
    title: string;
    productName: string;
    content: Record<string, unknown>;
    promptText: string;
}): Promise<string | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("generated_contents")
        .insert({
            user_id: params.userId,
            type: params.type,
            title: params.title,
            product_name: params.productName,
            content: params.content,
            prompt_text: params.promptText,
        })
        .select("id")
        .single();

    if (error) {
        console.error("[saveGeneratedContent]", error.message);
        return null;
    }
    return data?.id ?? null;
}

/** 편집 후 콘텐츠 업데이트 */
export async function updateGeneratedContent(
    id: string,
    content: Record<string, unknown>
): Promise<boolean> {
    const admin = createAdminClient();
    const { error } = await admin
        .from("generated_contents")
        .update({ content })
        .eq("id", id);
    if (error) {
        console.error("[updateGeneratedContent]", error.message);
        return false;
    }
    return true;
}
