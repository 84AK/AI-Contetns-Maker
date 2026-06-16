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
    story: "공감 스토리텔링 SNS 카드뉴스 전문가입니다. 제품 홍보 없이 공감으로 시작해 자연스럽게 브랜드·제품을 드러내는 '썰 풀기' 형식의 카드뉴스를 만듭니다.",
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
        const isStory = contentType === "story";

        const prompt = `당신은 ${role}
아래 정보를 바탕으로 인스타그램 카드뉴스 구성안과 GPT Image 2.0 수준의 프로덕션 레디 이미지 프롬프트를 만들어주세요.

${inputSection}
${isStory ? `
[썰 풀기 스토리 특별 지시]
- 처음 슬라이드(story_hook)에서 제품·브랜드를 절대 언급하지 마세요. 공감 상황만 묘사하세요.
- 갈등(story_conflict) 슬라이드는 타겟이 '맞아 맞아' 할 수 있는 구체적 감정·상황으로 채우세요.
- 전환점(story_turning)은 '그러다 우연히...' 형식으로 자연스러운 계기를 보여주세요.
- 해결(story_resolve)에서 구체적 수치나 변화를 보여주고, 공개(story_reveal)에서 비로소 제품을 자연스럽게 드러내세요.
- headline은 독자의 감정을 자극하는 대화체·고백체 문장으로 작성하세요. (예: "저도 몰랐어요", "그러다 바뀐 거예요")
- body는 해당 장면의 스토리 텍스트를 일기 쓰듯 구체적으로 작성하세요.` : ""}

[슬라이드 텍스트 작성 규칙]
- headline: 15자 이내의 강렬한 제목
- subtext: 20자 이내의 부제목 또는 보조 문구
- body: 반드시 포함. 40~120자의 본문 설명 텍스트. 구체적 정보나 설명 (단순 슬로건 금지).
- hashtags: CTA 슬라이드에만 3~5개 포함

[비주얼 아이덴티티 시트 작성 규칙 - visualIdentitySheet]
이 카드뉴스 시리즈 전체에서 일관되게 사용할 시각 요소를 상세히 정의하세요:
- subject: 주인공/제품/캐릭터의 외형 (색상, 형태, 질감, 비율, 특징적 요소 등 영어로 상세 기술)
- environment: 배경/공간의 상세 설명 (재질, 조명, 분위기, 색상 팔레트 영어로)
- styleIdentity: 전체 시리즈의 시각 스타일 (일러스트레이션 기법, 색감, 레이아웃 원칙 영어로)
- colorPalette: 주요 색상 코드 또는 색상명 (영어로, 배경색/강조색/텍스트색 각각)
- consistencyRules: 모든 슬라이드에서 반드시 지켜야 할 시각적 규칙 3가지 (영어로)
- characterSheetPrompt: "GPT Image 2.0으로 비주얼 아이덴티티 시트를 생성하는 영어 프롬프트" — 다음 형식을 따르세요:
  "Create a professional visual identity development board for [브랜드/제품명] instagram card news series. The output must be ONE combined image with two sections. SECTION A — SUBJECT DESIGN: [주인공/제품의 다양한 각도, 표정/상태, 포즈 설명. 실제 색상 스와치 포함]. SECTION B — STYLE REFERENCE GRID: [슬라이드 레이아웃 예시, 배경 패턴, 폰트 스타일, 색상 팔레트 스와치]. Add small handwritten annotation notes. STYLE: [시각 스타일 상세 설명]. LAYOUT: clean vertical composition, professional pre-production reference board feel."

[슬라이드별 이미지 프롬프트 작성 규칙]
1. gptPrompt (GPT Image 2.0용) — 반드시 다음 구조로 작성:
   "Square 1:1 ratio Instagram card news, slide [N]/[총수]. REFERENCE: Use the visual identity sheet as strict appearance reference — maintain consistent subject design, color palette, and visual style across all slides.
   COMPOSITION: [이 슬라이드의 레이아웃 — 상단/중앙/하단 배치 상세 설명]
   SUBJECT: [이 슬라이드에서 주인공/제품의 구체적 상태, 동작, 표정, 위치]
   ENVIRONMENT: [배경 색상, 소품, 장식 요소 상세]
   TEXT OVERLAY: headline '[headline 텍스트]' in [폰트 스타일, 색상, 크기, 위치]. subtext '[subtext 텍스트]' in [스타일, 위치].
   LIGHTING: [조명 방향, 강도, 색온도]
   MOOD: [감성/분위기 키워드 3개]
   STYLE: [최종 스타일 요약], professional instagram marketing card, masterpiece quality"

2. geminiPrompt (Nanobanana pro용):
   - 구조형 키워드 나열: "<피사체 상세> <동작/상태> <장면/배경> <조명/색감> <스타일>"
   - 마지막에 반드시 "이미지 생성" 포함
   - "정사각형 1:1 비율" 명시
   - 분위기/색감/조명 키워드 콤마 구분

[출력 형식 - 순수 JSON만, 마크다운 없이]
{
  "title": "카드뉴스 시리즈 제목 (20자 이내)",
  "styleGuide": "모든 슬라이드 공통 시각 스타일 한 줄 요약",
  "visualIdentitySheet": {
    "subject": "주인공/제품 외형 상세 (영어)",
    "environment": "배경/공간 상세 (영어)",
    "styleIdentity": "전체 시각 스타일 (영어)",
    "colorPalette": "배경: #xxx / 강조: #xxx / 텍스트: #xxx",
    "consistencyRules": ["rule1 (영어)", "rule2 (영어)", "rule3 (영어)"],
    "characterSheetPrompt": "GPT Image 2.0 비주얼 아이덴티티 시트 생성 프롬프트 (영어, 상세)"
  },
  "slides": [
    {
      "slideNum": 1,
      "type": "cover",
      "headline": "헤드라인 (15자 이내)",
      "subtext": "부제목 (20자 이내)",
      "body": "본문 설명 텍스트 (40~120자, 반드시 작성)",
      "gptPrompt": "GPT Image 2.0용 상세 영어 프롬프트",
      "geminiPrompt": "Nanobanana pro용 키워드형 한국어 프롬프트"
    }
  ]
}

슬라이드 구성 (${count}장):
${generateSlideGuide(contentType, count)}

중요:
1. 모든 슬라이드에 body 필드를 반드시 작성하세요. 빈 문자열 금지.
2. visualIdentitySheet.characterSheetPrompt는 반드시 300자 이상의 상세한 영어 프롬프트로 작성하세요.
3. 각 슬라이드 gptPrompt는 반드시 REFERENCE / COMPOSITION / SUBJECT / ENVIRONMENT / TEXT OVERLAY / LIGHTING / MOOD / STYLE 구조를 포함하세요.
4. 모든 슬라이드가 하나의 일관된 시리즈로 느껴지도록 스타일을 통일하세요.`;

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
            content: {
                ...data,
                _input: { contentType, businessName, productName, features, coreContent, target, tone, excludeWords, referenceStyle, contentGoal, slideCount },
            },
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
    } else if (p.contentType === "story") {
        lines.push(`- 썰 소재/브랜드명: ${p.productName}`);
        if (p.features) lines.push(`- 소개할 제품/서비스: ${p.features}`);
        if (p.coreContent) lines.push(`- 스토리 흐름:\n${p.coreContent}`);
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
        story: [
            "1장(story_hook): 훅 — '나도 이랬는데' 공감 유발. 제품·브랜드 절대 언급 금지. 상황·감정만 묘사",
            "2장(story_conflict): 갈등 — 문제 상황을 생생하게. 당시 감정과 구체적 불편함. '그래서 어떻게 됐냐면...'",
            "3장(story_turning): 전환점 — '그러다 우연히...' 형식의 극적 계기. 무엇이 달라지기 시작했는지",
            "4장(story_resolve): 해결 — 달라진 일상의 구체적 묘사. 전과 후의 대비. 수치나 변화 포함",
            "5장(story_reveal): 제품/서비스 공개 — '그래서 제가 쓰고 있는 게 바로...' 비로소 제품 자연스럽게 등장",
            "6장(story_proof): 증거 — 나만의 경험이 아님을 증명. 수치, 후기, 인증 등 신뢰 요소",
            "7장(story_resolve): 결과 심화 — 주변 반응, 추가 변화, 확신의 순간",
            "8장(review): 공감 후기 — '저도 이랬는데요' 형식의 독자 공감 유도",
            "9장(solution): 핵심 메시지 정리 — 이 썰의 핵심을 한 줄로 요약",
        ],
    };

    const guide = guides[contentType] ?? guides.promotion;
    const selected = [...guide.slice(0, Math.min(count - 1, guide.length)), `${count}장(cta): 행동 유도(CTA) — 해시태그 포함`];
    return selected.slice(0, count).join("\n");
}
