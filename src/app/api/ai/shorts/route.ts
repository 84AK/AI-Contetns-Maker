import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthProfile, checkGenerateLimit, logUsage, saveGeneratedContent } from "@/lib/supabase/server";

const TYPE_ROLE: Record<string, string> = {
    promotion: "유튜브 쇼츠/인스타그램 릴스/틱톡 전문 영상 기획자입니다. 소상공인이 바로 촬영할 수 있는 제품 홍보 스크립트를 만듭니다.",
    education: "교육 콘텐츠 유튜브 쇼츠 전문 기획자입니다. 수업/강의의 가치를 짧고 강하게 전달해 수강 신청을 유도하는 스크립트를 만듭니다.",
    tutorial: "앱/서비스 사용법 쇼츠 전문 기획자입니다. 시청자가 영상을 보고 바로 따라할 수 있는 단계별 튜토리얼 스크립트를 만듅니다.",
    info: "정보/지식 쇼츠(팩트폭격형) 전문 기획자입니다. 놀라운 사실로 시작해 유용한 정보를 전달하고 저장·공유를 유도하는 스크립트를 만듭니다.",
    story: "공감 스토리형 쇼츠(썰 풀기) 전문 기획자입니다. 제품 언급 없이 공감으로 시작해 자연스럽게 브랜드를 드러내는 바이럴 스토리텔링 스크립트를 만듭니다.",
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

    story: `장면 구성 (썰 풀기 스토리 — 제품은 후반부에만 자연스럽게 등장):
1장(0-3초): 훅 — '나도 이랬는데' 공감 유발. 제품·브랜드 절대 언급 금지. 상황·감정만 묘사. 대사는 고백체로
2장(3-12초): 갈등 — 문제 상황을 생생하게. 당시 감정과 구체적 불편함. '그래서 어떻게 됐냐면...'
3장(12-22초): 전환/해결 — '그러다 우연히...' 극적 계기 → 달라진 결과를 수치·변화로. 이 장면에서 자연스럽게 제품 등장
4장(22-${0}초): CTA — 댓글/저장/팔로우 유도. '공감되면 저장' 또는 '더 궁금하면 팔로우' 형식`,
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

        const totalSec = dur;
        const prompt = `당신은 ${role}
아래 정보를 바탕으로 GPT Image 2.0 + AI 영상 생성 수준의 프로덕션 레디 쇼츠 기획서를 만들어주세요.

[입력 정보]
- 유형: ${contentType}
- 주제/제품명: ${productName}
- 핵심 내용:\n${coreContent}
${hookIdea ? `- 훅 아이디어: ${hookIdea}` : ""}
- 대상: ${target || "20-40대"}
- 영상 분위기: ${mood || "활기차고 트렌디한"}
- 영상 길이: ${duration || "30초"}

${sceneGuide}

[피사체/주제 디자인 시트 작성 규칙 - subjectDesignSheet]
영상 전체에서 일관되게 유지할 비주얼 요소를 상세히 정의하세요 (모두 영어로):
- mainSubject: 주인공/제품의 외형 상세 (색상, 형태, 질감, 특징적 요소, 착용물/라벨 등)
- environment: 촬영 환경 상세 (장소, 소품, 조명 세팅, 배경 요소)
- videoStyle: 영상 스타일 (리얼리스틱/시네마틱/브이로그 등)
- cameraStyle: 카메라 스타일 (핸드헬드/스테디캠/드론 등)
- colorGrading: 색감/분위기 (웜톤/쿨톤, LUT 스타일, 밝기)
- subjectSheetPrompt: GPT Image 2.0으로 피사체 레퍼런스 시트를 만드는 영어 프롬프트 — 다음 형식을 따르세요:
  "Create a professional production reference sheet for [제품/주인공명] short-form video content. ONE combined vertical image. SECTION A — SUBJECT REFERENCE: [피사체의 다양한 각도, 상태, 표정/표면 질감 상세 묘사. 실제 색상 스와치 포함]. SECTION B — ENVIRONMENT & PROPS REFERENCE: [촬영 공간, 소품 배치, 조명 세팅, 카메라 앵글 예시]. Add production notes in handwriting style. STYLE: [영상 스타일 상세]. MOOD: [분위기 키워드]. Professional production design document."

[장면별 비주얼 노트 작성 규칙]
각 장면에 다음 필드를 추가하세요:
- cameraNote: 카메라 앵글/움직임/렌즈 (영어로, 예: "extreme close-up of product label, slow rack focus to background")
- sfxNote: 효과음/환경음 (한국어, 예: "커피 내려지는 소리, 잔잔한 재즈")
- imagePrompt: 이 장면을 스틸 이미지로 만들 GPT Image 2.0 프롬프트 (영어, 피사체 레퍼런스 참조 명시)

[전체 영상 프롬프트 작성 규칙 - fullVideoPrompt]
AI 영상 생성 도구(Sora/Kling/Runway)용 전체 영상 프롬프트를 작성하세요. 반드시 다음 구조를 포함하세요:
"TITLE: [영상 제목]

REFERENCE: Use the uploaded subject reference sheet as strict visual reference. Maintain consistent [주인공/제품] appearance throughout.

SUBJECTS: [주인공/제품의 상세 외형 설명, 착용물, 특징]

ENVIRONMENT: [촬영 환경 상세 — 장소, 소품, 조명, 배경]

STYLE: [영상 스타일, 색감, 카메라 무드]

AVOID: No text overlays. No watermarks. No logos. [기타 피해야 할 요소]

AUDIO: [배경음악 방향, SFX]

CAMERA: [카메라 스타일, 무빙, 프레이밍]

TIMELINE:
[각 장면의 타임코드 - 예: 0:00-0:03, 0:03-0:10 등 ${totalSec}초 분량 전체 기술]

FINAL SHOT: [마지막 장면 상세]"

[출력 형식 - 순수 JSON만, 마크다운 없이]
{
  "title": "영상 제목 (클릭 유도, 30자 이내)",
  "hook": "첫 3초 후킹 멘트 (강력하고 직접적으로)",
  "subjectDesignSheet": {
    "mainSubject": "피사체 외형 상세 (영어)",
    "environment": "촬영 환경 상세 (영어)",
    "videoStyle": "영상 스타일 (영어)",
    "cameraStyle": "카메라 스타일 (영어)",
    "colorGrading": "색감/분위기 (영어)",
    "subjectSheetPrompt": "GPT Image 2.0 피사체 레퍼런스 시트 생성 프롬프트 (영어, 상세)"
  },
  "scenes": [
    {
      "sceneNum": 1,
      "time": "0-3초",
      "action": "촬영 행동 지시 (카메라 각도, 소품, 행동 구체적으로)",
      "script": "실제 말하는 대사 (자연스러운 구어체)",
      "caption": "화면 자막 (임팩트 있게)",
      "cameraNote": "카메라 앵글/무빙/렌즈 (영어)",
      "sfxNote": "효과음/환경음 (한국어)",
      "imagePrompt": "이 장면 스틸 이미지용 GPT Image 2.0 프롬프트 (영어, 상세)"
    }
  ],
  "fullVideoPrompt": "AI 영상 생성 도구용 전체 영상 프롬프트 (영어, 타임라인 포함, 위 형식 준수)",
  "musicTip": "추천 배경음악 장르/분위기",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5", "해시태그6"],
  "shootingTips": ["촬영 팁1 (구체적)", "촬영 팁2", "촬영 팁3"]
}

중요:
1. script는 실제로 말하는 자연스러운 대사 (단순 지시어 금지)
2. subjectDesignSheet.subjectSheetPrompt는 반드시 300자 이상 상세하게 작성
3. fullVideoPrompt는 반드시 TIMELINE 섹션에 각 장면의 타임코드와 행동을 ${totalSec}초 전체 기술
4. 각 장면 imagePrompt는 "REFERENCE: Use the uploaded subject reference sheet" 문구로 시작`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON 파싱 실패");

        const data = JSON.parse(jsonMatch[0]);

        const promptText = (data.scenes ?? [])
            .map((s: { time: string; script: string }) => `[${s.time}] ${s.script}`)
            .join("\n");

        await logUsage(profile.id, "shorts", "generate");
        const savedId = await saveGeneratedContent({ userId: profile.id, type: "shorts", title: data.title ?? productName, productName, content: { ...data, _input: { contentType, productName, coreContent, hookIdea, target, mood, duration } }, promptText });

        return NextResponse.json({ ...data, _savedId: savedId });
    } catch (e) {
        console.error("[shorts API]", e);
        return NextResponse.json({ error: "AI 생성 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    }
}
