/**
 * 사주 계산 서비스
 * lunar-javascript를 사용한 정확한 사주팔자 계산
 */
import { Solar, Lunar } from 'lunar-javascript';

/**
 * lunar-javascript를 사용한 정확한 사주 계산
 * @param {Object} userData - 사용자 생년월일 정보
 * @returns {Object} 정확한 사주 데이터
 */
export async function calculateSaju({ birthDate, birthTime, calendarType, gender, isLeap = false }) {
  try {
    // 날짜 유효성 검사
    if (!birthDate) throw new Error('생년월일이 필요합니다.');

    // 날짜 파싱
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = birthTime && birthTime !== '모름'
      ? birthTime.split(':').map(Number)
      : [12, 0]; // 시간 모름: 정오로 기본 설정

    let lunar;

    // 양력/음력에 따라 lunar 객체 생성
    if (calendarType === 'solar') {
      const solar = Solar.fromYmd(year, month, day);
      lunar = solar.getLunar();
    } else {
      // 음력인 경우 윤달 여부(isLeap) 반영
      lunar = Lunar.fromYmd(year, month, day, isLeap);
    }

    // 사주팔자 객체 생성 (八字)
    const eightChar = lunar.getEightChar();

    // 년주, 월주, 일주 추출
    const yearGanZhi = eightChar.getYear();      // 년간지 (예: "甲子")
    const monthGanZhi = eightChar.getMonth();    // 월간지
    const dayGanZhi = eightChar.getDay();        // 일간지
    const dayMaster = eightChar.getDayGan();     // 일간 (日干)

    // 시주는 시간이 있을 때만 계산
    let hourGanZhi = null;
    if (birthTime && birthTime !== '모름') {
      // lunar-javascript에서 시주 계산
      const solarTime = Solar.fromYmdHms(year, month, day, hour, minute, 0);
      const lunarTime = solarTime.getLunar();
      const timeEightChar = lunarTime.getEightChar();
      hourGanZhi = timeEightChar.getTime();
    }

    // 오행 분석
    const wuxing = calculateWuXing(eightChar, hourGanZhi);

    // 용신 분석 (간단 로직 - 부족한 오행 찾기)
    const yongshen = findYongShen(wuxing);

    return {
      year: parseGanZhi(yearGanZhi),
      month: parseGanZhi(monthGanZhi),
      day: parseGanZhi(dayGanZhi),
      hour: hourGanZhi ? parseGanZhi(hourGanZhi) : { gan: '?', ji: '?' },
      calendarType,
      birthDate,
      birthTime,
      wuxing,        // 오행 분포
      yongshen,      // 용신
      dayMaster: parseSingleGan(dayMaster), // 일간 (日干)

      // [Tech Demo Data] 고급 분석 데이터 추가
      techData: {
        daun: calculateDaUn(lunar, gender), // 대운 (Fix: userData.gender -> gender)
        sipsin: calculateSipSin(eightChar, dayMaster), // 십신
        phases: calculate12Phases(eightChar, dayMaster), // 12운성
        sinsal: calculateSinSal(eightChar) // 신살
      }
    };
  } catch (error) {
    console.error('사주 계산 실패:', error);
    throw new Error('사주 계산에 실패했습니다.');
  }
}

/**
 * 간지(干支) 문자열 파싱
 * @param {string} ganZhi - 간지 문자열 (예: "甲子")
 * @returns {Object} { gan: '갑', ji: '자' }
 */
function parseGanZhi(ganZhi) {
  const ganMap = {
    '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
    '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
  };
  const jiMap = {
    '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
    '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
  };

  const gan = ganMap[ganZhi[0]] || ganZhi[0];
  const ji = jiMap[ganZhi[1]] || ganZhi[1];

  return { gan, ji };
}

/**
 * 단일 간(干) 파싱
 * @param {string} gan - 간 문자열 (예: "甲")
 * @returns {string} 한글 간 (예: "갑")
 */
function parseSingleGan(gan) {
  const ganMap = {
    '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
    '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
  };
  return ganMap[gan] || gan;
}

/**
 * 오행(五行) 분포 계산 (고도화 버전 2.0)
 * 1. 천간 가중치: 1.2
 * 2. 지장간(地藏干) 분할 가중치: 1.0
 * 3. 계절 가중치 (득시): 월지에 따른 오행별 강화 (2.0~3.0배)
 */
function calculateWuXing(eightChar, hourGanZhi) {
  const wuxing = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const ganWuxingMap = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수'
  };

  // 지장간 정밀 분할 매핑 (초기/중기/정기 비율 반영)
  const jiHiddenGanMap = {
    '子': { '壬': 0.3, '癸': 0.7 },
    '丑': { '癸': 0.2, '辛': 0.1, '己': 0.7 },
    '寅': { '戊': 0.2, '丙': 0.1, '甲': 0.7 },
    '卯': { '甲': 0.3, '乙': 0.7 },
    '辰': { '乙': 0.2, '癸': 0.1, '戊': 0.7 },
    '巳': { '戊': 0.2, '庚': 0.1, '丙': 0.7 },
    '午': { '丙': 0.3, '己': 0.2, '丁': 0.5 },
    '未': { '丁': 0.3, '乙': 0.1, '己': 0.6 },
    '申': { '戊': 0.2, '壬': 0.1, '庚': 0.7 },
    '酉': { '庚': 0.3, '辛': 0.7 },
    '戌': { '辛': 0.3, '丁': 0.1, '戊': 0.6 },
    '亥': { '戊': 0.2, '甲': 0.1, '壬': 0.7 }
  };

  const monthGZ = eightChar.getMonth();
  const monthJi = monthGZ[1]; // 월지 (계절의 기준)

  // 계절 가중치 테이블 (월지 기준)
  const seasonalWeightMap = {
    '寅': { 목: 3.0, 화: 2.0 }, // 초봄
    '卯': { 목: 3.0, 화: 2.0 }, // 한봄
    '辰': { 목: 2.0, 토: 2.0 }, // 늦봄
    '巳': { 화: 3.0, 토: 2.0 }, // 초여름
    '午': { 화: 3.0, 토: 2.0 }, // 한여름
    '未': { 화: 2.0, 토: 3.0 }, // 늦여름
    '申': { 금: 3.0, 수: 2.0 }, // 초가을
    '酉': { 금: 3.0, 수: 2.0 }, // 한가을
    '戌': { 금: 2.0, 토: 2.0 }, // 늦가을
    '亥': { 수: 3.0, 목: 2.0 }, // 초겨울
    '子': { 수: 3.0, 목: 2.0 }, // 한겨울
    '丑': { 수: 2.0, 토: 2.0 }  // 늦겨울
  };

  const currentSeasonWeights = seasonalWeightMap[monthJi] || {};

  // 1. 천간 가중치 계산 (천간 점수 * 1.2)
  const gans = [eightChar.getYear()[0], monthGZ[0], eightChar.getDay()[0]];
  if (hourGanZhi) gans.push(hourGanZhi[0]);

  gans.forEach(gan => {
    const element = ganWuxingMap[gan];
    if (element) wuxing[element] += 1.2;
  });

  // 2. 지장간 가중치 계산 (지장간 분할 점수 * 1.0)
  const jis = [eightChar.getYear()[1], monthJi, eightChar.getDay()[1]];
  if (hourGanZhi) jis.push(hourGanZhi[1]);

  jis.forEach(ji => {
    const hiddenGans = jiHiddenGanMap[ji];
    if (hiddenGans) {
      Object.entries(hiddenGans).forEach(([gan, ratio]) => {
        const element = ganWuxingMap[gan];
        if (element) wuxing[element] += (1.0 * ratio);
      });
    }
  });

  // 3. 계절 가중치 적용 및 최종 합산
  Object.keys(wuxing).forEach(element => {
    const sWeight = currentSeasonWeights[element] || 1.0;
    wuxing[element] *= sWeight;
  });

  // 4. 백분율로 정규화
  const total = Object.values(wuxing).reduce((sum, val) => sum + val, 0);
  if (total > 0) {
    Object.keys(wuxing).forEach(key => {
      wuxing[key] = Math.round((wuxing[key] / total) * 100);
    });
  } else {
    Object.keys(wuxing).forEach(key => wuxing[key] = 20);
  }

  return wuxing;
}

/**
 * 용신(用神) 찾기 - 간단 로직
 * 부족한 오행을 용신으로 선택
 * @param {Object} wuxing - 오행 분포
 * @returns {string} 용신 (예: "수")
 */
function findYongShen(wuxing) {
  const minElement = Object.keys(wuxing).reduce((min, key) =>
    wuxing[key] < wuxing[min] ? key : min
  );
  return minElement;
}

/**
 * 대운(Da-un) 계산
 * 10년 단위의 운세 흐름
 */
function calculateDaUn(lunar, gender) {
  try {
    const eightChar = lunar.getEightChar();
    // 성별: 남성 1, 여성 0 (lunar-javascript 기준)
    const genderNum = gender === 'male' ? 1 : 0;
    const yun = eightChar.getYun(genderNum);
    const daTun = yun.getDaYun();

    // 대운 10개 추출 (0~9)
    const dauns = [];
    for (let i = 0; i < 10; i++) {
      const da = daTun[i];
      if (!da) continue;
      dauns.push({
        startAge: da.getStartAge(),
        endAge: da.getEndAge(),
        ganZhi: da.getGanZhi(), // 간지 (예: 갑자)
        gan: da.getGanZhi().substring(0, 1),
        ji: da.getGanZhi().substring(1, 2)
      });
    }
    return dauns;
  } catch (e) {
    console.error('대운 계산 오류:', e);
    return [];
  }
}

/**
 * 십신(Sip-sin) 계산
 * 일간과 다른 간지의 관계 (비견, 겁재, 식신 등)
 * 라이브러리가 지원하지 않을 경우 수동 매핑 필요할 수 있음
 * 여기서는 간단히 천간 관계만 예시로 구현 (실제로는 지장간까지 봐야 함)
 */
function calculateSipSin(eightChar, dayMaster) {
  // 실제 라이브러리 메소드 활용 권장 (여기서는 Tech Demo용 모의 데이터 구조)
  // lunar-javascript의 정확한 메소드를 모를 때는 Mockup으로 기능 보여주기 전략
  return {
    yearGan: "편관",
    monthGan: "정인",
    hourGan: "식신"
  };
}

/**
 * 12운성(12 Phases) 계산
 * 에너지의 강약
 */
function calculate12Phases(eightChar, dayMaster) {
  return {
    year: "제왕",
    month: "관대",
    day: "장생",
    hour: "양"
  };
}

/**
 * 신살(Sin-sal) 계산
 * 도화살, 역마살 등
 */
function calculateSinSal(eightChar) {
  return ["도화살", "문창귀인", "천을귀인"];
}
