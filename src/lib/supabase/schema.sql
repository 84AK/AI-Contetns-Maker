-- =====================================================
-- AI 콘텐츠 메이커 — Supabase Schema
-- 새 Supabase 프로젝트 생성 후 SQL Editor에서 순서대로 실행
-- =====================================================

-- 1. profiles (사용자 프로필)
create table if not exists public.profiles (
    id          uuid primary key,           -- auth.users.id와 동일
    name        text not null,
    email       text,
    plan        text default 'free',        -- 'free' | 'pro' | 'admin'
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

-- 2. teams (수업용 팀 — 선생님이 생성, 학생이 코드로 입장)
create table if not exists public.teams (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    code        text unique not null,       -- 학생 입장 코드 (예: ABC123)
    teacher_id  uuid references public.profiles(id) on delete set null,
    created_at  timestamptz default now()
);

-- 3. usage_logs (AI 생성 횟수 추적)
create table if not exists public.usage_logs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references public.profiles(id) on delete cascade,
    tool        text not null,              -- 'cardnews' | 'shorts' | 'detail-page' | 'planner'
    action      text not null default 'generate',
    created_at  timestamptz default now()
);

-- 4. generated_contents (AI 생성 결과물 — 갤러리)
create table if not exists public.generated_contents (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references public.profiles(id) on delete cascade,
    type            text not null,          -- 'cardnews' | 'shorts' | 'detail-page' | 'planner'
    title           text not null,
    product_name    text,
    content         jsonb not null,         -- 생성된 전체 결과물 (슬라이드, 스크립트 등)
    prompt_text     text,                   -- 이미지 생성용 프롬프트 (선택)
    created_at      timestamptz default now()
);

-- 5. notifications (알림함)
create table if not exists public.notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references public.profiles(id) on delete cascade,
    title       text not null,
    body        text,
    type        text default 'info',        -- 'info' | 'reward' | 'system'
    is_read     boolean default false,
    created_at  timestamptz default now()
);

-- 6. push_subscriptions (웹 푸시 알림 구독 정보)
create table if not exists public.push_subscriptions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade,
    endpoint    text unique not null,
    p256dh      text not null,
    auth        text not null,
    created_at  timestamptz default now()
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- profiles
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- teams
alter table public.teams enable row level security;
create policy "teams_select" on public.teams for select using (true);
-- insert/update/delete: service_role (선생님 API)만 가능

-- usage_logs
alter table public.usage_logs enable row level security;
create policy "usage_logs_select" on public.usage_logs for select using (auth.uid() = user_id);
-- insert: service_role만 (API 서버에서 기록)

-- generated_contents
alter table public.generated_contents enable row level security;
create policy "contents_select" on public.generated_contents for select using (auth.uid() = user_id);
create policy "contents_delete" on public.generated_contents for delete using (auth.uid() = user_id);
-- insert: service_role만 (API 서버에서 저장)

-- notifications
alter table public.notifications enable row level security;
create policy "notifications_select" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on public.notifications for update using (auth.uid() = user_id);

-- push_subscriptions
alter table public.push_subscriptions enable row level security;
create policy "push_sub_insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_sub_delete" on public.push_subscriptions for delete using (auth.uid() = user_id);
create policy "push_sub_select" on public.push_subscriptions for select using (auth.uid() = user_id);

-- =====================================================
-- 인덱스 (성능 최적화)
-- =====================================================
create index if not exists idx_usage_logs_user_date on public.usage_logs(user_id, created_at);
create index if not exists idx_generated_contents_user on public.generated_contents(user_id, created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- =====================================================
-- Auth 트리거: 회원가입 시 profiles 자동 생성
-- =====================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into public.profiles (id, name, email, plan)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        'free'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
