import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

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

        const { productName, features, target, tone, platform, goal } = await req.json();

        if (!productName?.trim()) {
            return NextResponse.json({ error: "제품/서비스명은 필수입니다." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI 키 미설정" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const platformLabel: Record<string, string> = {
            instagram: "인스타그램",
            facebook: "페이스북",
            naver: "네이버 스마트스토어",
            kakao: "카카오톡 채널",
            youtube: "유튜브",
            all: "전 채널",
        };

        const goalLabel: Record<string, string> = {
            awareness: "브랜드/제품 인지도 향상",
            purchase: "즉각 구매 유도",
            follow: "팔로워/구독자 확보",
            traffic: "사이트 방문 유도",
        };

        const prompt = `당신은 대한민국 최고의 디지털 마케팅 광고 카피라이터입니다.
아래 정보를 바탕으로 다양한 상황에서 사용할 수 있는 광고 카피 세트를 만들어주세요.

[입력 정보]
- 제품/서비스명: ${productName}
- 핵심 특징/장점: ${features || "없음"}
- 타겟: ${target || "일반 소비자"}
- 톤앤매너: ${tone || "친근하고 감성적"}
- 주요 채널: ${platformLabel[platform] ?? "전 채널"}
- 광고 목표: ${goalLabel[goal] ?? goalLabel["purchase"]}

[출력 형식 - 순수 JSON만, 마크다운 없이]
{
  "productName": "${productName}",
  "platform": "${platform || "all"}",
  "goal": "${goal || "purchase"}",
  "headlines": [
    { "type": "감성형", "text": "15자 이내 헤드라인", "hook": "왜 이 카피가 효과적인지 한 줄 설명" },
    { "type": "혜택형", "text": "15자 이내 헤드라인", "hook": "왜 이 카피가 효과적인지 한 줄 설명" },
    { "type": "질문형", "text": "15자 이내 헤드라인", "hook": "왜 이 카피가 효과적인지 한 줄 설명" },
    { "type": "긴급형", "text": "15자 이내 헤드라인", "hook": "왜 이 카피가 효과적인지 한 줄 설명" },
    { "type": "숫자형", "text": "15자 이내 헤드라인 (숫자 포함)", "hook": "왜 이 카피가 효과적인지 한 줄 설명" }
  ],
  "bodyTexts": [
    { "length": "short", "label": "한 줄 카피 (SNS 피드)", "text": "30자 이내" },
    { "length": "medium", "label": "중간 카피 (광고 배너)", "text": "50~80자" },
    { "length": "long", "label": "상세 카피 (상세페이지/광고 설명)", "text": "100~150자의 설득력 있는 본문" }
  ],
  "ctas": [
    { "style": "직접형", "text": "10자 이내 CTA 버튼 문구" },
    { "style": "혜택형", "text": "10자 이내 CTA 버튼 문구" },
    { "style": "호기심형", "text": "10자 이내 CTA 버튼 문구" }
  ],
  "hashtags": ["관련 해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5", "해시태그6", "해시태그7", "해시태그8"],
  "abTestTip": "이 제품에 가장 효과적일 것으로 예상되는 A/B 테스트 전략 한 문단 (100자 이내)"
}

중요:
1. 모든 카피는 실제 광고에 바로 사용할 수 있을 만큼 구체적이고 매력적으로 작성
2. 타겟과 톤앤매너를 철저히 반영
3. 각 헤드라인 유형별로 명확히 차별화된 스타일로 작성`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        await logUsage(profile.id, "adcopy", "generate");
        const savedId = await saveGeneratedContent({
            userId: profile.id,
            type: "cardnews",
            title: `광고 카피 — ${productName}`,
            productName,
            content: data,
            promptText: data.headlines?.map((h: { type: string; text: string }) => `[${h.type}] ${h.text}`).join("\n") ?? "",
        });

        return NextResponse.json({ ...data, _savedId: savedId });

    } catch (e) {
        console.error("[adcopy API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}
