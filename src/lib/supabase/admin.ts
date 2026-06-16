import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 서버 전용 클라이언트 - Service Role Key로 RLS 우회
// 절대 클라이언트 컴포넌트에서 import 금지

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>;
let _instance: AdminClient | null = null;

// 싱글톤 패턴: 모듈이 살아있는 동안 인스턴스 재사용 (요청마다 새 객체 생성 방지)
export function createAdminClient(): AdminClient {
    if (_instance) return _instance;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceRoleKey) {
        throw new Error("Supabase admin client: missing env vars");
    }

    _instance = createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return _instance;
}
