import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

const TYPE_ROLE: Record<string, string> = {
    promotion: "유튜브 쇼츠/인스타그램 릴스/틱톡 전문 영상 기획자입니다. 소상공인이 바로 촬영할 수 있는 제품 홍보 스크립트를 만듭니다.",
    education: "교육 콘텐츠 유튜브 쇼츠 전문 기획자입니다. 수업/강의의 가치를 짧고 강하게 전달해 수강 신청을 유도하는 스크립트를 만듭니다.",
    tutorial: "앱/서비스 사용법 쇼츠 전문 기획자입니다. 시청자가 영상을 보고 바로 따라할 수 있는 단계별 튜토리얼 스크립트를 만듅니다.",
    info: "정보/지식 쇼츠(팩트폭격형) 전문 기획자입니다. 놀라운 사실로 시작해 유용한 정보를 전달하고 저장·공유를 유도하는 스크립트를 만듭니다.",
};

const TYPE_SCENE_GUIDE: Record<string, string> = {
    promotion: `장면 구성:
1장(0-3초): 강렬한 후킹 — 제품의 핵심 가치 또는 '이거 모르면 손해' 류의 훅
2장(3-10초): 문제 제시 — 타겟이 공감할 고민/불편함
3장(10-20초): 제품 소개 — 핵심 특징 1-2가지를 구체적으로
4장(20-25초): 사용 전/후 비교 또는 결과 강조
5장(25-${0}초): CTA — 댓글/링크/팔로우 유도`,

    education: `장면 구성:
1장(0-3초): 강렬한 후킹 — '이 수업 듣기 전/후' 대비 또는 학습자 고민 직격
2장(3-10초): 공감 — 배우기 어려웠던 경험, 지금 겪고 있는 한계
3장(10-20초): 수업 내용 소개 — 핵심 커리큘럼 2-3가지 빠르게
4장(20-25초): 수강 후 달라지는 것 — 구체적 변화/결과
5장(25-${0}초): CTA — 수강 신청 유도`,

    tutorial: `장면 구성:
1장(0-3초): 강렬한 후킹 — '이 방법 모르면 시간 낭비' 또는 완성 결과 먼저 보여주기
2장(3-8초): 준비물/시작 — 필요한 것 간단 소개
3장(8-18초): 핵심 단계 — 가장 중요한 1-3단계를 빠르게 (화면 자막으로 보조)
4장(18-25초): 결과 확인 — 완성된 모습
5장(25-${0}초): CTA — '저장해두고 필요할 때 써보세요'`,

    info: `장면 구성:
1장(0-3초): 놀라운 사실/훅 — 시청자를 멈추게 하는 충격적 사실이나 질문
2장(3-10초): 핵심 포인트 1 — 구체적 정보 + 근거
3장(10-18초): 핵심 포인트 2-3 — 빠르게 연속으로
4장(18-25초): 실생활 적용법 — 당장 써먹을 수 있는 방법
5장(25-${0}초): CTA — '저장하고 나중에 써보세요 / 다른 팁도 알고 싶으면 팔로우'`,
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

        const { contentType = "promotion", productName, coreContent, hookIdea, target, mood, duration } = await req.json();

        if (!productName || !coreContent) {
            return NextResponse.json({ error: "필수 항목이 누락되었어요." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "AI 키 미설정" }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const role = TYPE_ROLE[contentType] ?? TYPE_ROLE.promotion;
        const dur = parseInt(duration ?? "30");
        const sceneGuide = (TYPE_SCENE_GUIDE[contentType] ?? TYPE_SCENE_GUIDE.promotion).replace(/\$\{0\}/g, String(dur));

        const prompt = `당신은 ${role}
아래 정보를 바탕으로 쇼츠 스크립트를 만들어주세요.

[입력 정보]
- 유형: ${contentType}
- 주제/제품명: ${productName}
- 핵심 내용:\n${coreContent}
${hookIdea ? `- 훅 아이디어: ${hookIdea}` : ""}
- 대상: ${target || "20-40대"}
- 영상 분위기: ${mood || "활기차고 트렌디한"}
- 영상 길이: ${duration || "30초"}

${sceneGuide}

[출력 형식 - 순수 JSON만, 마크다운 없이]
{
  "title": "영상 제목 (클릭 유도, 30자 이내)",
  "hook": "첫 3초 후킹 멘트 — 시청자를 멈추게 하는 강력한 첫 마디 (구체적이고 직접적으로)",
  "scenes": [
    {
      "sceneNum": 1,
      "time": "0-3초",
      "action": "촬영 행동 지시 — 무엇을 어떻게 찍는지 구체적으로",
      "script": "말할 내용 또는 나레이션 (실제 말하는 텍스트)",
      "caption": "화면에 표시될 자막 (임팩트 있게)"
    }
  ],
  "musicTip": "추천 배경음악 장르/분위기 (구체적으로)",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5", "해시태그6"],
  "shootingTips": ["촬영 팁1 (구체적)", "촬영 팁2", "촬영 팁3"]
}

중요:
- script는 실제로 말하는 자연스러운 대사 (단순 지시어 금지)
- action은 카메라 각도, 소품, 행동을 구체적으로 기술
- hookIdea 입력값이 있으면 hook에 적극 반영`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        const promptText = (data.scenes ?? [])
            .map((s: { time: string; script: string }) => `[${s.time}] ${s.script}`)
            .join("\n");

        await Promise.all([
            logUsage(profile.id, "shorts", "generate"),
            saveGeneratedContent({ userId: profile.id, type: "shorts", title: data.title ?? productName, productName, content: data, promptText }),
        ]);

        return NextResponse.json(data);
    } catch (e) {
        console.error("[shorts API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}
