# Lunar-JavaScript → OpenAI API 연동 가이드

## 📋 목차

1. [개요](#개요)
2. [전체 아키텍처](#전체-아키텍처)
3. [1단계: Lunar-JavaScript로 사주 계산](#1단계-lunar-javascript로-사주-계산)
4. [2단계: OpenAI API로 운세 해석 생성](#2단계-openai-api로-운세-해석-생성)
5. [3단계: 결과 저장 및 반환](#3단계-결과-저장-및-반환)
6. [프롬프트 상세 분석](#프롬프트-상세-분석)
7. [에러 처리 및 폴백](#에러-처리-및-폴백)
8. [비용 및 토큰 관리](#비용-및-토큰-관리)
9. [트러블슈팅](#트러블슈팅)

---

## 개요

이 문서는 **lunar-javascript** 라이브러리를 사용하여 사주팔자를 계산하고, 그 결과를 **OpenAI API**에 전달하여 맞춤형 운세 해석을 생성하는 전체 과정을 상세히 설명합니다.

### 기술 스택

- **lunar-javascript**: 사주팔자 계산 라이브러리
- **OpenAI API**: GPT 모델을 통한 AI 운세 해석
- **Node.js/Express**: 백엔드 서버
- **MySQL**: 결과 저장

### 주요 파일

```
backend/
├── src/
│   ├── services/
│   │   ├── sajuService.js      # lunar-javascript 사주 계산
│   │   └── aiService.js        # OpenAI API 연동
│   └── controllers/
│       └── sajuController.js   # API 엔드포인트 및 흐름 제어
```

---

## 전체 아키텍처

```
┌─────────────────┐
│  프론트엔드      │
│  (사용자 입력)   │
└────────┬────────┘
         │ POST /api/saju/calculate
         ▼
┌─────────────────────────────────────┐
│  sajuController.js                   │
│  - 사용자 정보 조회                  │
│  - 1단계: 사주 계산 호출             │
│  - 2단계: AI 해석 호출               │
│  - 3단계: 결과 저장                  │
└────────┬────────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ sajuService.js  │  │  aiService.js   │
│                 │  │                 │
│ lunar-javascript│  │  OpenAI API      │
│ 사주 계산        │  │  운세 해석 생성  │
└─────────────────┘  └─────────────────┘
         │                 │
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  MySQL Database │
         │  saju_results   │
         └─────────────────┘
```

---

## 1단계: Lunar-JavaScript로 사주 계산

### 1.1 입력 데이터

```javascript
// 사용자로부터 받는 데이터
{
  birthDate: "1990-05-15",      // 생년월일 (YYYY-MM-DD)
  birthTime: "14:30",           // 생시 (HH:MM) 또는 null
  calendarType: "solar"         // "solar" (양력) 또는 "lunar" (음력)
}
```

### 1.2 사주 계산 과정

**파일**: `backend/src/services/sajuService.js`

#### Step 1: 날짜 파싱

```javascript
const [year, month, day] = birthDate.split('-').map(Number);
const [hour, minute] = birthTime && birthTime !== '모름'
  ? birthTime.split(':').map(Number)
  : [12, 0]; // 시간 모름: 정오로 기본 설정
```

#### Step 2: Lunar 객체 생성

```javascript
let lunar;

// 양력/음력에 따라 lunar 객체 생성
if (calendarType === 'solar') {
  const solar = Solar.fromYmd(year, month, day);
  lunar = solar.getLunar();
} else {
  lunar = Lunar.fromYmd(year, month, day);
}
```

**lunar-javascript 라이브러리 사용**:
- `Solar.fromYmd()`: 양력 날짜를 Solar 객체로 변환
- `getLunar()`: Solar 객체를 Lunar 객체로 변환
- `Lunar.fromYmd()`: 음력 날짜를 직접 Lunar 객체로 생성

#### Step 3: 사주팔자(八字) 추출

```javascript
// 사주팔자 객체 생성
const eightChar = lunar.getEightChar();

// 년주, 월주, 일주 추출
const yearGanZhi = eightChar.getYear();      // 년간지 (예: "甲子")
const monthGanZhi = eightChar.getMonth();    // 월간지
const dayGanZhi = eightChar.getDay();        // 일간지
const dayMaster = eightChar.getDayGan();     // 일간 (日干)
```

**간지(干支) 구조**:
- **간(干)**: 10개 (갑을병정무기경신임계)
- **지(支)**: 12개 (자축인묘진사오미신유술해)
- **간지**: 간 + 지 조합 (예: "甲子", "乙丑")

#### Step 4: 시주 계산 (시간이 있는 경우)

```javascript
let hourGanZhi = null;
if (birthTime && birthTime !== '모름') {
  const solarTime = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunarTime = solarTime.getLunar();
  const timeEightChar = lunarTime.getEightChar();
  hourGanZhi = timeEightChar.getTime();
}
```

#### Step 5: 오행(五行) 분석

```javascript
function calculateWuXing(eightChar, hourGanZhi) {
  const wuxing = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 천간 오행 매핑
  const ganWuxingMap = {
    '甲': '목', '乙': '목',  // 갑을 = 목
    '丙': '화', '丁': '화',  // 병정 = 화
    '戊': '토', '己': '토',  // 무기 = 토
    '庚': '금', '辛': '금',  // 경신 = 금
    '壬': '수', '癸': '수'   // 임계 = 수
  };

  // 지지 오행 매핑
  const jiWuxingMap = {
    '子': '수', '丑': '토', '寅': '목', '卯': '목',
    '辰': '토', '巳': '화', '午': '화', '未': '토',
    '申': '금', '酉': '금', '戌': '토', '亥': '수'
  };

  // 년주, 월주, 일주의 간지에서 오행 추출
  const yearGZ = eightChar.getYear();
  const monthGZ = eightChar.getMonth();
  const dayGZ = eightChar.getDay();

  // 천간 오행 추출 (가중치 2)
  [yearGZ[0], monthGZ[0], dayGZ[0]].forEach(gan => {
    const element = ganWuxingMap[gan];
    if (element) wuxing[element] += 2;
  });

  // 지지 오행 추출 (가중치 1)
  [yearGZ[1], monthGZ[1], dayGZ[1]].forEach(ji => {
    const element = jiWuxingMap[ji];
    if (element) wuxing[element] += 1;
  });

  // 시주가 있으면 추가
  if (hourGanZhi) {
    const hourGan = hourGanZhi[0];
    const hourJi = hourGanZhi[1];
    if (ganWuxingMap[hourGan]) wuxing[ganWuxingMap[hourGan]] += 2;
    if (jiWuxingMap[hourJi]) wuxing[jiWuxingMap[hourJi]] += 1;
  }

  // 백분율로 변환
  const total = Object.values(wuxing).reduce((sum, val) => sum + val, 0);
  if (total > 0) {
    Object.keys(wuxing).forEach(key => {
      wuxing[key] = Math.round((wuxing[key] / total) * 100);
    });
  }

  return wuxing;
}
```

**오행 계산 로직**:
- 천간(간): 가중치 2
- 지지(지): 가중치 1
- 시주: 시간이 있으면 추가 계산
- 최종: 백분율로 변환

#### Step 6: 용신(用神) 찾기

```javascript
function findYongShen(wuxing) {
  // 부족한 오행을 용신으로 선택
  const minElement = Object.keys(wuxing).reduce((min, key) =>
    wuxing[key] < wuxing[min] ? key : min
  );
  return minElement;
}
```

**용신**: 오행 중 가장 부족한 요소를 찾아 보완하는 오행

### 1.3 반환 데이터 구조

```javascript
{
  year: { gan: '갑', ji: '자' },      // 년주
  month: { gan: '을', ji: '축' },     // 월주
  day: { gan: '병', ji: '인' },       // 일주
  hour: { gan: '정', ji: '묘' },      // 시주 (시간 모름: { gan: '?', ji: '?' })
  dayMaster: '병',                    // 일간 (日干)
  wuxing: {                           // 오행 분포 (백분율)
    목: 20,
    화: 60,
    토: 10,
    금: 5,
    수: 5
  },
  yongshen: '수',                     // 용신
  calendarType: 'solar',              // 양력/음력
  birthDate: '1990-05-15',
  birthTime: '14:30'
}
```

---

## 2단계: OpenAI API로 운세 해석 생성

### 2.1 입력 데이터

**파일**: `backend/src/services/aiService.js`

```javascript
// 1단계에서 받은 사주 데이터
const sajuData = {
  year: { gan: '갑', ji: '자' },
  month: { gan: '을', ji: '축' },
  day: { gan: '병', ji: '인' },
  hour: { gan: '정', ji: '묘' },
  dayMaster: '병',
  wuxing: { 목: 20, 화: 60, 토: 10, 금: 5, 수: 5 },
  yongshen: '수'
};

// 사용자 정보
const userData = {
  name: '홍길동',
  gender: 'male',        // 'male' or 'female'
  birthDate: '1990-05-15',
  birthTime: '14:30'
};
```

### 2.2 현재 날짜 동적 계산

```javascript
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentDate = `${currentYear}년 ${currentMonth}월 ${now.getDate()}일`;
```

**목적**: 프롬프트에 현재 날짜를 포함하여 미래 날짜만 예측하도록 지시

### 2.3 System Prompt 구성

```javascript
const systemPrompt = `당신은 30년 경력의 전문 사주 명리학자입니다.
사용자의 사주팔자 데이터를 바탕으로 정확하고 구체적인 운세 해석을 제공합니다.
해석은 긍정적이면서도 현실적이어야 하며, 실질적인 조언을 포함해야 합니다.
반드시 유효한 JSON 형식으로만 응답하세요.

**중요: 현재 날짜는 ${currentDate} (${currentYear}년)입니다. 
timing 필드(business.timing, marriage.timing)는 미래 예측이므로 반드시 ${currentYear}년 이후의 날짜만 언급하세요.
description 필드들은 과거 운세 패턴이나 흐름을 자연스럽게 언급해도 되지만, 과거 날짜를 미래처럼 표현하지 마세요.**`;
```

**System Prompt 역할**:
- AI의 역할 정의 (전문 사주 명리학자)
- 응답 형식 지정 (JSON)
- 날짜 관련 제약 조건 명시

### 2.4 User Prompt 구성

User Prompt는 사주 데이터와 사용자 정보를 포함하여 상세한 JSON 형식 응답을 요청합니다.

#### 주요 구성 요소

1. **사용자 기본 정보**
   ```javascript
   생년월일: ${birthDate} (${birthTime || '시간 미상'})
   성별: ${gender === 'male' ? '남성' : '여성'}
   ```

2. **현재 날짜 정보**
   ```javascript
   **현재 날짜: ${currentDate} (${currentYear}년)**
   ```

3. **사주팔자 데이터**
   ```javascript
   사주팔자:
   - 년주: ${sajuData.year.gan}${sajuData.year.ji}
   - 월주: ${sajuData.month.gan}${sajuData.month.ji}
   - 일주: ${sajuData.day.gan}${sajuData.day.ji} (일간: ${sajuData.dayMaster})
   - 시주: ${sajuData.hour.gan}${sajuData.hour.ji}
   ```

4. **오행 분포**
   ```javascript
   오행 분포:
   - 목(木): ${sajuData.wuxing.목}%
   - 화(火): ${sajuData.wuxing.화}%
   - 토(土): ${sajuData.wuxing.토}%
   - 금(金): ${sajuData.wuxing.금}%
   - 수(水): ${sajuData.wuxing.수}%
   ```

5. **용신 정보**
   ```javascript
   용신(用神): ${sajuData.yongshen}
   ```

6. **JSON 응답 형식 요청**
   - personality (성격 특성)
   - business (사업)
   - wealth (재산)
   - marriage (결혼)
   - health (건강)
   - future (향후 예측: 현재 년도부터 5년간)
   - disasters (재난)
   - blessings (복)
   - food (음식)
   - direction (방향)
   - color (색)
   - place (장소)
   - overall (종합 의견)

### 2.5 OpenAI API 호출

```javascript
const response = await openai.chat.completions.create({
  model: GPT_MODEL,                    // 'gpt-3.5-turbo' or 'gpt-4o-mini'
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.7,                    // 창의성과 일관성 균형
  max_tokens: 3000,                    // 상세한 JSON 응답을 위해 증가
  response_format: { type: "json_object" }  // JSON 형식 강제
});
```

**API 파라미터 설명**:
- `model`: 사용할 GPT 모델 (환경 변수 `OPENAI_MODEL`로 제어)
- `temperature`: 0.7 = 창의성과 일관성의 균형
- `max_tokens`: 3000 = 상세한 JSON 응답을 위한 충분한 토큰
- `response_format`: JSON 형식 강제 (중요!)

### 2.6 응답 처리

```javascript
const aiInterpretation = response.choices[0].message.content;

// 토큰 사용량 로깅
console.log('📊 토큰 사용량:', {
  inputTokens: response.usage.prompt_tokens,
  outputTokens: response.usage.completion_tokens,
  totalTokens: response.usage.total_tokens,
  estimatedCost: calculateCost(response.usage)
});

// JSON 파싱
let parsedData;
try {
  parsedData = JSON.parse(aiInterpretation);
  console.log('✅ JSON 파싱 성공');
} catch (error) {
  console.error('❌ JSON 파싱 실패:', error.message);
  // 폴백 사용
  return generateFallbackInterpretation(sajuData);
}
```

### 2.7 점수 생성 (오행 기반)

```javascript
function generateScoresFromWuxing(wuxing) {
  // 오행 균형도를 점수로 환산
  const wuxingValues = Object.values(wuxing);
  const maxWuxing = Math.max(...wuxingValues);
  const minWuxing = Math.min(...wuxingValues);
  const balance = 100 - (maxWuxing - minWuxing);
  const baseScore = Math.min(Math.max(balance, 60), 95);

  return {
    overall: Math.round(baseScore),
    wealth: Math.round(Math.min(baseScore + (wuxing.금 / 2), 100)),   // 금 = 재물
    love: Math.round(Math.min(baseScore + (wuxing.화 / 2), 100)),     // 화 = 애정
    career: Math.round(Math.min(baseScore + (wuxing.목 / 2), 100)),   // 목 = 성장
    health: Math.round(Math.min(baseScore + (wuxing.토 / 2), 100))    // 토 = 건강
  };
}
```

**점수 계산 로직**:
- 기본 점수: 오행 균형도 기반 (60~95점)
- 재물운: 금(金) 오행 비율 추가
- 애정운: 화(火) 오행 비율 추가
- 직장운: 목(木) 오행 비율 추가
- 건강운: 토(土) 오행 비율 추가

### 2.8 반환 데이터 구조

```javascript
{
  // 기존 형식 (하위 호환성)
  overall: "종합 운세 해석...",
  wealth: "재물운 해석...",
  love: "애정운 해석...",
  career: "직장운 해석...",
  health: "건강운 해석...",
  
  // 점수
  scores: {
    overall: 82,
    wealth: 78,
    love: 85,
    career: 72,
    health: 65
  },
  
  // 오행 데이터
  oheng: { 목: 20, 화: 60, 토: 10, 금: 5, 수: 5 },
  
  // 원본 AI 응답 (JSON 문자열)
  aiRawResponse: "{ \"personality\": {...}, ... }",
  
  // 파싱된 상세 데이터 (객체)
  detailedData: {
    personality: { description: "...", strengths: [...], weaknesses: [...] },
    business: { suitableFields: [...], timing: "...", advice: "..." },
    wealth: { description: "...", income: "...", expense: "...", investment: "..." },
    marriage: { description: "...", timing: "...", partnerType: "..." },
    health: { description: "...", attention: [...], advice: "..." },
    future: {
      "2025": { energy: "...", description: "...", positive: [...], warning: [...] },
      "2026": { energy: "...", description: "...", positive: [...], warning: [...] },
      next3to5Years: [...],
      lifelong: "..."
    },
    disasters: { description: "...", items: [...] },
    blessings: { description: "...", items: [...] },
    food: { avoid: [...], recommend: [...] },
    direction: { good: "...", description: "..." },
    color: { good: [...], avoid: [...] },
    place: { good: [...], description: "..." },
    overall: { summary: "..." }
  }
}
```

---

## 3단계: 결과 저장 및 반환

### 3.1 데이터베이스 저장

**파일**: `backend/src/controllers/sajuController.js`

```javascript
const [resultData] = await db.execute(
  `INSERT INTO saju_results
   (user_id, saju_data, overall_fortune, wealth_fortune, love_fortune,
    career_fortune, health_fortune, overall_score, wealth_score,
    love_score, career_score, health_score, oheng_data, ai_raw_response, detailed_data)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    userId,
    JSON.stringify(sajuData),                    // 원본 사주 데이터
    result.overall,                              // 총운
    result.wealth,                               // 재물운
    result.love,                                // 애정운
    result.career,                              // 직장운
    result.health,                              // 건강운
    result.scores.overall,                      // 종합 점수
    result.scores.wealth,                       // 재물 점수
    result.scores.love,                         // 애정 점수
    result.scores.career,                       // 직장 점수
    result.scores.health,                       // 건강 점수
    JSON.stringify(result.oheng),               // 오행 데이터
    result.aiRawResponse || null,               // AI 원본 응답 (JSON 문자열)
    result.detailedData ? JSON.stringify(result.detailedData) : null  // 상세 데이터 (JSON)
  ]
);
```

### 3.2 API 응답

```javascript
res.json({
  success: true,
  resultId: resultData.insertId,
  result: {
    // ... 위의 반환 데이터 구조와 동일
  },
  message: '사주 계산이 완료되었습니다.'
});
```

---

## 프롬프트 상세 분석

### System Prompt 분석

```
당신은 30년 경력의 전문 사주 명리학자입니다.
```
- **역할 정의**: AI의 전문성과 경력 명시

```
사용자의 사주팔자 데이터를 바탕으로 정확하고 구체적인 운세 해석을 제공합니다.
해석은 긍정적이면서도 현실적이어야 하며, 실질적인 조언을 포함해야 합니다.
```
- **해석 원칙**: 정확성, 구체성, 긍정성, 현실성, 실용성

```
반드시 유효한 JSON 형식으로만 응답하세요.
```
- **응답 형식**: JSON 강제

```
**중요: 현재 날짜는 ${currentDate} (${currentYear}년)입니다. 
timing 필드(business.timing, marriage.timing)는 미래 예측이므로 반드시 ${currentYear}년 이후의 날짜만 언급하세요.
description 필드들은 과거 운세 패턴이나 흐름을 자연스럽게 언급해도 되지만, 과거 날짜를 미래처럼 표현하지 마세요.**
```
- **날짜 제약**: timing 필드는 미래만, description은 과거 언급 가능

### User Prompt 구조

1. **사용자 정보**: 이름, 생년월일, 성별
2. **현재 날짜**: 동적으로 계산된 현재 날짜
3. **사주 데이터**: 년주, 월주, 일주, 시주
4. **오행 분포**: 목, 화, 토, 금, 수의 백분율
5. **용신**: 부족한 오행
6. **JSON 형식 요청**: 상세한 구조 명시
7. **중요 지침**: 날짜 관련 제약 조건

### JSON 응답 형식

#### personality (성격 특성)
```json
{
  "description": "일간을 중심으로 한 성격 특성 (3-4문장)",
  "strengths": ["강점1", "강점2", "강점3"],
  "weaknesses": ["약점1", "약점2"]
}
```

#### business (사업)
```json
{
  "suitableFields": ["적합한 분야1", "적합한 분야2", "적합한 분야3"],
  "timing": "사업운이 트이는 시기 (현재 년도 이후만)",
  "advice": "사업 관련 조언 (2-3문장, 과거 운세 흐름 언급 가능)"
}
```

#### future (향후 예측)
```json
{
  "2025": {
    "energy": "주요 기운 (예: 상관·편재)",
    "description": "2025년 운세 (2-3문장, 과거와 비교 가능)",
    "positive": ["긍정적 요소1", "긍정적 요소2"],
    "warning": ["주의사항1", "주의사항2"]
  },
  "2026": { ... },
  "next3to5Years": [
    { "year": 2025, "energy": "...", "keyPoints": [...] },
    { "year": 2026, "energy": "...", "keyPoints": [...] },
    ...
  ],
  "lifelong": "평생 운명 예측 (3-4문장, 과거 패턴 언급 가능)"
}
```

---

## 에러 처리 및 폴백

### 1. OpenAI API 에러

```javascript
catch (error) {
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
```

### 2. JSON 파싱 실패

```javascript
try {
  parsedData = JSON.parse(aiInterpretation);
  console.log('✅ JSON 파싱 성공');
} catch (error) {
  console.error('❌ JSON 파싱 실패:', error.message);
  console.error('원본 응답:', aiInterpretation);
  // JSON 파싱 실패 시 폴백 사용
  return generateFallbackInterpretation(sajuData);
}
```

### 3. 폴백 해석 생성

```javascript
function generateFallbackInterpretation(sajuData) {
  const scores = generateScoresFromWuxing(sajuData.wuxing);

  // 오행 기반 간단한 템플릿
  const dominantElement = Object.keys(sajuData.wuxing).reduce((a, b) =>
    sajuData.wuxing[a] > sajuData.wuxing[b] ? a : b
  );

  // 각 오행별 기본 메시지 템플릿
  const elementMessages = {
    목: { overall: "...", wealth: "...", love: "...", career: "...", health: "..." },
    화: { ... },
    토: { ... },
    금: { ... },
    수: { ... }
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
```

**폴백 로직**:
1. 오행 분포 기반 점수 생성
2. 가장 많은 오행 찾기
3. 해당 오행별 기본 템플릿 메시지 반환

---

## 비용 및 토큰 관리

### 토큰 사용량

**예상 토큰 사용량** (JSON 형식 상세 응답):
- **Input**: 약 1,200-1,500 토큰
- **Output**: 약 2,500-3,500 토큰
- **총**: 약 3,700-5,000 토큰

### 비용 계산

```javascript
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
```

### 비용 비교

| 모델 | Input 비용 | Output 비용 | 1회 예상 비용 | $5로 처리 가능 건수 |
|------|-----------|-------------|--------------|-------------------|
| gpt-3.5-turbo | $0.50/1M | $1.50/1M | 약 $0.0023 (₩3.0) | 약 2,170건 |
| gpt-4o-mini | $0.15/1M | $0.60/1M | 약 $0.0019 (₩2.5) | 약 2,630건 |

---

## 트러블슈팅

### 1. OpenAI API 할당량 초과

**증상**: `insufficient_quota` 에러

**해결**:
- OpenAI 대시보드에서 결제 정보 확인
- 크레딧 충전 필요
- 폴백 메시지로 대체

### 2. JSON 파싱 실패

**증상**: `JSON.parse()` 에러

**원인**:
- AI가 JSON 형식이 아닌 텍스트 반환
- JSON 형식 오류

**해결**:
- `response_format: { type: "json_object" }` 확인
- System prompt에 JSON 강제 명시 확인
- 폴백 메시지로 대체

### 3. 과거 날짜를 미래처럼 표현

**증상**: "2023년부터 좋아질 것입니다" (현재가 2025년)

**해결**:
- System prompt에 현재 날짜 명시
- timing 필드에 미래 날짜만 언급하도록 지시
- User prompt에 현재 날짜 정보 포함

### 4. 타임아웃 에러

**증상**: 프론트엔드에서 타임아웃 발생

**해결**:
- 프론트엔드 타임아웃 증가 (5분)
- OpenAI API는 기본적으로 타임아웃 없음
- 네트워크 상태 확인

### 5. lunar-javascript 계산 오류

**증상**: 사주 계산 실패

**원인**:
- 잘못된 날짜 형식
- 음력/양력 변환 오류

**해결**:
- 날짜 형식 검증 (YYYY-MM-DD)
- calendarType 확인 ('solar' or 'lunar')
- 시간 형식 검증 (HH:MM)

---

## 전체 플로우 다이어그램

```
사용자 입력
    │
    ▼
[사주 계산 요청]
    │
    ▼
┌─────────────────────────────────────┐
│ sajuController.calculateSaju()      │
│ 1. 사용자 정보 조회                  │
└───────────┬─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ sajuService.calculateSaju()         │
│ - 날짜 파싱                          │
│ - Lunar 객체 생성                    │
│ - 사주팔자 추출                      │
│ - 오행 분석                          │
│ - 용신 찾기                          │
└───────────┬─────────────────────────┘
            │
            │ sajuData 반환
            ▼
┌─────────────────────────────────────┐
│ aiService.interpretSajuWithAI()     │
│ - 현재 날짜 계산                      │
│ - System Prompt 구성                 │
│ - User Prompt 구성                   │
│ - OpenAI API 호출                    │
│ - JSON 파싱                          │
│ - 점수 생성                          │
└───────────┬─────────────────────────┘
            │
            │ result 반환
            ▼
┌─────────────────────────────────────┐
│ sajuController.calculateSaju()      │
│ - 결과 DB 저장                       │
│ - API 응답 반환                      │
└───────────┬─────────────────────────┘
            │
            ▼
      [사용자에게 결과 반환]
```

---

## 참고 자료

- [lunar-javascript 공식 문서](https://github.com/6tail/lunar-javascript)
- [OpenAI API 문서](https://platform.openai.com/docs/api-reference)
- [사주명리학 기초](https://ko.wikipedia.org/wiki/%EC%82%AC%EC%A3%BC%EB%AA%85%EB%A6%AC%ED%95%99)

---

## 업데이트 이력

- **2025-01-XX**: 초기 문서 작성
  - lunar-javascript 연동 과정 상세화
  - OpenAI API 프롬프트 구조 설명
  - 현재 날짜 동적 계산 추가
  - JSON 형식 상세 응답 구조 설명

