import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

const TYPE_ROLE: Record<string, string> = {
    promotion: "스마트스토어, 쿠팡, 아이디어스 등 국내 이커머스 상세페이지 전문 카피라이터입니다. 구매 전환율을 높이는 상세페이지를 만듭니다.",
    education: "교육 플랫폼 및 강의 랜딩페이지 전문 카피라이터입니다. 수강 신청률을 높이는 매력적인 상세페이지를 만듭니다.",
    tutorial: "SaaS/앱 서비스 온보딩 및 사용법 안내 페이지 전문 카피라이터입니다. 사용자가 쉽게 따라올 수 있는 튜토리얼 페이지를 만듭니다.",
    info: "블로그 및 콘텐츠 마케팅 전문 카피라이터입니다. 독자가 끝까지 읽고 실천하게 만드는 정보성 랜딩페이지를 만듭니다.",
};

const TYPE_SECTIONS: Record<string, string> = {
    promotion: `섹션 구성 (순서대로):
1. problem: 타겟의 고통/불편함 공감 (3-4줄)
2. solution: 제품이 문제를 해결하는 방법 (3-4줄) + gptPrompt
3. features: 핵심 특장점 3개 (items 배열) + gptPrompt
4. howto: 주문/사용 방법 단계 (steps 배열) + gptPrompt
5. review: 가상 고객 후기 2개 (reviews 배열)
6. cta: 구매 유도 (urgency, button, note)`,

    education: `섹션 구성 (순서대로):
1. problem: 이 수업이 필요한 이유 — 학습자의 고민/한계 공감 (3-4줄)
2. solution: 이 수업으로 달라지는 것 — 수강 후 변화 (3-4줄) + gptPrompt
3. curriculum: 주요 커리큘럼 소개 (items 배열: 각 강의 제목+설명) + gptPrompt
4. features: 수업의 특징 3가지 (items 배열) + gptPrompt
5. review: 가상 수강생 후기 2개 (reviews 배열)
6. cta: 수강 신청 유도 (urgency=수강기간/인원제한, button=신청 버튼 문구, note=환불/일정 안내)`,

    tutorial: `섹션 구성 (순서대로):
1. problem: 이 서비스 없이는 이런 불편함이 있다 (3-4줄)
2. solution: 핵심 기능 소개 — 무엇이 가능한지 (3-4줄) + gptPrompt
3. features: 주요 기능 3가지 (items 배열) + gptPrompt
4. howto: 단계별 사용법 (steps 배열, 구체적 행동 포함) + gptPrompt
5. review: 가상 사용자 후기 2개 (reviews 배열)
6. cta: 시작 유도 (urgency=무료/유료 안내, button=시작 버튼, note=지원 환경)`,

    info: `섹션 구성 (순서대로):
1. problem: 이 정보가 중요한 이유 — 독자의 상황 공감 (3-4줄)
2. solution: 핵심 인사이트 요약 — 이 글에서 얻게 될 것 (3-4줄) + gptPrompt
3. points: 핵심 포인트 3-5가지 (items 배열: 각 포인트 제목+설명+근거) + gptPrompt
4. howto: 실생활 적용법 단계 (steps 배열) + gptPrompt
5. review: 실천자 후기/사례 2개 (reviews 배열)
6. cta: 실천 유도 (urgency=지금 당장 할 수 있는 첫 단계, button=실천 시작, note=추가 자료 안내)`,
};

export async function POST(req: NextRequest) {
    try {
        const profile = await getAuthProfile(req);
        if (!profile) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

        const limitCheck = await checkGenerateLimit(profile.id, profile.plan);
        if (!limitCheck.ok) {
            return NextResponse.json({
                error: `오늘 생성 횟수를 모두 사용했어요. (${limitCheck.used}/${limitCheck.limit}회)\n내일 다시 이용하거나 유료 플랜으로 업그레이드하세요.`,
                limitExceeded: true, used: limitCheck.used, limit: limitCheck.limit,
            }, { status: 429 });
        }

        const {
            contentType = "promotion",
            productName, features, coreContent, target,
            price, urgency, socialProof, differentiator, ctaText,
        } = await req.json();

        if (!productName) return NextResponse.json({ error: "필수 항목이 누락되었어요." }, { status: 400 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI 키 미설정" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const role = TYPE_ROLE[contentType] ?? TYPE_ROLE.promotion;
        const sectionGuide = TYPE_SECTIONS[contentType] ?? TYPE_SECTIONS.promotion;

        const inputLines = buildInput({ contentType, productName, features, coreContent, target, price, urgency, socialProof, differentiator, ctaText });

        const prompt = `당신은 ${role}
아래 정보를 바탕으로 상세페이지 구성안을 만들어주세요.

${inputLines}

${sectionGuide}

[출력 형식 - 순수 JSON만, 마크다운 없이]
{
  "hookHeadline": "상단 후킹 헤드라인 — 구매/수강/클릭 욕구를 자극하는 1줄 (30자 이내)",
  "subHeadline": "부제목 — 핵심 가치 전달 (40자 이내)",
  "sections": [
    {
      "type": "섹션타입",
      "title": "섹션 제목",
      "content": "본문 텍스트 (content 타입 섹션만, 3-5줄)",
      "items": [{"icon": "이모지", "title": "항목 제목", "desc": "설명 1-2줄"}],
      "steps": ["단계1 — 구체적 행동", "단계2", "단계3"],
      "reviews": [{"rating": 5, "text": "실감나는 후기"}],
      "urgency": "긴급성 문구",
      "button": "버튼 텍스트",
      "note": "부가 안내",
      "gptPrompt": "이 섹션에 어울리는 GPT Image 이미지 프롬프트 (세로형 상세페이지 이미지, 1080x1350px)"
    }
  ],
  "seoKeywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"]
}

중요:
- content 필드는 실제 설명 텍스트 (단순 슬로건 금지)
- gptPrompt는 해당 섹션 내용을 시각화하는 구체적 이미지 설명
- ctaText 입력값이 있으면 button 필드에 반드시 사용`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        const promptText = (data.sections ?? [])
            .filter((s: { gptPrompt?: string }) => s.gptPrompt)
            .map((s: { title: string; gptPrompt: string }) => `[${s.title}] ${s.gptPrompt}`)
            .join("\n\n");

        await logUsage(profile.id, "detail-page", "generate");
        const savedId = await saveGeneratedContent({ userId: profile.id, type: "detail-page", title: data.hookHeadline ?? productName, productName, content: data, promptText });

        return NextResponse.json({ ...data, _savedId: savedId });
    } catch (e) {
        console.error("[detail-page API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}

function buildInput(p: {
    contentType: string; productName: string; features: string; coreContent: string;
    target: string; price: string; urgency: string; socialProof: string;
    differentiator: string; ctaText: string;
}): string {
    const lines = ["[입력 정보]"];
    if (p.contentType === "promotion") {
        lines.push(`- 제품/서비스명: ${p.productName}`);
        if (p.features) lines.push(`- 핵심 특징/기능: ${p.features}`);
        if (p.coreContent) lines.push(`- 홍보 포인트: ${p.coreContent}`);
        if (p.price) lines.push(`- 가격: ${p.price}원`);
        if (p.differentiator) lines.push(`- 차별화 포인트: ${p.differentiator}`);
    } else if (p.contentType === "education") {
        lines.push(`- 수업/강의명: ${p.productName}`);
        if (p.coreContent) lines.push(`- 커리큘럼/수업 내용:\n${p.coreContent}`);
        if (p.features) lines.push(`- 수업 특징: ${p.features}`);
    } else if (p.contentType === "tutorial") {
        lines.push(`- 서비스/앱 이름: ${p.productName}`);
        if (p.coreContent) lines.push(`- 단계별 사용 순서:\n${p.coreContent}`);
        if (p.features) lines.push(`- 주요 기능: ${p.features}`);
    } else if (p.contentType === "info") {
        lines.push(`- 주제: ${p.productName}`);
        if (p.coreContent) lines.push(`- 핵심 내용:\n${p.coreContent}`);
        if (p.features) lines.push(`- 핵심 메시지: ${p.features}`);
    }
    if (p.target) lines.push(`- 대상: ${p.target}`);
    if (p.urgency) lines.push(`- ${p.contentType === "education" ? "수강 기간/일정" : p.contentType === "tutorial" ? "지원 환경" : p.contentType === "info" ? "출처/근거" : "긴급성 문구"}: ${p.urgency}`);
    if (p.socialProof) lines.push(`- 소셜 증거: ${p.socialProof}`);
    if (p.ctaText) lines.push(`- CTA 버튼 문구: ${p.ctaText}`);
    return lines.join("\n");
}
