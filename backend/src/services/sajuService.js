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
export async function calculateSaju(userData) {
  try {
    const { birthDate, birthTime, calendarType } = userData;

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
      lunar = Lunar.fromYmd(year, month, day);
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
      dayMaster: parseSingleGan(dayMaster) // 일간 (日干)
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
 * 오행(五行) 분포 계산
 * @param {Object} eightChar - 사주팔자 객체
 * @param {string} hourGanZhi - 시주 간지
 * @returns {Object} { 목: 수치, 화: 수치, ... }
 */
function calculateWuXing(eightChar, hourGanZhi) {
  const wuxing = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 오행 매핑 (천간)
  const ganWuxingMap = {
    '甲': '목', '乙': '목',
    '丙': '화', '丁': '화',
    '戊': '토', '己': '토',
    '庚': '금', '辛': '금',
    '壬': '수', '癸': '수'
  };

  // 오행 매핑 (지지)
  const jiWuxingMap = {
    '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
    '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수'
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
  } else {
    // total이 0인 경우 균등 분배
    Object.keys(wuxing).forEach(key => {
      wuxing[key] = 20;
    });
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
