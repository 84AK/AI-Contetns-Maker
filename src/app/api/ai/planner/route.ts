import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

const IMAGE_STYLE_PROMPTS: Record<string, string> = {
    "일러스트": "flat illustration style, soft vector art, warm pastel colors, hand-drawn friendly feeling, consistent character design",
    "실사": "realistic photography style, high-quality lifestyle photography, natural lighting, authentic and relatable",
    "플랫디자인": "flat design, minimalist, clean geometric shapes, bold solid colors, modern and simple",
    "타이포 중심": "typography-focused design, bold large text as the main visual element, creative font layout, minimal background, strong typographic hierarchy",
};

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
        const isStory = template === "story";
        const slideTypes = isStory
            ? (STORY_SLIDE_TYPES_FOR_COUNT[count] || STORY_SLIDE_TYPES_FOR_COUNT[6])
            : (SLIDE_TYPES_FOR_COUNT[count] || SLIDE_TYPES_FOR_COUNT[6]);

        const GOAL_DESC: Record<string, string> = {
            awareness: "브랜드/제품 인지도 향상 — 저장·공유 유도 중심",
            purchase: "즉각 구매 행동 유도 — 긴급성과 혜택 강조",
            follow: "팔로워·저장 확보 — 가치 있는 정보 제공",
            traffic: "링크 클릭 유도 — 스토어/블로그 방문",
        };

        const prompt = `당신은 마케팅 콘텐츠 기획 전문가이자 카피라이터입니다.
아래 5단계 기획 정보를 바탕으로 인스타그램 카드뉴스 구성안을 만들어주세요.
특히 Step 1의 리서치 컨텍스트와 핵심 문제를 충분히 반영하여,
일반적이고 판에 박힌 내용이 아닌 구체적이고 맥락 있는 카피를 작성하세요.

═══════════════════════════════════════════
[Step 1. 리서치 및 문제 정의]
═══════════════════════════════════════════
배경 자료 / 맥락:
${researchContext || "(없음 — 기본 맥락으로 작성)"}

핵심 문제:
${problemStatement || "(없음)"}

해결 방향:
${solutionDirection || "(없음)"}

═══════════════════════════════════════════
[Step 2. 콘텐츠 주제]
═══════════════════════════════════════════
콘텐츠 주제 한 문장: ${topicStatement || "(없음)"}

═══════════════════════════════════════════
[Step 3. 상세 구성]
═══════════════════════════════════════════
${businessName ? `브랜드/상호명: ${businessName}` : ""}
콘텐츠 주제/제품명: ${productName}
핵심 특징/내용: ${features || "(없음)"}
${coreContent ? `상세 내용/메시지:\n${coreContent}` : ""}
타겟 독자: ${target || "일반 SNS 사용자"}
톤앤매너: ${tone}
이미지 스타일: ${imageStyle}
콘텐츠 목적: ${GOAL_DESC[contentGoal] ?? GOAL_DESC.purchase}
슬라이드 수: ${count}장

═══════════════════════════════════════════
[슬라이드 텍스트 작성 규칙]
═══════════════════════════════════════════
- headline: 15자 이내의 강렬한 제목 (리서치 컨텍스트 기반으로 구체적으로)
- subtext: 20자 이내의 부제목
- body: 반드시 포함. 60~150자. 리서치에서 나온 구체적 사실/수치/사례를 활용. "최고의 선택!" 같은 추상적 슬로건 금지.
- imageDesc: 이 슬라이드에 들어갈 이미지 장면 설명 (한국어, 2~3문장. 화면 배치, 시각 요소, 분위기 설명)
- hashtags: CTA 슬라이드에만 5~7개

[이미지 프롬프트 작성 규칙]
gptPrompt (GPT Image 2.0용):
- 자연어 문장 형식
- "정사각형 1:1 비율, 인스타그램 카드뉴스" 명시
- 이미지 스타일: ${imageStyleDesc}
- 헤드라인 텍스트를 이미지에 직접 포함할 것
- body 내용을 시각적으로 표현하는 구체적 장면 묘사
- 배경색, 레이아웃, 텍스트 배치까지 상세하게

geminiPrompt (Nanobanana pro용):
- 키워드 나열 방식: "<피사체> <동작/상태> <장면/배경> <스타일>"
- "정사각형 1:1 비율" 명시
- 이미지 스타일: ${imageStyle === "일러스트" ? "flat illustration, vector art" : imageStyle === "실사" ? "realistic photography" : imageStyle === "플랫디자인" ? "flat design, minimalist" : "typography-focused, bold text"}
- 마지막에 "이미지 생성" 포함

[출력 형식 — 순수 JSON만, 마크다운 코드블록 없이]
{
  "title": "카드뉴스 시리즈 제목 (20자 이내)",
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

슬라이드 ${count}장 구성 (type 순서: ${slideTypes.join(" → ")}):
${isStory ? buildStorySlideGuide(slideTypes) : buildSlideGuide(contentType, slideTypes)}

${isStory ? `[썰 풀기 스토리 특별 지시]
- 독자가 자연스럽게 공감하도록 이야기 흐름을 만들어주세요
- 각 슬라이드가 "다음엔 어떻게 됐지?" 하는 궁금증을 유발해야 합니다
- 처음 1~2장에서는 제품/브랜드를 절대 언급하지 마세요 (순수 공감 유발)
- 전환점(story_turning)에서 극적인 변화의 계기를 보여주세요
- 제품 공개(story_reveal)는 자연스럽게 "그래서 찾은 게 바로..." 형식으로
- body 텍스트는 마치 친한 친구에게 이야기하듯 구어체로 작성하세요
` : ""}
중요 지시사항:
1. 모든 슬라이드 body 필드를 반드시 작성하세요 (빈 문자열 절대 금지)
2. 리서치 컨텍스트의 구체적 내용을 각 슬라이드 텍스트에 자연스럽게 녹여주세요
3. 모든 슬라이드의 이미지 스타일이 하나의 시리즈처럼 통일되어야 합니다
4. imageDesc는 한국어로, 실제 제작자가 참고할 수 있을 만큼 구체적으로 작성하세요`;

        const aiResult = await model.generateContent(prompt);
        const text = aiResult.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        const prdDocument = buildPRDDocument({
            researchContext, problemStatement, solutionDirection,
            topicStatement, businessName, productName, features, coreContent,
            target, tone, imageStyle, slideCount: count,
            title: data.title, slides: data.slides,
        });

        const copywritingPrompt = buildCopywritingPrompt({
            topicStatement, problemStatement, target, tone,
            businessName, productName, slides: data.slides,
        });

        const allPrompts = (data.slides ?? [])
            .map((s: { slideNum: number; gptPrompt?: string }) => `[${s.slideNum}장] ${s.gptPrompt ?? ""}`)
            .join("\n\n");

        await Promise.all([
            logUsage(profile.id, "cardnews", "generate"),
            saveGeneratedContent({
                userId: profile.id,
                type: "cardnews",
                title: data.title ?? productName,
                productName,
                content: { ...data, prdDocument, copywritingPrompt },
                promptText: allPrompts,
            }),
        ]);

        return NextResponse.json({ ...data, prdDocument, copywritingPrompt });

    } catch (e) {
        console.error("[planner API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}

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
    return types.map((t, i) => `${i + 1}장(${t}): ${LABEL[t] || t}`).join("\n");
}

function buildStorySlideGuide(types: string[]): string {
    const LABEL: Record<string, string> = {
        story_hook: "훅 — '나도 이랬는데' 공감 유발. 제품 언급 절대 금지. 상황 묘사만. 예: '저 솔직히 말할게요. 저도 몰랐어요.'",
        story_conflict: "갈등 — 문제 상황을 생생하게. 당시 감정과 구체적 불편함 포함. '그래서 어떻게 됐냐면...'",
        story_conflict2: "갈등 심화 — 더 구체적인 어려움. 독자가 '맞아 맞아' 하게. '이게 끝이 아니었어요.'",
        story_turning: "전환점 — '그러다 우연히...' 형식의 극적 계기. 무엇이 달라졌는지의 시작점.",
        story_resolve: "해결 — '그게 바로 이거였어요' 직전까지. 결과를 구체적 수치/변화로 보여주기.",
        story_resolve2: "해결 심화 — 달라진 일상의 구체적 묘사. 전과 후의 대비.",
        story_resolve3: "효과 확인 — 주변 반응, 추가 변화, 확신의 순간.",
        story_reveal: "제품/서비스 공개 — 자연스럽게 '그래서 제가 쓰고 있는 게 바로...' 비로소 제품 등장.",
        story_proof: "신뢰/증거 — 나만의 경험이 아님을 증명. 수치, 후기, 인증 등.",
        cta: "행동 유도(CTA) — 이야기에 공감했다면 행동하세요. 해시태그 5~7개 포함.",
    };
    return types.map((t, i) => `${i + 1}장(${t}): ${LABEL[t] || t}`).join("\n");
}

function buildPRDDocument(p: {
    researchContext?: string; problemStatement?: string; solutionDirection?: string;
    topicStatement?: string; businessName?: string; productName?: string;
    features?: string; coreContent?: string; target?: string; tone?: string;
    imageStyle?: string; slideCount?: number;
    title?: string; slides?: Array<{ slideNum: number; type: string; headline: string; body: string }>;
}): string {
    const now = new Date().toLocaleDateString("ko-KR");
    return `═══════════════════════════════════════════════
마케팅 콘텐츠 PRD 기획서
═══════════════════════════════════════════════
작성일: ${now}
콘텐츠 형식: 카드뉴스 (${p.slideCount}컷)
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
4. 슬라이드 구성 (${p.slideCount}컷)
───────────────────────────────────────────────
${(p.slides || []).map(s =>
        `[${s.slideNum}컷]\n헤드라인: ${s.headline}\n내용: ${s.body}`
    ).join("\n\n")}

═══════════════════════════════════════════════
AI 콘텐츠 메이커 | AK LABS
═══════════════════════════════════════════════`;
}

function buildCopywritingPrompt(p: {
    topicStatement?: string; problemStatement?: string; target?: string;
    tone?: string; businessName?: string; productName?: string;
    slides?: Array<{ slideNum: number; headline: string; body: string }>;
}): string {
    const slidesSummary = (p.slides || [])
        .map(s => `  ${s.slideNum}컷: [${s.headline}] ${s.body}`)
        .join("\n");

    return `아래 카드뉴스의 텍스트를 전체 수정해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 콘텐츠 기본 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주제: ${p.topicStatement || "-"}
핵심 문제: ${p.problemStatement || "-"}
대상 독자: ${p.target || "-"}
톤앤매너: ${p.tone || "-"}
${p.businessName ? `브랜드: ${p.businessName}\n` : ""}주제/제품: ${p.productName || "-"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📑 현재 슬라이드 구성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${slidesSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✏️ 수정 요청 (아래에 직접 입력하세요)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[원하는 수정 내용을 구체적으로 입력하세요]

수정 예시:
• "전체 톤을 더 유머러스하고 가볍게 바꿔줘"
• "20대 여성 타겟에 맞는 언어로 바꿔줘"
• "3컷 body에 구체적인 수치와 근거를 추가해줘"
• "CTA를 더 강렬하고 긴급하게 바꿔줘"

결과물: 각 컷별로 수정된 headline과 body를 함께 작성해주세요.`;
}
