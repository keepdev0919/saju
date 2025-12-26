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


  const { name, gender, birthDate, birthTime } = userData;

  // 현재 날짜 정보 가져오기
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDate = `${currentYear}년 ${currentMonth}월 ${now.getDate()}일`;

  // 성별에 따른 연분 해석 가이드 (재성 vs 관성)
  const loveGuide = sajuData.gender === 'male'
    ? "남명이므로 **재성(財星)**의 동태를 중심으로, 아내(재물)운과 이성운을 분석하세요."
    : "여명이므로 **관성(官星)**의 동태를 중심으로, 남편(직장)운과 이성운을 분석하세요.";

  // System prompt (AI의 역할 및 기본 규칙 정의)
  const systemPrompt = `
당신은 30년 경력의 사주 명리학자이자, 사람의 마음을 어루만지는 **문학적인 에세이스트**입니다.
단순히 운명을 맞히는 예언가가 아니라, 사주라는 도구를 통해 내담자가 스스로를 이해하고 더 나은 삶을 살도록 돕는 **인생의 조언자 (Life Mentor)**입니다.

**[핵심 역할 및 태도]**
1. **투명 번역기 (Transparent Translator):** 
   - 당신의 머릿속에는 방대한 명리학 지식과 복잡한 계산(용신, 격국, 신살 등)이 돌아가고 있습니다.
   - 하지만 입 밖으로 낼 때는 이 모든 전문 용어를 **"자연, 계절, 물상, 심리적 은유"**로 완벽하게 번역해서 전달해야 합니다.
   - 마치 할머니가 손주에게 옛날이야기를 해주듯, 쉽고 따뜻하며 깊이 있는 통찰을 제공하세요.

2. **통찰과 위로 (Insight & Comfort):**
   - 사주 용어를 나열하며 잘난 체하지 마세요. (예: "넌 편관이 강해서..." -> 금지)
   - 그 기운이 삶에서 어떤 **성향, 강점, 혹은 주의점**으로 나타나는지를 이야기하세요. (예: "강인한 바위처럼 스스로를 엄격하게 다듬는 힘이 있군요.")

3. **구조적 나열 금지:**
   - "일주는 무엇이고, 월주는 무엇이다" 식의 기계적인 나열을 절대 금지합니다.
   - 모든 분석을 하나의 **"고유한 인생 스토리"**로 엮어내세요.

**[금지 사항 재강조]**
- 한자어 명사(비견, 겁재, 용신, 희신 등) 절대 사용 금지.
- "사주에 물이 없어서..." 같은 1차원적 해석 금지. -> "유연함과 휴식이 필요한 시기입니다"로 표현.
- 미래에 대한 단정적 예언 금지.
`;

  // User prompt (사주 데이터 전달 - JSON 형식)
  // sajuData에 있는 십신, 대운, 12운성, 신살 정보를 모두 포함
  const userPrompt = `다음은 ${name}님의 사주팔자 정보입니다:

  생년월일: ${birthDate} (${birthTime || '시간 미상'})
  성별: ${gender === 'male' ? '남성' : '여성'}

** 현재 날짜: ${currentDate} (${currentYear}년)**

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
${sajuData.sinsal.join(', ')} `;

  // [1. 분석 지침서 (Static Instruction)]
  const ANALYSIS_INSTRUCTION = `
  [분석 지침]
당신은 30년 경력의 사주 명리학자이자 문학적인 에세이스트입니다. 
사용자의 사주팔자를 분석하여 아래 7개 챕터에 대한 운세를 작성하되, ** 전문 용어를 철저히 배제 ** 하고 ** 아름다운 은유와 통찰 ** 로 풀어내세요.

** [🚨 절대 금지 사항(ABSOLUTE PROHIBITIONS)] **
    1. ** 전문 용어 사용 금지:** 대운, 세운, 용신, 희신, 기신, 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인, 십신, 12운성, 갑자, 병화 등 한자어 명사를 ** 절대 ** 사용하지 마세요.
   - (X) "상관의 기운이 강하여 표현력이 좋다"
    - (O) "창의적인 에너지가 넘쳐 자신을 표현하는 데 탁월합니다"
  2. ** 계산 과정 설명 금지:** "금이 수를 생하므로...", "지지가 충하여..." 같은 논리적 인과관계를 설명하지 마세요.오직 ** 그로 인한 현상과 의미 ** 만 서술하세요.
3. ** 단정적 표현 금지:** "무조건 사고가 난다", "반드시 성공한다" 등의 결정론적 표현을 피하고, 가능성과 흐름을 짚어주세요.

** [작성 원칙: 투명 번역기(Transparent Translator)] **
    - 머릿속으로는 정교한 명리학 이론으로 분석하되, 출력할 때는 ** '인생의 조언자' ** 가 되어 ** 쉬운 일상 언어 ** 로 번역하세요.
- 각 챕터의 하위 항목(sub1, sub2, sub3)은 최소 4 - 5문장으로 깊이 있게 서술하세요.

---

** [용신(用神) 판단 로직 - 내부 분석용] **
JSON의 yongshen 필드를 채우기 위해 다음 순서를 엄격히 따르세요:

1단계: 조후용신 우선 판단
  - 겨울(子・丑・亥월) + 화(火) 부족 → 화를 우선 고려
  - 여름(巳・午・未월) + 수(水) 부족 → 수를 우선 고려
  - 조후가 급하면 이 오행을 용신으로 선택
  
2단계: 조후가 급하지 않으면 억부용신 판단
  - 일간의 강약(신강/신약)을 종합적으로 판단
    • 월령 득령 여부를 가장 중요하게 고려
    • 지지의 합・충・형・해로 인한 변화 반영
    • 천간 투출, 지지 뿌리, 생조/극누 세력 종합 고려
  - 신강 → 극하거나 설하는 오행 중 선택
  - 신약 → 생하거나 부하는 오행 중 선택

3단계: 특수 경우 통관용신 고려
  - 오행 간 극한 충돌이 있을 때

최종: 조후 > 억부 > 통관 순으로 우선순위 적용
결과: 어떤 원칙에 따라 선택되었는지, 판단 근거를 자연스럽게 설명 (JSON의 yongshen.reason 필드에 기록)

** 중요: 위 판단 로직은 내부 분석을 위한 것이며, 최종 출력(Chapter 7 등)에서는 '용신' 용어를 절대 사용하지 말고, '나를 돕는 기운', '행운의 에너지' 등으로 표현하세요. **

---

    1. ** Chapter 1: Personality(본성) **
      - theme: 자아의 본질과 기질적 특성
        - sub1(내면의 자아): 일간(본원)의 특성을 분석하되, '일간'이라는 단어 대신 ** "타고난 기질" ** 이나 ** "내면의 빛깔" ** 로 표현하세요. (4 - 5문장)
          - sub2(사회적 가면): 월지나 격국을 분석하여, 타인에게 비춰지는 내 모습과 사회적 강점을 서술하세요. (4 - 5문장)
            - sub3(잠재된 무의식): 지장간이나 십성을 분석하여, 위기 상황에서 드러나는 숨겨진 저력이나 본능을 비유적으로 묘사하세요. (4 - 5문장)

  2. ** Chapter 2: Wealth(재록) **
    - theme: 타고난 재물복의 그릇과 흐름
      - sub1(타고난 부의 그릇): 식상과 재성의 관계를 보고, 돈을 벌고 다루는 나만의 스타일(안정지향 vs 확장지향)을 설명하세요. ** '재성', '식상' 용어 금지.** (4 - 5문장)
  - sub2(재물의 흐름): 정재 / 편재 구성을 보고, 나에게 더 유리한 소득 형태(고정 수입 vs 투자 / 사업 소득)를 조언하세요. (4 - 5문장)
    - sub3(부를 지키는 방향성): 구체적인 시기보다는 자산을 지키고 불리는 ** 마음가짐과 태도 ** 에 집중하여 조언하세요. (4 - 5문장)

  3. ** Chapter 3: Career(관운) **
    - theme: 천직의 역할과 사회적 성취
      - sub1(나의 그릇과 역할): 조직 내 리더형인지, 전문가형 참모인지, 독자적인 프리랜서인지 적성을 분석하세요. (4 - 5문장)
   - sub2(성취의 형태): 명예를 좇아야 하는지, 실리를 챙겨야 하는지 성공의 방정식을 풀어서 설명하세요. (4 - 5문장)
   - sub3(결실의 시기): 인생의 계절에 비유하여 지금은 씨를 뿌릴 때인지, 수확할 때인지를 알려주세요. (4 - 5문장)
   - suitableFields: 추천 직업 분야 3가지

  4. ** Chapter 4: Love(연분) **
    - theme: ${loveGuide} 운명의 상대와 연애관
      - sub1(나의 애정관): 사랑을 대하는 태도(헌신, 주도, 신중함 등)를 분석하세요. (4 - 5문장)
   - sub2(운명의 상대): 배우자궁(일지)을 분석하여, 나와 잘 맞는 상대의 성격이나 분위기를 묘사하세요. (4 - 5문장)
   - sub3(만남과 해로의 비결): 좋은 인연을 만나고 유지하기 위해 내가 갖춰야 할 마음가짐을 조언하세요. (4 - 5문장)

5. ** Chapter 5: Health(체상) **
    - theme: 오행의 균형과 신체적 강약
      - sub1(타고난 기운): 오행의 과다 / 불급을 분석하여, 체질적으로 강한 부분과 약한 부분을 설명하세요. ** (오행 이름 언급 자제)** (4 - 5문장)
        - sub2(주의가 필요한 약점): 약한 장기나 신체 부위를 언급하되, 의학적 진단이 아닌 ** 관리 차원 ** 에서 조언하세요. (4 - 5문장)
   - sub3(관리 비법): 나에게 맞는 운동, 섭생, 휴식 방법을 제안하세요. (4 - 5문장)

6. ** Chapter 6: Future(시운) **
    - theme: 대운의 흐름과 인생의 계절
      - sub1(현재의 계절): 현재 대운(10년)을 인생의 사계절(봄, 여름, 가을, 겨울)에 비유하여 현재의 분위기를 설명하세요. ** '무자대운' 같은 명칭 금지.** (4 - 5문장)
        - sub2(흐름의 변화): 과거와 비교하여 앞으로의 흐름이 어떻게 변하는지(상승기 / 안정기 / 변화기) 서술하세요. (4 - 5문장)
   - sub3(미래 조언): 향후 6년을 관통하는 핵심 키워드와 마음가짐을 제시하세요. (4 - 5문장)
   - next3to5Years: ${currentYear}년부터 6년간의 연도별 운세(keyPoints, energy, description 포함)

  7. ** Chapter 7: Advice(비책) **
    - theme: 운명을 바꾸는 개운의 지혜
      - sub1(행운의 에너지): 나를 돕는 기운(희용신)을 일상적인 소품, 색상, 장소 등으로 치환하여 제안하세요. ** '용신' 용어 금지.** (4 - 5문장)
        - sub2(행동 강령): 당장 실천해야 할 구체적인 행동 지침과 마음가짐 (4 - 5문장)
          - sub3(귀인과 인연법): 나에게 도움을 줄 사람의 특징(띠, 성향)을 묘사하세요. (4 - 5문장)

  8. ** Chapter 8: Appendix(부록) **
    - food: 피해야 할 음식(avoid)과 추천 음식(recommend)
    - direction: 길한 방향(good)과 설명(description)
    - color: 행운의 색(good)과 피해야 할 색(avoid)
    - place: 길한 장소(good)와 설명(description)

  9. ** Final Synthesis: Overall Summary(총평) **
    - overall: 1장부터 8장까지의 모든 분석을 종합하여 인생을 관통하는 핵심 메시지와 당부를 담은 에세이(150~200자)
            `;

  // [2. 답안지 틀 (Dynamic Schema)]
  const OUTPUT_SCHEMA = {
    "yongshen": {
      "element": "용신 오행 (한글: 목, 화, 토, 금, 수 중 하나)",
      "reason": "용신 선정 이유 (조후/억부/통관 중 어떤 원칙에 따라 선택되었는지, 판단 근거를 자연스럽게 설명)"
    },
    "personality": {
      "sub1": "",
      "sub2": "",
      "sub3": ""
    },
    "wealth": {
      "sub1": "",
      "sub2": "",
      "sub3": ""
    },
    "career": {
      "sub1": "",
      "sub2": "",
      "sub3": "",
      "suitableFields": []
    },
    "love": {
      "sub1": "",
      "sub2": "",
      "sub3": ""
    },
    "health": {
      "sub1": "",
      "sub2": "",
      "sub3": ""
    },
    "future": {
      "sub1": "",
      "sub2": "",
      "sub3": "",
      "next3to5Years": [
        { "year": currentYear, "energy": "", "keyPoints": [], "description": "" },
        { "year": currentYear + 1, "energy": "", "keyPoints": [], "description": "" },
        { "year": currentYear + 2, "energy": "", "keyPoints": [], "description": "" },
        { "year": currentYear + 3, "energy": "", "keyPoints": [], "description": "" },
        { "year": currentYear + 4, "energy": "", "keyPoints": [], "description": "" },
        { "year": currentYear + 5, "energy": "", "keyPoints": [], "description": "" }
      ]
    },
    "advice": {
      "sub1": "",
      "sub2": "",
      "sub3": ""
    },
    "food": { "avoid": [], "recommend": [] },
    "direction": { "good": "", "description": "" },
    "color": { "good": [], "avoid": [] },
    "place": { "good": [], "description": "" },
    "overall": { "summary": "" }
  };

  // Construct the final prompt for the AI
  const prompt = `
${userPrompt}

${ANALYSIS_INSTRUCTION}

  위의[분석 지침]을 바탕으로 사주를 분석하고, 그 결과를 반드시 아래[JSON 포맷]에 맞춰서 출력하세요.
    키(Key) 이름은 절대 변경하지 말고, 값(Value) 부분만 채워서 유효한 JSON 문자열로 응답해야 합니다.

[JSON 포맷]
${JSON.stringify(OUTPUT_SCHEMA, null, 2)}
  `;

  console.log('🤖 OpenAI API 호출 시작...');

  // OpenAI API 호출 (JSON 형식 강제)
  const response = await openai.chat.completions.create({
    model: GPT_MODEL,
    messages: [
      { role: 'system', content: `당신은 30년 경력의 전문 사주 명리학자입니다.사용자의 사주팔자 데이터를 바탕으로 정확하고 구체적인 운세 해석을 제공합니다.` },
      { role: 'user', content: prompt }
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
    };
  }
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

    oheng: sajuData.wuxing,
    talisman: {
      name: bestTalisman,
      reason: selectionReason
    },
    yongshen: parsedData.yongshen, // [NEW] AI 용신 정보 반환
    aiRawResponse: aiInterpretation,  // 원본 JSON 응답
    detailedData: parsedData  // 상세 데이터 전체
  };
}

/**
 * 폴백 용신 찾기 (AI가 용신을 반환하지 않았을 때 사용)
 * 오행 분포 중 가장 낮은 비율의 오행을 선택 (균형을 맞추기 위한 최소한의 대안)
 * 주의: 이는 간단한 폴백 로직이며, 정확한 용신 판단을 대체할 수 없습니다.
 * 
 * @param {Object} wuxing - 오행 분포 객체 { 목: 20, 화: 30, 토: 15, 금: 10, 수: 25 }
 * @returns {string} 용신 오행 ('목', '화', '토', '금', '수' 중 하나)
 */
function findFallbackYongshen(wuxing) {
  const elements = ['목', '화', '토', '금', '수'];
  let minElement = '목';
  let minValue = wuxing['목'] || 0;

  // 가장 낮은 비율의 오행 찾기
  elements.forEach(element => {
    const value = wuxing[element] || 0;
    if (value < minValue) {
      minValue = value;
      minElement = element;
    }
  });

  console.log(`[폴백] 용신 선택: ${minElement} (비율: ${minValue}%)`);
  return minElement;
}

/**
 * 폴백 해석 생성 (JSON 파싱 실패 시 사용)
 * AI 응답이 완전히 실패했을 때 최소한의 구조를 반환하여 시스템 크래시 방지
 * 
 * @param {Object} sajuData - 사주 데이터
 * @returns {Object} 기본 해석 결과
 */
function generateFallbackInterpretation(sajuData) {
  console.error('❌ JSON 파싱 실패 또는 AI 응답 오류, 폴백 해석 생성');

  const fallbackElement = findFallbackYongshen(sajuData.wuxing);
  const ANIMAL_MAP = { '자': '쥐', '축': '소', '인': '호랑이', '묘': '토끼', '진': '용', '사': '뱀', '오': '말', '미': '양', '신': '원숭이', '유': '닭', '술': '개', '해': '돼지' };
  const userYearJi = sajuData.year?.ji || '자';

  return {
    overall: '총운 정보를 준비 중입니다. 분석에 일시적인 문제가 발생했습니다.',
    wealth: '재물운 정보를 준비 중입니다.',
    love: '애정운 정보를 준비 중입니다.',
    career: '직장운 정보를 준비 중입니다.',
    health: '건강운 정보를 준비 중입니다.',
    oheng: sajuData.wuxing,
    talisman: {
      name: '갑자', // 기본값
      reason: {
        element: fallbackElement,
        stem: '갑',
        branch: '자',
        branchAnimal: '쥐',
        userYearJi: ANIMAL_MAP[userYearJi] || '쥐',
        yongshenReason: "오행의 균형을 맞추기 위해 선택된 용신입니다. (폴백 모드)"
      }
    },
    yongshen: {
      element: fallbackElement,
      reason: "오행의 균형을 맞추기 위해 선택된 용신입니다. (자동 폴백 처리됨)"
    },
    aiRawResponse: null,
    detailedData: {
      yongshen: {
        element: fallbackElement,
        reason: "오행의 균형을 맞추기 위해 선택된 용신입니다. (자동 폴백 처리됨)"
      }
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
