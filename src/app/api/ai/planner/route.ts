import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

const IMAGE_STYLE_PROMPTS: Record<string, string> = {
    "일러스트": "flat illustration style, soft vector art, warm pastel colors, hand-drawn friendly feeling, consistent character design",
    "실사": "realistic photography style, high-quality lifestyle photography, natural lighting, authentic and relatable",
    "플랫디자인": "flat design, minimalist, clean geometric shapes, bold solid colors, modern and simple",
    "타이포 중심": "typography-focused design, bold large text as the main visual element, creative font layout, minimal background, strong typographic hierarchy",
};

const IMAGE_STYLE_KEYWORDS: Record<string, string> = {
    "일러스트": "flat illustration, vector art",
    "실사": "realistic photography",
    "플랫디자인": "flat design, minimalist",
    "타이포 중심": "typography-focused, bold text",
};

// ── 슬라이드 타입 (카드뉴스 / 썰 풀기)
const SLIDE_TYPES_FOR_COUNT: Record<number, string[]> = {
    4: ["cover", "problem", "solution", "cta"],
    5: ["cover", "problem", "solution", "feature1", "cta"],
    6: ["cover", "problem", "solution", "feature1", "feature2", "cta"],
    8: ["cover", "problem", "solution", "feature1", "feature2", "feature3", "review", "cta"],
    10: ["cover", "problem", "solution", "feature1", "feature2", "feature3", "review", "comparison", "howto", "cta"],
};

const STORY_SLIDE_TYPES_FOR_COUNT: Record<number, string[]> = {
    4: ["story_hook", "story_conflict", "story_resolve", "cta"],
    5: ["story_hook", "story_conflict", "story_turning", "story_resolve", "cta"],
    6: ["story_hook", "story_conflict", "story_turning", "story_resolve", "story_reveal", "cta"],
    8: ["story_hook", "story_conflict", "story_conflict2", "story_turning", "story_resolve", "story_resolve2", "story_reveal", "cta"],
    10: ["story_hook", "story_conflict", "story_conflict2", "story_turning", "story_resolve", "story_resolve2", "story_resolve3", "story_reveal", "story_proof", "cta"],
};

// ── 쇼츠 장면 타입 (60초 5장면 고정)
const SHORTS_SCENE_TYPES: string[] = [
    "scene_hook", "scene_problem", "scene_solution", "scene_demo", "scene_cta",
];

// ── 상세페이지 섹션 타입
const DETAIL_PAGE_SECTION_TYPES: string[] = [
    "dp_hero", "dp_pain", "dp_solution", "dp_feature1", "dp_feature2", "dp_review", "dp_cta",
];

export async function POST(req: NextRequest) {
    try {
        const profile = await getAuthProfile(req);
        if (!profile) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

        const limitCheck = await checkGenerateLimit(profile.id, profile.plan);
        if (!limitCheck.ok) {
            return NextResponse.json({
                error: `오늘 생성 횟수를 모두 사용했어요. (${limitCheck.used}/${limitCheck.limit}회)`,
                limitExceeded: true,
                used: limitCheck.used,
                limit: limitCheck.limit,
            }, { status: 429 });
        }

        const body = await req.json();
        const {
            researchContext = "",
            problemStatement = "",
            solutionDirection = "",
            topicStatement = "",
            template = "cardnews",
            contentType = "promotion",
            businessName = "",
            productName = "",
            features = "",
            coreContent = "",
            target = "",
            tone = "친근하고 감성적",
            imageStyle = "일러스트",
            slideCount = "6",
            contentGoal = "purchase",
        } = body;

        if (!productName) return NextResponse.json({ error: "필수 항목이 누락되었어요." }, { status: 400 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI 키 미설정" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const count = parseInt(slideCount) || 6;
        const imageStyleDesc = IMAGE_STYLE_PROMPTS[imageStyle] || IMAGE_STYLE_PROMPTS["일러스트"];
        const imageStyleKey = IMAGE_STYLE_KEYWORDS[imageStyle] || IMAGE_STYLE_KEYWORDS["일러스트"];

        const GOAL_DESC: Record<string, string> = {
            awareness: "브랜드/제품 인지도 향상 — 저장·공유 유도 중심",
            purchase: "즉각 구매 행동 유도 — 긴급성과 혜택 강조",
            follow: "팔로워·저장 확보 — 가치 있는 정보 제공",
            traffic: "링크 클릭 유도 — 스토어/블로그 방문",
        };

        const baseContext = `
[리서치 & 문제 정의]
배경 자료: ${researchContext || "(없음)"}
핵심 문제: ${problemStatement || "(없음)"}
해결 방향: ${solutionDirection || "(없음)"}

[콘텐츠 주제]
${topicStatement || "(없음)"}

[기본 정보]
${businessName ? `브랜드: ${businessName}` : ""}
주제/제품: ${productName}
핵심 특징: ${features || "(없음)"}
${coreContent ? `상세 내용:\n${coreContent}` : ""}
타겟: ${target || "일반 SNS 사용자"}
톤앤매너: ${tone}
이미지 스타일: ${imageStyle}
콘텐츠 목적: ${GOAL_DESC[contentGoal] ?? GOAL_DESC.purchase}`;

        // ── 템플릿별 프롬프트 분기
        let prompt: string;
        let slideTypes: string[];

        if (template === "shorts") {
            slideTypes = SHORTS_SCENE_TYPES;
            prompt = buildShortsPrompt({ baseContext, imageStyleDesc, imageStyleKey });
        } else if (template === "detail-page") {
            slideTypes = DETAIL_PAGE_SECTION_TYPES;
            prompt = buildDetailPagePrompt({ baseContext, imageStyleDesc, imageStyleKey });
        } else {
            const isStory = template === "story";
            slideTypes = isStory
                ? (STORY_SLIDE_TYPES_FOR_COUNT[count] || STORY_SLIDE_TYPES_FOR_COUNT[6])
                : (SLIDE_TYPES_FOR_COUNT[count] || SLIDE_TYPES_FOR_COUNT[6]);
            prompt = buildCardnewsPrompt({
                baseContext, imageStyleDesc, imageStyleKey, imageStyle,
                count, slideTypes, isStory, contentType,
            });
        }

        const aiResult = await model.generateContent(prompt);
        const text = aiResult.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        const prdDocument = buildPRDDocument({
            template,
            researchContext, problemStatement, solutionDirection,
            topicStatement, businessName, productName, features, coreContent,
            target, tone, imageStyle, slideCount: count,
            title: data.title, slides: data.slides,
        });

        const copywritingPrompt = buildCopywritingPrompt({
            template, topicStatement, problemStatement, target, tone,
            businessName, productName, slides: data.slides,
        });

        const allPrompts = (data.slides ?? [])
            .map((s: { slideNum: number; gptPrompt?: string }) => `[${s.slideNum}장] ${s.gptPrompt ?? ""}`)
            .join("\n\n");

        await logUsage(profile.id, "cardnews", "generate");
        const savedId = await saveGeneratedContent({
            userId: profile.id,
            type: "cardnews",
            title: data.title ?? productName,
            productName,
            content: { ...data, template, prdDocument, copywritingPrompt },
            promptText: allPrompts,
        });

        return NextResponse.json({ ...data, template, prdDocument, copywritingPrompt, _savedId: savedId });

    } catch (e) {
        console.error("[planner API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}

// ── 카드뉴스 / 썰 풀기 프롬프트 ──────────────────────────────────────────
function buildCardnewsPrompt(p: {
    baseContext: string; imageStyleDesc: string; imageStyleKey: string; imageStyle: string;
    count: number; slideTypes: string[]; isStory: boolean; contentType: string;
}): string {
    return `당신은 마케팅 콘텐츠 기획 전문가이자 카피라이터입니다.
아래 기획 정보를 바탕으로 인스타그램 ${p.isStory ? "스토리형 SNS 포스트" : "카드뉴스"} 구성안을 만들어주세요.
리서치 컨텍스트와 핵심 문제를 충분히 반영하여 구체적이고 맥락 있는 카피를 작성하세요.

${p.baseContext}

슬라이드 수: ${p.count}장

═══════════════════════════════════════════
[슬라이드 텍스트 작성 규칙]
═══════════════════════════════════════════
- headline: 15자 이내의 강렬한 제목 (리서치 기반으로 구체적으로)
- subtext: 20자 이내의 부제목
- body: 반드시 포함. 60~150자. 구체적 사실/수치/사례 활용. "최고의 선택!" 같은 추상적 슬로건 금지.
- imageDesc: 이 슬라이드에 들어갈 이미지 장면 설명 (한국어, 2~3문장)
- hashtags: CTA 슬라이드에만 5~7개

[이미지 프롬프트 작성 규칙]
gptPrompt (GPT Image 2.0용):
- 자연어 문장 형식, "정사각형 1:1 비율, 인스타그램 카드뉴스" 명시
- 이미지 스타일: ${p.imageStyleDesc}
- 헤드라인 텍스트를 이미지에 직접 포함할 것
- body 내용을 시각적으로 표현하는 구체적 장면 묘사

geminiPrompt (Nanobanana pro용):
- 키워드 나열 방식: "<피사체> <동작/상태> <장면/배경> <스타일>"
- "정사각형 1:1 비율" 명시
- 이미지 스타일: ${p.imageStyleKey}
- 마지막에 "이미지 생성" 포함

[출력 형식 — 순수 JSON만, 마크다운 코드블록 없이]
{
  "title": "시리즈 제목 (20자 이내)",
  "styleGuide": "공통 시각 스타일 한 줄 요약 (폰트, 색상, 분위기)",
  "slides": [
    {
      "slideNum": 1,
      "type": "cover",
      "headline": "헤드라인 (15자 이내)",
      "subtext": "부제목 (20자 이내)",
      "body": "본문 (60~150자, 구체적 내용)",
      "imageDesc": "스토리보드용 이미지 설명 (한국어 2~3문장)",
      "gptPrompt": "...",
      "geminiPrompt": "..."
    }
  ]
}

슬라이드 ${p.count}장 구성 (type 순서: ${p.slideTypes.join(" → ")}):
${p.isStory ? buildStorySlideGuide(p.slideTypes) : buildSlideGuide(p.contentType, p.slideTypes)}

${p.isStory ? `[썰 풀기 스토리 특별 지시]
- 독자가 자연스럽게 공감하도록 이야기 흐름을 만들어주세요
- 각 슬라이드가 "다음엔 어떻게 됐지?" 하는 궁금증을 유발해야 합니다
- 처음 1~2장에서는 제품/브랜드를 절대 언급하지 마세요 (순수 공감 유발)
- 전환점(story_turning)에서 극적인 변화의 계기를 보여주세요
- 제품 공개(story_reveal)는 자연스럽게 "그래서 찾은 게 바로..." 형식으로
- body 텍스트는 마치 친한 친구에게 이야기하듯 구어체로 작성하세요
` : ""}
중요 지시사항:
1. 모든 슬라이드 body 필드를 반드시 작성하세요 (빈 문자열 절대 금지)
2. 리서치 컨텍스트의 구체적 내용을 각 슬라이드에 자연스럽게 녹여주세요
3. 모든 슬라이드의 이미지 스타일이 하나의 시리즈처럼 통일되어야 합니다
4. imageDesc는 한국어로, 실제 제작자가 참고할 수 있을 만큼 구체적으로 작성하세요`;
}

// ── 쇼츠 영상 프롬프트 ──────────────────────────────────────────────────
function buildShortsPrompt(p: {
    baseContext: string; imageStyleDesc: string; imageStyleKey: string;
}): string {
    return `당신은 SNS 숏폼 영상 감독이자 마케팅 콘텐츠 기획 전문가입니다.
아래 기획 정보를 바탕으로 60초 쇼츠/릴스 영상 스크립트와 비주얼 스토리보드를 만들어주세요.

${p.baseContext}

═══════════════════════════════════════════
[영상 구성 — 60초 5장면 고정]
═══════════════════════════════════════════
1장면(scene_hook, 0:00-0:08): 시선 강탈 — 첫 3초 안에 스크롤을 멈추게 하라. 질문·충격·공감 중 하나.
2장면(scene_problem, 0:08-0:20): 문제 공감 — 타겟의 실제 고민/불편을 생생하게. 제품 언급 X.
3장면(scene_solution, 0:20-0:40): 해결책 등장 — 제품/서비스가 어떻게 해결하는지. 핵심 메시지.
4장면(scene_demo, 0:40-0:55): 시연/효과 — 실제 사용 장면, 전후 비교, 구체적 수치/변화.
5장면(scene_cta, 0:55-1:00): 행동 유도 — 짧고 강하게. "저장하고 나중에 써봐요" 등.

[각 장면 필드 작성 규칙]
- headline: 장면 제목 (10자 이내, 영상 편집 시 오버레이 텍스트)
- body: 대사/나레이션 자막 (30~60자, 실제 자막으로 표시할 한국어 텍스트)
- duration: 타임코드 (위 구성 참고, 예: "0:00-0:08")
- action: 화면에서 일어나는 동작 설명 (한국어, 1~2문장. 촬영/편집 가이드)
- camera: 카메라 앵글/무브먼트 (예: "클로즈업 → 풀샷", "핸드헬드 슬로우 줌인")
- imageDesc: 이 장면의 스틸 이미지 설명 (한국어, 2~3문장. 인물/제품/배경/조명)
- gptPrompt: GPT Image 2.0용 장면 스틸 이미지 프롬프트 (영문, 9:16 세로 비율, ${p.imageStyleDesc})
- geminiPrompt: Gemini/Nanobanana용 키워드형 프롬프트 (영문, 9:16 세로, ${p.imageStyleKey}, "이미지 생성" 마지막)

[최상위 필드]
subjectDesignSheet:
- 주인공(제품/인물)의 종합 레퍼런스 디자인 시트 프롬프트 (GPT Image 2.0용, 영문)
- 정사각형 1:1 비율 레이아웃 구성
- 포함: 전면/측면/3/4각도 뷰, 클로즈업 디테일, 색상 팔레트 스와치, 사용 맥락 장면
- 스타일: ${p.imageStyleDesc}
- 이 시트 이미지를 생성 후, 각 장면 gptPrompt 사용 시 레퍼런스로 업로드
- 500자 이상 상세하게 작성

fullVideoPrompt:
- Sora/Kling/Runway용 전체 영상 생성 프롬프트 (영문)
- 섹션: SUBJECTS, ENVIRONMENT, STYLE, AUDIO, CAMERA, TIMELINE(장면별 타임코드+SFX)
- 장면 간 인물/제품 외형 일관성 유지 지시 반드시 포함
- 500자 이상 상세하게 작성

[출력 형식 — 순수 JSON만, 마크다운 코드블록 없이]
{
  "title": "영상 시리즈 제목 (20자 이내)",
  "styleGuide": "영상 전체 비주얼 스타일 한 줄 요약",
  "subjectDesignSheet": "주인공/제품 디자인 시트 프롬프트 (영문 500자 이상)",
  "fullVideoPrompt": "전체 영상 프롬프트 Sora/Kling/Runway용 (영문 500자 이상, 타임라인 포함)",
  "slides": [
    {
      "slideNum": 1,
      "type": "scene_hook",
      "headline": "장면 제목 (10자 이내)",
      "body": "대사/나레이션 자막 (30~60자, 한국어)",
      "duration": "0:00-0:08",
      "action": "화면 동작 설명 (한국어, 1~2문장)",
      "camera": "카메라 방향 (예: 클로즈업 → 풀샷)",
      "imageDesc": "장면 이미지 설명 (한국어 2~3문장)",
      "gptPrompt": "GPT Image 2.0 프롬프트 (영문, 9:16 세로)",
      "geminiPrompt": "Gemini 키워드형 (영문, 9:16 세로, 이미지 생성)"
    }
  ]
}

5개 장면을 순서대로 모두 작성하세요.

중요 지시사항:
1. 장면 전환이 자연스럽게 이어지는 하나의 스토리여야 합니다
2. scene_hook에서는 첫 프레임부터 강렬한 비주얼로 시작하세요
3. 모든 장면의 비주얼 스타일이 통일되어야 합니다 (같은 인물/제품/색감)
4. gptPrompt는 "Use the uploaded subject design sheet as visual reference." 문장으로 시작하세요
5. 대사/나레이션 body는 실제로 말할 수 있는 자연스러운 한국어 구어체로 작성하세요`;
}

// ── 상세페이지 프롬프트 ────────────────────────────────────────────────
function buildDetailPagePrompt(p: {
    baseContext: string; imageStyleDesc: string; imageStyleKey: string;
}): string {
    return `당신은 이커머스 상세페이지 기획 전문가이자 세일즈 카피라이터입니다.
아래 기획 정보를 바탕으로 스마트스토어/자사몰용 상세페이지 구성안을 만들어주세요.
구매 전환율을 높이는 설득력 있는 카피와 비주얼 섹션을 제안하세요.

${p.baseContext}

═══════════════════════════════════════════
[상세페이지 7섹션 구성]
═══════════════════════════════════════════
1섹션(dp_hero): 히어로 배너 — 3초 안에 핵심 가치 전달. 강렬한 비주얼 + 후킹 헤드라인.
2섹션(dp_pain): 고객 고충 공감 — 구매 전 고민/불만을 정확히 짚어주기. "혹시 이런 고민 있으세요?"
3섹션(dp_solution): 해결책 제시 — 이 제품이 어떻게 해결하는지. "그래서 이 제품이 필요한 이유".
4섹션(dp_feature1): 핵심 특징 1 — 가장 차별화된 특징. 수치/인증/비교로 신뢰 구축.
5섹션(dp_feature2): 핵심 특징 2 — 두 번째 특징. 앞 섹션과 다른 각도의 장점.
6섹션(dp_review): 후기/신뢰 증명 — 실제 후기 느낌, 수치, 수상/인증 등.
7섹션(dp_cta): 최종 CTA — 구매 결정 유도. 혜택 요약 + 긴급성 + 가격 저항 해소.

[각 섹션 필드 작성 규칙]
- headline: 섹션 핵심 헤드라인 (20자 이내)
- subtext: 서브 헤드라인 (30자 이내, 선택)
- body: 섹션 본문 (80~200자. 구체적 수치/사례/근거 포함. "최고!" 같은 추상 표현 금지)
- imageDesc: 이 섹션 배너/이미지 설명 (한국어, 2~3문장. 가로 배너 위주)
- gptPrompt: GPT Image 2.0용 섹션 이미지 프롬프트 (영문, ${p.imageStyleDesc}, 16:9 가로 비율 명시)
- geminiPrompt: Gemini용 키워드형 (영문, 16:9 가로, ${p.imageStyleKey}, "이미지 생성" 마지막)

[출력 형식 — 순수 JSON만, 마크다운 코드블록 없이]
{
  "title": "상세페이지 타이틀 (20자 이내)",
  "styleGuide": "상세페이지 전체 시각 스타일 한 줄 요약",
  "slides": [
    {
      "slideNum": 1,
      "type": "dp_hero",
      "headline": "히어로 헤드라인 (20자 이내)",
      "subtext": "서브 헤드라인 (30자 이내)",
      "body": "본문 (80~200자)",
      "imageDesc": "섹션 이미지 설명 (한국어 2~3문장)",
      "gptPrompt": "...",
      "geminiPrompt": "..."
    }
  ]
}

7개 섹션을 순서대로 모두 작성하세요.

중요 지시사항:
1. 모든 섹션의 body를 빈 문자열 없이 반드시 작성하세요
2. 전체 섹션이 하나의 일관된 세일즈 내러티브를 형성해야 합니다
3. dp_pain에서 공감한 문제가 dp_solution에서 해결되는 흐름이어야 합니다
4. 모든 이미지 스타일이 브랜드 일관성을 유지해야 합니다`;
}

// ── 카드뉴스 슬라이드 가이드 ────────────────────────────────────────────
function buildSlideGuide(contentType: string, types: string[]): string {
    const LABEL: Record<string, string> = {
        cover: "표지 — 핵심 문제/혜택을 담은 강렬한 헤드라인으로 스크롤을 멈추게 하세요",
        problem: "공감 — 타겟 독자가 실제로 겪는 고민/불편을 생생하게 묘사하세요",
        solution: "해결책 — 이 콘텐츠/제품/정보가 어떻게 해결하는지 명확하게 제시하세요",
        feature1: "핵심 포인트 1 — 가장 중요한 특징/정보를 구체적 수치/사례로 설명",
        feature2: "핵심 포인트 2 — 두 번째 특징/정보, 앞 슬라이드와 차별화",
        feature3: "핵심 포인트 3 — 세 번째 특징/정보, 신뢰도 높이는 내용",
        review: "후기/사례 — 실제 사용 경험이나 성과를 자연스럽게",
        comparison: "비교/차별화 — 기존 방법 대비 이 콘텐츠/제품의 우위",
        howto: "사용법/시작 방법 — 구체적인 실행 단계",
        cta: "행동 유도(CTA) — 저장, 공유, 구매, 댓글 등 행동 유도 + 해시태그 5~7개",
    };
    void contentType;
    return types.map((t, i) => `${i + 1}장(${t}): ${LABEL[t] || t}`).join("\n");
}

function buildStorySlideGuide(types: string[]): string {
    const LABEL: Record<string, string> = {
        story_hook: "훅 — '나도 이랬는데' 공감 유발. 제품 언급 절대 금지. 상황 묘사만.",
        story_conflict: "갈등 — 문제 상황을 생생하게. 당시 감정과 구체적 불편함 포함.",
        story_conflict2: "갈등 심화 — 더 구체적인 어려움. 독자가 '맞아 맞아' 하게.",
        story_turning: "전환점 — '그러다 우연히...' 형식의 극적 계기.",
        story_resolve: "해결 — '그게 바로 이거였어요' 직전까지. 결과를 구체적 수치/변화로.",
        story_resolve2: "해결 심화 — 달라진 일상의 구체적 묘사. 전과 후의 대비.",
        story_resolve3: "효과 확인 — 주변 반응, 추가 변화, 확신의 순간.",
        story_reveal: "제품/서비스 공개 — 자연스럽게 '그래서 제가 쓰고 있는 게 바로...' 비로소 제품 등장.",
        story_proof: "신뢰/증거 — 나만의 경험이 아님을 증명. 수치, 후기, 인증 등.",
        cta: "행동 유도(CTA) — 이야기에 공감했다면 행동하세요. 해시태그 5~7개 포함.",
    };
    return types.map((t, i) => `${i + 1}장(${t}): ${LABEL[t] || t}`).join("\n");
}

// ── PRD 문서 ──────────────────────────────────────────────────────────
function buildPRDDocument(p: {
    template?: string;
    researchContext?: string; problemStatement?: string; solutionDirection?: string;
    topicStatement?: string; businessName?: string; productName?: string;
    features?: string; coreContent?: string; target?: string; tone?: string;
    imageStyle?: string; slideCount?: number;
    title?: string; slides?: Array<{ slideNum: number; type: string; headline: string; body: string }>;
}): string {
    const now = new Date().toLocaleDateString("ko-KR");
    const templateLabel = p.template === "shorts" ? `쇼츠/릴스 영상 스크립트 (5장면)`
        : p.template === "story" ? `썰 풀기 스토리 (${p.slideCount}컷)`
        : p.template === "detail-page" ? `스마트스토어 상세페이지 (7섹션)`
        : `카드뉴스 (${p.slideCount}컷)`;

    const sectionLabel = p.template === "shorts" ? "영상 장면 구성"
        : p.template === "detail-page" ? "섹션 구성"
        : "슬라이드 구성";

    return `═══════════════════════════════════════════════
마케팅 콘텐츠 PRD 기획서
═══════════════════════════════════════════════
작성일: ${now}
콘텐츠 형식: ${templateLabel}
타이틀: ${p.title || "-"}

───────────────────────────────────────────────
1. 리서치 & 문제 정의
───────────────────────────────────────────────
[배경 / 맥락]
${p.researchContext || "-"}

[핵심 문제]
${p.problemStatement || "-"}

[해결 방향]
${p.solutionDirection || "-"}

───────────────────────────────────────────────
2. 콘텐츠 주제
───────────────────────────────────────────────
${p.topicStatement || "-"}

───────────────────────────────────────────────
3. 기획 상세
───────────────────────────────────────────────
${p.businessName ? `• 브랜드: ${p.businessName}\n` : ""}• 주제/제품: ${p.productName || "-"}
• 핵심 내용: ${p.features || "-"}
${p.coreContent ? `• 상세 메시지:\n  ${p.coreContent.replace(/\n/g, "\n  ")}` : ""}

• 타겟 독자: ${p.target || "-"}
• 톤앤매너: ${p.tone || "-"}
• 이미지 스타일: ${p.imageStyle || "-"}

───────────────────────────────────────────────
4. ${sectionLabel}
───────────────────────────────────────────────
${(p.slides || []).map(s =>
        `[${s.slideNum}]\n헤드라인: ${s.headline}\n내용: ${s.body}`
    ).join("\n\n")}

═══════════════════════════════════════════════
AI 콘텐츠 메이커 | AK LABS
═══════════════════════════════════════════════`;
}

// ── 카피라이팅 수정 프롬프트 ────────────────────────────────────────────
function buildCopywritingPrompt(p: {
    template?: string;
    topicStatement?: string; problemStatement?: string; target?: string;
    tone?: string; businessName?: string; productName?: string;
    slides?: Array<{ slideNum: number; headline: string; body: string }>;
}): string {
    const unitLabel = p.template === "shorts" ? "장면" : p.template === "detail-page" ? "섹션" : "컷";
    const slidesSummary = (p.slides || [])
        .map(s => `  ${s.slideNum}${unitLabel}: [${s.headline}] ${s.body}`)
        .join("\n");

    const contentTypeLabel = p.template === "shorts" ? "쇼츠 영상 스크립트"
        : p.template === "story" ? "스토리형 SNS 포스트"
        : p.template === "detail-page" ? "상세페이지"
        : "카드뉴스";

    return `아래 ${contentTypeLabel}의 텍스트를 전체 수정해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 콘텐츠 기본 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주제: ${p.topicStatement || "-"}
핵심 문제: ${p.problemStatement || "-"}
대상 독자: ${p.target || "-"}
톤앤매너: ${p.tone || "-"}
${p.businessName ? `브랜드: ${p.businessName}\n` : ""}주제/제품: ${p.productName || "-"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📑 현재 구성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${slidesSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✏️ 수정 요청 (아래에 직접 입력하세요)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[원하는 수정 내용을 구체적으로 입력하세요]

수정 예시:
• "전체 톤을 더 유머러스하고 가볍게 바꿔줘"
• "20대 여성 타겟에 맞는 언어로 바꿔줘"
• "구체적인 수치와 근거를 추가해줘"
• "CTA를 더 강렬하고 긴급하게 바꿔줘"

결과물: 각 ${unitLabel}별로 수정된 headline과 body를 함께 작성해주세요.`;
}
