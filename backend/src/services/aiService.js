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
 * @param {Object} sajuData - lunar-javascript로 계산된 사주 데이터
 * @param {Object} userData - 사용자 기본 정보 (이름, 성별 등)
 * @returns {Object} 해석 결과
 */
export async function interpretSajuWithAI(sajuData, userData) {
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
해석은 긍정적이면서도 현실적이어야 하며, 실질적인 조언을 포함해야 합니다.
반드시 유효한 JSON 형식으로만 응답하세요.

**중요: 현재 날짜는 ${currentDate} (${currentYear}년)입니다. 
timing 필드(business.timing, marriage.timing)는 미래 예측이므로 반드시 ${currentYear}년 이후의 날짜만 언급하세요.
description 필드들은 과거 운세 패턴이나 흐름을 자연스럽게 언급해도 되지만, 과거 날짜를 미래처럼 표현하지 마세요.**`;

    // User prompt (사주 데이터 전달 - JSON 형식)
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

용신(用神): ${sajuData.yongshen}

위 사주 정보를 바탕으로 다음 JSON 형식으로 상세한 해석을 제공해주세요:

{
  "personality": {
    "description": "일간을 중심으로 한 성격 특성 (3-4문장)",
    "strengths": ["강점1", "강점2", "강점3"],
    "weaknesses": ["약점1", "약점2"]
  },
  "business": {
    "suitableFields": ["적합한 분야1", "적합한 분야2", "적합한 분야3"],
    "timing": "사업운이 트이는 시기 (${currentYear}년 이후의 미래 날짜만 언급, 예: '${currentYear}년 하반기', '${currentYear + 1}년 상반기' 등)",
    "advice": "사업 관련 조언 (2-3문장, 과거 운세 흐름 언급 가능)"
  },
  "wealth": {
    "description": "재물운 해석 (2-3문장, 과거 운세 패턴 언급 가능)",
    "income": "수입 관련 조언",
    "expense": "지출 관리 조언",
    "investment": "투자 관련 조언"
  },
  "marriage": {
    "description": "결혼운 해석 (2-3문장, 과거 운세 언급 가능)",
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
      "energy": "주요 기운 (예: 상관·편재)",
      "description": "${currentYear}년 운세 (2-3문장, 과거와 비교 가능)",
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
        "keyPoints": ["포인트1", "포인트2"]
      },
      {
        "year": ${currentYear + 1},
        "energy": "주요 기운",
        "keyPoints": ["포인트1", "포인트2"]
      },
      {
        "year": ${currentYear + 2},
        "energy": "주요 기운",
        "keyPoints": ["포인트1", "포인트2"]
      },
      {
        "year": ${currentYear + 3},
        "energy": "주요 기운",
        "keyPoints": ["포인트1", "포인트2"]
      },
      {
        "year": ${currentYear + 4},
        "energy": "주요 기운",
        "keyPoints": ["포인트1", "포인트2"]
      }
    ],
    "lifelong": "평생 운명 예측 (3-4문장, 과거 패턴 언급 가능)"
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
    "good": "길한 방향 (예: 북쪽)",
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
    "summary": "종합 의견 (3-4문장, 과거와 미래를 종합적으로 언급 가능)"
  }
}

**중요 지침:**
1. timing 필드(business.timing, marriage.timing)는 미래 예측이므로 반드시 ${currentYear}년 이후의 날짜만 언급하세요.
2. description 필드들은 과거 운세 패턴이나 흐름을 자연스럽게 언급해도 됩니다 (예: "지난 몇 년간의 운세 흐름", "과거와 비교하여" 등).
3. 과거 날짜를 미래처럼 표현하지 마세요 (예: "2023년부터 좋아질 것입니다" ❌ → "2023년에는 이런 패턴이 있었고, ${currentYear}년 하반기부터는..." ✅).

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
      max_tokens: 3000,  // 상세한 JSON 응답을 위해 증가
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

    // 점수 생성 (오행 분포 기반)
    const scores = generateScoresFromWuxing(sajuData.wuxing);

    // 기존 형식과 호환되도록 변환 (하위 호환성 유지)
    return {
      overall: parsedData.overall?.summary || parsedData.personality?.description || '총운 정보를 준비 중입니다.',
      wealth: parsedData.wealth?.description || '재물운 정보를 준비 중입니다.',
      love: parsedData.marriage?.description || '애정운 정보를 준비 중입니다.',
      career: parsedData.business?.advice || '직장운 정보를 준비 중입니다.',
      health: parsedData.health?.description || '건강운 정보를 준비 중입니다.',
      scores,
      oheng: sajuData.wuxing,
      aiRawResponse: aiInterpretation,  // 원본 JSON 응답
      detailedData: parsedData  // 상세 데이터 전체 (새로운 필드)
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
 * AI 응답 파싱 (텍스트에서 각 운세 추출)
 * @param {string} aiResponse - AI가 생성한 텍스트
 * @returns {Object} 파싱된 운세 객체
 */
function parseAIResponse(aiResponse) {
  const result = {};

  // 정규식으로 각 운세 섹션 추출
  const patterns = {
    overall: /(?:1\.|총운|전반적)[\s\S]*?:\s*(.+?)(?=\n\n|\n2\.|\n재물운|$)/i,
    wealth: /(?:2\.|재물운)[\s\S]*?:\s*(.+?)(?=\n\n|\n3\.|\n애정운|$)/i,
    love: /(?:3\.|애정운)[\s\S]*?:\s*(.+?)(?=\n\n|\n4\.|\n직장운|$)/i,
    career: /(?:4\.|직장운)[\s\S]*?:\s*(.+?)(?=\n\n|\n5\.|\n건강운|$)/i,
    health: /(?:5\.|건강운)[\s\S]*?:\s*(.+?)(?=\n\n|$)/i
  };

  Object.keys(patterns).forEach(key => {
    const match = aiResponse.match(patterns[key]);
    if (match) {
      result[key] = match[1].trim();
    }
  });

  return result;
}

/**
 * 오행 분포 기반 점수 생성
 * @param {Object} wuxing - 오행 분포
 * @returns {Object} 점수 객체
 */
function generateScoresFromWuxing(wuxing) {
  // 오행 균형도를 점수로 환산
  // 오행 균형도를 점수로 환산
  // 기존 로직: 100 - (Max - Min) -> 차이가 40만 나도 바로 60점(최하점)이 되는 문제 수정
  // 개선 로직: 95 - (차이 * 0.5) -> 차이가 40이면 20점 감점 -> 75점 (훨씬 자연스러움)
  const wuxingValues = Object.values(wuxing);
  const maxWuxing = Math.max(...wuxingValues);
  const minWuxing = Math.min(...wuxingValues);

  const diff = maxWuxing - minWuxing;
  const rawScore = 95 - (diff * 0.5); // 차이의 절반만 감점

  // 최하점 40점, 최고점 98점으로 제한
  const baseScore = Math.min(Math.max(rawScore, 40), 98);

  return {
    overall: Math.round(baseScore),
    wealth: Math.round(Math.min(baseScore + (wuxing.금 / 3), 100)),   // 가산점 비율 조정 (1/2 -> 1/3)
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
      overall: '기본값',
      wealth: '기본값',
      love: '기본값',
      career: '기본값',
      health: '기본값'
    },
    화: {
      overall: '기본값',
      wealth: '기본값',
      love: '기본값',
      career: '기본값',
      health: '기본값'
    },
    토: {
      overall: '기본값',
      wealth: '기본값',
      love: '기본값',
      career: '기본값',
      health: '기본값'
    },
    금: {
      overall: '기본값',
      wealth: '기본값',
      love: '기본값',
      career: '기본값',
      health: '기본값'
    },
    수: {
      overall: '기본값',
      wealth: '기본값',
      love: '기본값',
      career: '기본값',
      health: '기본값'
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
    oheng: sajuData.wuxing
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
