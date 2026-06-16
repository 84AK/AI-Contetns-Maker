import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const profile = await getAuthProfile(req);
        if (!profile) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

        const { slide, editRequest, context } = await req.json();
        if (!slide || !editRequest?.trim()) {
            return NextResponse.json({ error: "슬라이드 정보와 수정 요청이 필요해요." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI 키 미설정" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `당신은 마케팅 카피라이터입니다. 다음 카드뉴스 슬라이드를 수정 요청에 따라 수정해주세요.

[현재 슬라이드 내용]
슬라이드 번호: ${slide.slideNum}번
헤드라인: ${slide.headline}
부제목: ${slide.subtext || "(없음)"}
본문: ${slide.body}
이미지 설명: ${slide.imageDesc || "(없음)"}

[콘텐츠 컨텍스트]
주제/제품: ${context?.productName || "-"}
톤앤매너: ${context?.tone || "-"}
이미지 스타일: ${context?.imageStyle || "-"}

[수정 요청]
${editRequest}

[출력 형식 — 순수 JSON만, 마크다운 없이]
{
  "headline": "수정된 헤드라인 (15자 이내)",
  "subtext": "수정된 부제목 (20자 이내, 없으면 null)",
  "body": "수정된 본문 (60~150자, 구체적이고 맥락 있게)",
  "imageDesc": "수정된 이미지 설명 (한국어 2~3문장)",
  "gptPrompt": "수정된 GPT Image 프롬프트 (영어, 자연어 문장, 정사각형 1:1 비율 명시)",
  "geminiPrompt": "수정된 Gemini 프롬프트 (키워드 나열, 정사각형 1:1 명시)"
}

수정 요청을 반영하되 전체 콘텐츠의 톤앤매너와 흐름은 유지하세요.`;

        const aiResult = await model.generateContent(prompt);
        const text = aiResult.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const updated = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            slide: {
                ...slide,
                headline: updated.headline ?? slide.headline,
                subtext: updated.subtext ?? slide.subtext,
                body: updated.body ?? slide.body,
                imageDesc: updated.imageDesc ?? slide.imageDesc,
                gptPrompt: updated.gptPrompt ?? slide.gptPrompt,
                geminiPrompt: updated.geminiPrompt ?? slide.geminiPrompt,
            },
        });

    } catch (e) {
        console.error("[edit-slide API]", e);
        return NextResponse.json({ error: "수정 중 오류가 발생했어요." }, { status: 500 });
    }
}
