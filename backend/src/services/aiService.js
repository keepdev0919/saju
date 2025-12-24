/**
 * AI 사주 해석 서비스
 * OpenAI API를 사용한 맞춤형 사주 해석 생성
 */
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GPT 모델 선택 (환경 변수로 제어)
const GPT_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

/**
 * 사주 데이터를 기반으로 AI 해석 생성
 * @param {Object} sajuData - lunar-javascript로 계산된 사주 데이터 (십신, 대운, 등 포함)
 * @param {Object} userData - 사용자 기본 정보 (이름, 성별 등)
 * @returns {Object} 해석 결과
 */
export async function interpretSajuWithAI(sajuData, userData) {
  // [DEBUG] API 키 상태 확인 (보안상 앞 5자리만 출력)
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`🔑 OpenAI Key Status: ${apiKey ? `Present (${apiKey.substring(0, 5)}...)` : 'MISSING'}`);

  try {
    const { name, gender, birthDate, birthTime } = userData;

    // 현재 날짜 정보 가져오기
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDate = `${currentYear}년 ${currentMonth}월 ${now.getDate()}일`;

    // System prompt (역할 정의)
    const systemPrompt = `당신은 30년 경력의 전문 사주 명리학자입니다.
사용자의 사주팔자 데이터를 바탕으로 정확하고 구체적인 운세 해석을 제공합니다.

**핵심 임무**:
1. 전통 명리학 원리에 따라 **용신(用神)**을 계산하세요.
   - 일간·월령·계절·신강신약을 종합적으로 고려
   - 오행의 균형과 조화를 분석
   - 용신 선택 근거를 명확히 제시

2. 계산된 용신을 기반으로 상세한 해석을 작성하세요.
   - 해석은 긍정적이면서도 현실적이어야 하며, 실질적인 조언을 포함해야 합니다.

반드시 유효한 JSON 형식으로만 응답하세요.

**중요 제약사항:**
1. 현재 날짜는 ${currentDate} (${currentYear}년)입니다. 
   timing 필드(business.timing, marriage.timing)는 미래 예측이므로 반드시 ${currentYear}년 이후의 날짜만 언급하세요.
   description 필드들은 과거 운세 패턴이나 흐름을 자연스럽게 언급해도 되지만, 과거 날짜를 미래처럼 표현하지 마세요.
2. **구조적 설명 제외**: 제2서(오행의 조화)에서 이미 기본 오행 구조는 설명했으므로, 
   단순한 오행 나열보다는 "의미"와 "활용"에 집중하세요.
   예시: "금 기운이 강하여 결단력이 있다" (O) / "월지에 금이 있어서 강하다" (X)
3. 모든 해석은 당신이 직접 계산한 '용신'을 기준으로 일관성 있게 작성되어야 합니다.`;

    // User prompt (사주 데이터 전달 - JSON 형식)
    // sajuData에 있는 십신, 대운, 12운성, 신살 정보를 모두 포함
    const userPrompt = `다음은 ${name}님의 사주팔자 정보입니다:

생년월일: ${birthDate} (${birthTime || '시간 미상'})
성별: ${gender === 'male' ? '남성' : '여성'}

**현재 날짜: ${currentDate} (${currentYear}년)**

사주팔자:
- 년주: ${sajuData.year.gan}${sajuData.year.ji}
- 월주: ${sajuData.month.gan}${sajuData.month.ji}
- 일주: ${sajuData.day.gan}${sajuData.day.ji} (일간: ${sajuData.dayMaster})
- 시주: ${sajuData.hour.gan}${sajuData.hour.ji}

오행 분포:
- 목(木): ${sajuData.wuxing.목}%
- 화(火): ${sajuData.wuxing.화}%
- 토(土): ${sajuData.wuxing.토}%
- 금(金): ${sajuData.wuxing.금}%
- 수(水): ${sajuData.wuxing.수}%

십신(十神) 구성:
- 년주: 천간 ${sajuData.sipsin.year.gan}, 지지 ${sajuData.sipsin.year.ji}
- 월주: 천간 ${sajuData.sipsin.month.gan}, 지지 ${sajuData.sipsin.month.ji}
- 일주: 천간 ${sajuData.sipsin.day.gan}, 지지 ${sajuData.sipsin.day.ji}
- 시주: 천간 ${sajuData.sipsin.hour.gan}, 지지 ${sajuData.sipsin.hour.ji}

대운(大運) 정보:
${sajuData.dayun.map(d => `- ${d.startAge}~${d.endAge}세: ${d.gan}${d.ji} (${d.ganZhi})`).join('\n')}

12운성:
- 년주: ${sajuData.phases.year}
- 월주: ${sajuData.phases.month}
- 일주: ${sajuData.phases.day}
- 시주: ${sajuData.phases.hour}

신살(神殺):
${sajuData.sinsal.join(', ')}

**용신(用神) 계산 필수**:
위 사주 정보를 바탕으로 전통 명리학 원리에 따라 용신을 계산하세요.
- 일간의 강약(신강/신약) 판단
- 월령(월주 지지)의 계절 영향 고려
- 조후(계절적 조화) 및 억부(강약 조절) 고려
- 용신 선택 근거 상세 설명

위 정보를 바탕으로 다음 JSON 형식으로 상세한 해석을 제공해주세요:

{
  "yongshen": {
    "element": "화", 
    "reason": "용신 선택 근거 (3-4문장). 예: 일간이 신약하고 겨울에 태어나 한냉하므로, 따뜻한 화(火)를 용신으로 삼아 조후합니다.",
    "xishen": "목", 
    "jishen": "수" 
  },
  "personality": {
    "description": "일간과 용신을 중심으로 한 성격 특성 (3-4문장)",
    "strengths": ["강점1", "강점2", "강점3"],
    "weaknesses": ["약점1", "약점2"]
  },
  "business": {
    "suitableFields": ["적합한 분야1", "적합한 분야2", "적합한 분야3"],
    "timing": "사업운이 트이는 시기 (${currentYear}년 이후의 미래 날짜만 언급)",
    "advice": "사업 관련 조언 (2-3문장)"
  },
  "wealth": {
    "description": "재물운 해석 (2-3문장)",
    "income": "수입 관련 조언",
    "expense": "지출 관리 조언",
    "investment": "투자 관련 조언"
  },
  "marriage": {
    "description": "결혼운 해석 (2-3문장)",
    "timing": "결혼 적기 (${currentYear}년 이후의 미래 날짜만 언급)",
    "partnerType": "적합한 배우자 유형"
  },
  "health": {
    "description": "건강운 해석 (2-3문장)",
    "attention": ["주의할 질병1", "주의할 질병2"],
    "advice": "건강 관리 조언"
  },
  "future": {
    "${currentYear}": {
      "energy": "주요 기운",
      "description": "${currentYear}년 운세 (2-3문장)",
      "positive": ["긍정적 요소1", "긍정적 요소2"],
      "warning": ["주의사항1", "주의사항2"]
    },
    "${currentYear + 1}": {
      "energy": "주요 기운",
      "description": "${currentYear + 1}년 운세 (2-3문장)",
      "positive": ["긍정적 요소1", "긍정적 요소2"],
      "warning": ["주의사항1", "주의사항2"]
    },
    "next3to5Years": [
      {
        "year": ${currentYear},
        "energy": "주요 기운",
        "keyPoints": ["포인트1"]
      },
      {
        "year": ${currentYear + 1},
        "energy": "주요 기운",
        "keyPoints": ["포인트1"]
      },
      {
        "year": ${currentYear + 2},
        "energy": "주요 기운",
        "keyPoints": ["포인트1"]
      },
      {
        "year": ${currentYear + 3},
        "energy": "주요 기운",
        "keyPoints": ["포인트1"]
      },
      {
        "year": ${currentYear + 4},
        "energy": "주요 기운",
        "keyPoints": ["포인트1"]
      }
    ],
    "lifelong": "평생 운명 예측 (3-4문장)"
  },
  "disasters": {
    "description": "일생에 닥칠 재난 (2-3문장)",
    "items": ["재난1", "재난2", "재난3"]
  },
  "blessings": {
    "description": "인생에서 만나게 될 복 (2-3문장)",
    "items": ["복1", "복2", "복3"]
  },
  "food": {
    "avoid": ["피해야 할 음식1", "피해야 할 음식2"],
    "recommend": ["좋은 음식1", "좋은 음식2", "좋은 음식3"]
  },
  "direction": {
    "good": "길한 방향 (용신 활용)",
    "description": "방향 관련 설명"
  },
  "color": {
    "good": ["좋은 색1", "좋은 색2"],
    "avoid": ["피해야 할 색1", "피해야 할 색2"]
  },
  "place": {
    "good": ["길한 장소1", "길한 장소2"],
    "description": "장소 관련 설명"
  },
  "overall": {
    "summary": "종합 의견 (3-4문장, 용신을 중심으로 결론)"
  }
}

반드시 유효한 JSON 형식으로만 응답하세요.`;

    console.log('🤖 OpenAI API 호출 시작...');

    // OpenAI API 호출 (JSON 형식 강제)
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,  // 창의성과 일관성 균형
      max_tokens: 3500,  // 상세한 JSON 응답을 위해 증가
      response_format: { type: "json_object" }  // JSON 형식 강제
    });

    const aiInterpretation = response.choices[0].message.content;

    console.log('✅ AI 해석 생성 완료');
    console.log('📊 토큰 사용량:', {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      estimatedCost: calculateCost(response.usage)
    });

    // 원본 AI 응답 터미널에 출력
    console.log('\n📝 ===== AI 원본 응답 (JSON) =====');
    console.log(aiInterpretation);
    console.log('===================================\n');

    // JSON 파싱
    let parsedData;
    try {
      parsedData = JSON.parse(aiInterpretation);
      console.log('✅ JSON 파싱 성공');
    } catch (error) {
      console.error('❌ JSON 파싱 실패:', error.message);
      console.error('원본 응답:', aiInterpretation);
      // JSON 파싱 실패 시 폴백 사용
      return generateFallbackInterpretation(sajuData);
    }

    // 용신 데이터 검증 (AI가 가끔 빼먹을 수 있음)
    if (!parsedData.yongshen || !parsedData.yongshen.element) {
      console.warn('⚠️ AI가 용신을 반환하지 않음, 폴백 용신 사용');
      parsedData.yongshen = {
        element: findFallbackYongshen(sajuData.wuxing),
        reason: "오행의 균형을 맞추기 위해 선택된 용신입니다.",
        xishen: "미상",
        jishen: "미상"
      };
    }

    // 점수 생성 (오행 분포 기반)
    const scores = generateScoresFromWuxing(sajuData.wuxing);

    // --- [NEW] Talisman Recommendation Logic (Expert System) ---
    // Logic: AI-Determined Yongshen (Element) + Samhap (Ally Animal)

    // 1. Get User's Year Zodiac (Ji)
    const userYearJi = sajuData.year.ji; // e.g. '자'

    // 2. Define Samhap (Three Harmony) Groups
    const SAMHAP = {
      '신': ['자', '진'], '자': ['신', '진'], '진': ['신', '자'], // Water Harmony
      '인': ['오', '술'], '오': ['인', '술'], '술': ['인', '오'], // Fire Harmony
      '해': ['묘', '미'], '묘': ['해', '미'], '미': ['해', '묘'], // Wood Harmony
      '사': ['유', '축'], '유': ['사', '축'], '축': ['사', '유']  // Metal Harmony
    };

    const myAllies = SAMHAP[userYearJi] || []; // e.g. ['신', '진']

    // [UPDATE] Randomize the allies to create 50:50 destiny variety
    if (Math.random() < 0.5) {
      myAllies.reverse();
    }

    // 3. Map AI-Determined Yongsin Element to Stems (Colors)
    const STEM_GROUPS = {
      '목': { yang: '갑', yin: '을' },
      '화': { yang: '병', yin: '정' },
      '토': { yang: '무', yin: '기' },
      '금': { yang: '경', yin: '신' },
      '수': { yang: '임', yin: '계' }
    };

    // Use AI's Yongshen!
    const targetElement = parsedData.yongshen.element; // e.g. '화'
    const targetStems = STEM_GROUPS[targetElement] || STEM_GROUPS['화']; // Default to Fire if error

    // 4. Find the Perfect Match
    let bestTalisman = null;
    let selectionReason = null;
    const YANG_BRANCHES = ['자', '인', '진', '오', '신', '술'];
    // 동물 맵
    const ANIMAL_MAP = { '자': '쥐', '축': '소', '인': '호랑이', '묘': '토끼', '진': '용', '사': '뱀', '오': '말', '미': '양', '신': '원숭이', '유': '닭', '술': '개', '해': '돼지' };

    for (const allyJi of myAllies) {
      const isAllyYang = YANG_BRANCHES.includes(allyJi);
      const stem = isAllyYang ? targetStems.yang : targetStems.yin;
      bestTalisman = stem + allyJi;

      selectionReason = {
        element: targetElement, // e.g. '화'
        stem: stem,           // e.g. '병'
        branch: allyJi,       // e.g. '인'
        branchAnimal: ANIMAL_MAP[allyJi], // "호랑이"
        userYearJi: ANIMAL_MAP[userYearJi], // "쥐"
        yongshenReason: parsedData.yongshen.reason // AI의 용신 선택 근거 포함
      };
      break;
    }

    if (!bestTalisman) {
      bestTalisman = '갑자';
      selectionReason = { element: '목', stem: '갑', branch: '자', branchAnimal: '쥐', userYearJi: ANIMAL_MAP[userYearJi] || '쥐' };
    }

    // -----------------------------------------------------------

    return {
      overall: parsedData.overall?.summary || parsedData.personality?.description || '총운 정보를 준비 중입니다.',
      wealth: parsedData.wealth?.description || '재물운 정보를 준비 중입니다.',
      love: parsedData.marriage?.description || '애정운 정보를 준비 중입니다.',
      career: parsedData.business?.advice || '직장운 정보를 준비 중입니다.',
      health: parsedData.health?.description || '건강운 정보를 준비 중입니다.',
      scores,
      oheng: sajuData.wuxing,
      talisman: {
        name: bestTalisman,
        reason: selectionReason
      },
      yongshen: parsedData.yongshen, // [NEW] AI 용신 정보 반환
      aiRawResponse: aiInterpretation,  // 원본 JSON 응답
      detailedData: parsedData  // 상세 데이터 전체
    };
  } catch (error) {
    console.error('❌ AI 사주 해석 실패:', error.message);

    // 에러 타입별 처리
    if (error.code === 'insufficient_quota') {
      console.error('OpenAI 할당량 초과, 폴백 사용');
    } else if (error.code === 'invalid_api_key') {
      console.error('OpenAI API 키 오류, 폴백 사용');
    }

    // 폴백: AI 실패 시 기본 메시지 반환
    return generateFallbackInterpretation(sajuData);
  }
}

/**
 * AI 응답 파싱 (텍스트에서 각 운세 추출) - Legacy Support
 * 현재는 JSON 응답을 강제하므로 거의 사용되지 않음
 */
function parseAIResponse(aiResponse) {
  return {};
}

/**
 * 폴백용 간단 용신 찾기 (가장 약한 오행)
 */
function findFallbackYongshen(wuxing) {
  return Object.keys(wuxing).reduce((min, key) =>
    wuxing[key] < wuxing[min] ? key : min
  );
}

/**
 * 오행 분포 기반 점수 생성
 * @param {Object} wuxing - 오행 분포
 * @returns {Object} 점수 객체
 */
export function generateScoresFromWuxing(wuxing) {
  // 오행 균형도를 점수로 환산
  // 개선 로직: 95 - (차이 * 0.5) -> 차이가 40이면 20점 감점 -> 75점
  const wuxingValues = Object.values(wuxing);
  const maxWuxing = Math.max(...wuxingValues);
  const minWuxing = Math.min(...wuxingValues);

  const diff = maxWuxing - minWuxing;
  const rawScore = 95 - (diff * 0.5);

  // 최하점 40점, 최고점 98점으로 제한
  const baseScore = Math.min(Math.max(rawScore, 40), 98);

  return {
    overall: Math.round(baseScore),
    wealth: Math.round(Math.min(baseScore + (wuxing.금 / 3), 100)),
    love: Math.round(Math.min(baseScore + (wuxing.화 / 3), 100)),
    career: Math.round(Math.min(baseScore + (wuxing.목 / 3), 100)),
    health: Math.round(Math.min(baseScore + (wuxing.토 / 3), 100))
  };
}

/**
 * AI 실패 시 폴백 해석 생성
 * @param {Object} sajuData - 사주 데이터
 * @returns {Object} 기본 해석
 */
function generateFallbackInterpretation(sajuData) {
  const scores = generateScoresFromWuxing(sajuData.wuxing);

  // 오행 기반 간단한 템플릿
  const dominantElement = Object.keys(sajuData.wuxing).reduce((a, b) =>
    sajuData.wuxing[a] > sajuData.wuxing[b] ? a : b
  );

  const elementMessages = {
    목: {
      overall: '나무처럼 굳센 의지로 성장하는 운세입니다.',
      wealth: '꾸준한 노력으로 재물이 쌓이는 시기입니다.',
      love: '솔직하고 담백한 만남이 예상됩니다.',
      career: '새로운 프로젝트에서 두각을 나타낼 수 있습니다.',
      health: '간 건강과 근육 피로에 유의하세요.'
    },
    화: {
      overall: '불처럼 열정적인 에너지가 가득한 시기입니다.',
      wealth: '공격적인 투자보다는 흐름을 타는 것이 좋습니다.',
      love: '화려하고 열정적인 사랑이 찾아올 수 있습니다.',
      career: '리더십을 발휘하여 팀을 이끄는 것이 좋습니다.',
      health: '심혈관 계통과 스트레스 관리가 필요합니다.'
    },
    토: {
      overall: '흙처럼 포용력 있고 안정적인 운세입니다.',
      wealth: '부동산이나 저축 등 안정 자산이 유리합니다.',
      love: '믿음직하고 편안한 관계가 지속됩니다.',
      career: '기반을 다지고 내실을 기하는 것이 중요합니다.',
      health: '소화기 계통 건강을 챙기세요.'
    },
    금: {
      overall: '금처럼 단단하고 결단력 있는 기운입니다.',
      wealth: '확실한 판단으로 이득을 볼 수 있습니다.',
      love: '명확하고 깔끔한 관계 정립이 필요합니다.',
      career: '원칙을 지키며 성과를 내는 시기입니다.',
      health: '호흡기와 피부 관리에 신경 쓰세요.'
    },
    수: {
      overall: '물처럼 유연하고 지혜로운 흐름입니다.',
      wealth: '자금 흐름이 원활하며 융통성이 필요합니다.',
      love: '깊고 감성적인 사랑을 할 수 있습니다.',
      career: '창의적인 아이디어가 빛을 발합니다.',
      health: '신장과 혈액 순환에 유의하세요.'
    }
  };

  const messages = elementMessages[dominantElement] || elementMessages.목;

  return {
    overall: messages.overall,
    wealth: messages.wealth,
    love: messages.love,
    career: messages.career,
    health: messages.health,
    scores,
    oheng: sajuData.wuxing,
    yongshen: { element: dominantElement, reason: "기본 오행 분석" }, // Fallback Yongshen
    talisman: { name: '갑자', reason: { element: '목', userYearJi: '쥐' } }, // Default
    detailedData: {
      personality: { description: messages.overall },
      wealth: { description: messages.wealth },
      marriage: { description: messages.love },
      business: { advice: messages.career },
      health: { description: messages.health },
      yongshen: { element: dominantElement, reason: "기본 오행 분석" }
    }
  };
}

/**
 * 비용 계산 (대략적인 추정)
 * @param {Object} usage - OpenAI 토큰 사용량
 * @returns {string} 예상 비용 (USD)
 */
function calculateCost(usage) {
  // gpt-3.5-turbo 기준: input $0.50/1M, output $1.50/1M
  // gpt-4o-mini 기준: input $0.15/1M, output $0.60/1M
  let inputCost, outputCost;

  if (GPT_MODEL === 'gpt-4o-mini') {
    inputCost = (usage.prompt_tokens / 1000000) * 0.15;
    outputCost = (usage.completion_tokens / 1000000) * 0.60;
  } else {
    // gpt-3.5-turbo (default)
    inputCost = (usage.prompt_tokens / 1000000) * 0.50;
    outputCost = (usage.completion_tokens / 1000000) * 1.50;
  }

  const total = inputCost + outputCost;
  return `$${total.toFixed(6)} (약 ₩${Math.round(total * 1300)})`;
}
