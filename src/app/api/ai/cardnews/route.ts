import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

const GOAL_DESC: Record<string, string> = {
    awareness: "브랜드/제품 인지도 향상 — 저장·공유 유도 중심",
    purchase: "즉각 구매 행동 유도 — 긴급성과 혜택 강조",
    follow: "팔로워·저장 확보 — 가치 있는 정보 제공 중심",
    traffic: "링크 클릭 유도 — 스토어/블로그 방문 유도 중심",
};

const TYPE_ROLE: Record<string, string> = {
    promotion: "소상공인을 위한 SNS 마케팅 + 이미지 생성 프롬프트 전문가입니다. 제품·서비스를 매력적으로 홍보하는 카드뉴스를 만듭니다.",
    education: "교육 콘텐츠 SNS 카드뉴스 전문가입니다. 수업·강의 내용을 흥미롭게 소개하고 학습 동기를 높이는 카드뉴스를 만듭니다.",
    tutorial: "앱·서비스 사용법을 SNS 카드뉴스로 쉽게 설명하는 전문가입니다. 단계별로 명확하고 따라하기 쉽게 안내하는 카드뉴스를 만듭니다.",
    info: "정보·지식을 SNS 카드뉴스로 전달하는 전문가입니다. 핵심 내용을 쉽고 인상적으로 전달하는 카드뉴스를 만듭니다.",
};

export async function POST(req: NextRequest) {
    try {
        const profile = await getAuthProfile(req);
        if (!profile) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

        const limitCheck = await checkGenerateLimit(profile.id, profile.plan);
        if (!limitCheck.ok) {
            return NextResponse.json({
                error: `오늘 생성 횟수를 모두 사용했어요. (${limitCheck.used}/${limitCheck.limit}회)\n내일 다시 이용하거나 유료 플랜으로 업그레이드하세요.`,
                limitExceeded: true,
                used: limitCheck.used,
                limit: limitCheck.limit,
            }, { status: 429 });
        }

        const {
            contentType = "promotion",
            businessName, productName, features, coreContent, target, tone,
            excludeWords, referenceStyle, contentGoal, slideCount,
        } = await req.json();

        if (!productName) {
            return NextResponse.json({ error: "필수 항목이 누락되었어요." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI 키 미설정" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const count = parseInt(slideCount) || 6;
        const role = TYPE_ROLE[contentType] ?? TYPE_ROLE.promotion;

        const inputSection = buildInputSection({ contentType, businessName, productName, features, coreContent, target, tone, contentGoal, referenceStyle, excludeWords, count });

        const prompt = `당신은 ${role}
아래 정보를 바탕으로 인스타그램 카드뉴스 구성안과 슬라이드별 이미지 생성 프롬프트를 만들어주세요.

${inputSection}

[슬라이드 텍스트 작성 규칙]
- headline: 15자 이내의 강렬한 제목
- subtext: 20자 이내의 부제목 또는 보조 문구
- body: 반드시 포함. 40~120자의 본문 설명 텍스트. 해당 슬라이드의 핵심 내용을 구체적으로 서술. 단순 슬로건이 아닌 실제 정보나 설명을 담을 것.
- hashtags: CTA 슬라이드에만 3~5개 포함

[이미지 프롬프트 작성 규칙]
1. gptPrompt (GPT Image 2.0용):
   - 자연어 문장 형식으로 서술
   - "정사각형 1:1 비율 인스타그램 카드뉴스" 명시
   - 배경색/레이아웃/폰트/텍스트 위치를 구체적으로 설명
   - headline과 subtext 텍스트를 이미지에 직접 포함
   - body 내용을 시각적으로 표현하는 일러스트/아이콘/사진 요소 포함
   - 공통 스타일 가이드와 일관성 유지

2. geminiPrompt (Nanobanana pro용):
   - 구조형 키워드 나열 방식: "<피사체> <동작/상태> <장면/배경> <스타일>"
   - 마지막에 반드시 "이미지 생성" 포함
   - "정사각형 1:1 비율" 명시
   - 텍스트 삽입이 필요하면 명시
   - 분위기/색감/조명 키워드를 콤마로 구분

[출력 형식 - 순수 JSON만, 마크다운 없이]
{
  "title": "카드뉴스 시리즈 제목 (20자 이내)",
  "styleGuide": "모든 슬라이드에 공통 적용할 시각 스타일 한 줄 요약",
  "slides": [
    {
      "slideNum": 1,
      "type": "cover",
      "headline": "헤드라인 (15자 이내)",
      "subtext": "부제목 (20자 이내)",
      "body": "본문 설명 텍스트 (40~120자, 반드시 작성)",
      "gptPrompt": "...",
      "geminiPrompt": "..."
    }
  ]
}

슬라이드 구성 (${count}장):
${generateSlideGuide(contentType, count)}

중요:
1. 모든 슬라이드에 body 필드를 반드시 작성하세요. 빈 문자열 금지.
2. body는 단순 슬로건("최고의 선택!")이 아닌 실제 내용("3단계로 구성된 실습 중심 수업으로, 기초 개념부터 실전 활용까지 단계적으로 배웁니다.")이어야 합니다.
3. 모든 슬라이드의 이미지 스타일이 하나의 시리즈처럼 일관되어야 합니다.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        const allPrompts = (data.slides ?? [])
            .map((s: { slideNum: number; gptPrompt?: string }) => `[${s.slideNum}장] ${s.gptPrompt ?? ""}`)
            .join("\n\n");

        await logUsage(profile.id, "cardnews", "generate");
        const savedId = await saveGeneratedContent({
            userId: profile.id,
            type: "cardnews",
            title: data.title ?? productName,
            productName,
            content: data,
            promptText: allPrompts,
        });

        return NextResponse.json({ ...data, _savedId: savedId });

    } catch (e) {
        console.error("[cardnews API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}

function buildInputSection(p: {
    contentType: string; businessName: string; productName: string;
    features: string; coreContent: string; target: string; tone: string;
    contentGoal: string; referenceStyle: string; excludeWords: string; count: number;
}): string {
    const lines: string[] = ["[입력 정보]"];

    if (p.contentType === "promotion") {
        if (p.businessName) lines.push(`- 브랜드/상호명: ${p.businessName}`);
        lines.push(`- 제품/서비스명: ${p.productName}`);
        if (p.features) lines.push(`- 핵심 특징/장점: ${p.features}`);
        if (p.coreContent) lines.push(`- 홍보 포인트: ${p.coreContent}`);
        lines.push(`- 콘텐츠 목적: ${GOAL_DESC[p.contentGoal] ?? GOAL_DESC["purchase"]}`);
    } else if (p.contentType === "education") {
        lines.push(`- 수업/강의명: ${p.productName}`);
        lines.push(`- 수업 핵심 내용:\n${p.coreContent}`);
        if (p.features) lines.push(`- 수업 특징: ${p.features}`);
    } else if (p.contentType === "tutorial") {
        lines.push(`- 서비스/앱 이름: ${p.productName}`);
        lines.push(`- 단계별 사용 순서:\n${p.coreContent}`);
        if (p.features) lines.push(`- 주요 기능: ${p.features}`);
    } else if (p.contentType === "info") {
        lines.push(`- 주제: ${p.productName}`);
        lines.push(`- 전달할 핵심 내용:\n${p.coreContent}`);
        if (p.features) lines.push(`- 핵심 메시지: ${p.features}`);
    }

    if (p.target) lines.push(`- 대상: ${p.target}`);
    lines.push(`- 톤앤매너: ${p.tone || "친근하고 감성적"}`);
    lines.push(`- 슬라이드 수: ${p.count}장`);
    if (p.referenceStyle) lines.push(`- 참고 스타일: ${p.referenceStyle}`);
    if (p.excludeWords) lines.push(`- 절대 사용 금지 단어: ${p.excludeWords}`);

    return lines.join("\n");
}

function generateSlideGuide(contentType: string, count: number): string {
    const guides: Record<string, string[]> = {
        promotion: [
            "1장(cover): 표지 — 강렬한 헤드라인으로 주목을 끄세요",
            "2장(problem): 공감 — 타겟의 불편함/고민을 건드려 공감을 이끄세요",
            "3장(solution): 해결책 — 제품이 어떻게 해결해주는지 보여주세요",
            "4장(feature1): 핵심 특징 1",
            "5장(feature2): 핵심 특징 2",
            "6장(feature3): 핵심 특징 3",
            "7장(review): 사용 후기/사례 — 신뢰를 높이는 근거",
            "8장(comparison): 비교/차별화",
            "9장(howto): 사용법/구매 방법",
        ],
        education: [
            "1장(cover): 표지 — 수업명과 기대감을 높이는 헤드라인",
            "2장(problem): 왜 배워야 하나 — 이 수업이 필요한 이유",
            "3장(solution): 수업 소개 — 무엇을 배우는지 한 줄 요약",
            "4장(feature1): 1강/1주차 핵심 내용 — 구체적 내용 서술",
            "5장(feature2): 2강/2주차 핵심 내용 — 구체적 내용 서술",
            "6장(feature3): 3강/3주차 핵심 내용 — 구체적 내용 서술",
            "7장(review): 배우고 나면 — 학습 후 달라지는 점",
            "8장(comparison): 이런 분께 추천 — 대상 명확화",
            "9장(howto): 수강 방법 및 일정",
        ],
        tutorial: [
            "1장(cover): 표지 — 서비스명과 '이렇게 쓰면 됩니다' 어필",
            "2장(problem): 이런 어려움 있으셨나요? — 시작 전 공감",
            "3장(solution): 핵심 기능 한 줄 소개",
            "4장(feature1): 1단계 — 단계명과 구체적 행동 설명",
            "5장(feature2): 2단계 — 단계명과 구체적 행동 설명",
            "6장(feature3): 3단계 — 단계명과 구체적 행동 설명",
            "7장(review): 활용 팁 — 더 잘 쓰는 방법",
            "8장(comparison): 이런 용도로 활용하세요",
            "9장(howto): 시작하는 법 / 다운로드 안내",
        ],
        info: [
            "1장(cover): 표지 — 궁금증을 유발하는 주제 헤드라인",
            "2장(problem): 이거 알고 계셨나요? — 흥미를 끄는 질문",
            "3장(solution): 핵심 요약 — 이 카드뉴스에서 알려줄 내용",
            "4장(feature1): 핵심 포인트 1 — 구체적 내용과 근거",
            "5장(feature2): 핵심 포인트 2 — 구체적 내용과 근거",
            "6장(feature3): 핵심 포인트 3 — 구체적 내용과 근거",
            "7장(review): 실생활 적용법 — 바로 써먹는 방법",
            "8장(comparison): 오해 vs 사실 — 잘못 알려진 정보 바로잡기",
            "9장(howto): 더 알아보기 / 실천 체크리스트",
        ],
    };

    const guide = guides[contentType] ?? guides.promotion;
    const selected = [...guide.slice(0, Math.min(count - 1, guide.length)), `${count}장(cta): 행동 유도(CTA) — 해시태그 포함`];
    return selected.slice(0, count).join("\n");
}
