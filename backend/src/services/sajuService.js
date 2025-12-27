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
    const { wuxing, analysisLogs } = calculateWuXing(eightChar, hourGanZhi);

    // 십신, 대운, 12운성, 신살 계산 (AI에게 용신 계산 위임)
    const sipsin = calculateSipSin(eightChar, dayMaster, hourGanZhi);
    const dayun = calculateDaUn(lunar, gender);
    const phases = calculate12Phases(eightChar, dayMaster, hourGanZhi);
    const sinsal = calculateSinSal(eightChar, dayMaster);

    return {
      year: parseGanZhi(yearGanZhi),
      month: parseGanZhi(monthGanZhi),
      day: parseGanZhi(dayGanZhi),
      hour: hourGanZhi ? parseGanZhi(hourGanZhi) : { gan: '?', ji: '?' },
      calendarType,
      birthDate,
      birthTime,
      wuxing,        // 오행 분포
      analysisLogs,  // [NEW] 실시간 분석 로그
      dayMaster: parseSingleGan(dayMaster), // 일간 (日干)

      // ✅ AI에게 전달할 상세 명리학 데이터
      sipsin,   // 십신 (十神)
      dayun,    // 대운 (大運)
      phases,   // 12운성
      sinsal,   // 신살 (神殺)

      // ❌ 용신 제거 - AI가 계산하도록 위임
      // yongshen: findYongShen(wuxing) ← 삭제됨
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
  const analysisLogs = [];

  const ganWuxingMap = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수'
  };

  const ganNameMap = {
    '甲': '갑목(甲木)', '乙': '을목(乙木)', '丙': '병화(丙火)', '丁': '정화(丁火)', '戊': '무토(戊土)',
    '己': '기토(己土)', '庚': '경금(庚金)', '辛': '신금(辛金)', '壬': '임수(壬水)', '癸': '계수(癸水)'
  };

  const jiNameMap = {
    '子': '자수(子水)', '丑': '축토(丑土)', '寅': '인목(寅木)', '卯': '묘목(卯木)', '辰': '진토(辰土)', '巳': '사화(巳火)',
    '午': '오화(午火)', '未': '미토(未土)', '申': '신금(申金)', '酉': '유금(酉金)', '戌': '술토(戌土)', '亥': '해수(亥水)'
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
    '寅': { 목: 3.0, 화: 2.0, name: '초봄(孟春)' },
    '卯': { 목: 3.0, 화: 2.0, name: '한봄(仲春)' },
    '辰': { 목: 2.0, 토: 2.0, name: '늦봄(季春)' },
    '巳': { 화: 3.0, 토: 2.0, name: '초여름(孟夏)' },
    '午': { 화: 3.0, 토: 2.0, name: '한여름(仲夏)' },
    '未': { 화: 2.0, 토: 3.0, name: '늦여름(季夏)' },
    '申': { 금: 3.0, 수: 2.0, name: '초가을(孟秋)' },
    '酉': { 금: 3.0, 수: 2.0, name: '한가을(仲秋)' },
    '戌': { 금: 2.0, 토: 2.0, name: '늦가을(季秋)' },
    '亥': { 수: 3.0, 목: 2.0, name: '초겨울(孟冬)' },
    '子': { 수: 3.0, 목: 2.0, name: '한겨울(仲冬)' },
    '丑': { 수: 2.0, 토: 2.0, name: '늦겨울(季冬)' }
  };

  const currentSeason = seasonalWeightMap[monthJi] || { name: '중조(中調)' };
  const currentSeasonWeights = seasonalWeightMap[monthJi] || {};

  // [NEW] 4단계 실용적 로그 시스템 (1단계 동적 + 2~4단계 고정)
  analysisLogs.push(`◈ 월지 '${jiNameMap[monthJi]}' 기준 사주 원국 정밀 스캔`);

  // 1. 천간 가중치 계산 (천간 점수 * 1.2)
  const yearGZ = eightChar.getYear();
  const dayGZ = eightChar.getDay();
  const gans = [yearGZ[0], monthGZ[0], dayGZ[0]];
  if (hourGanZhi) gans.push(hourGanZhi[0]);

  gans.forEach(gan => {
    const element = ganWuxingMap[gan];
    if (element) wuxing[element] += 1.2;
  });

  // 2. 지장간 가중치 계산 (지장간 분할 점수 * 1.0)
  const jis = [yearGZ[1], monthJi, dayGZ[1]];
  if (hourGanZhi) jis.push(hourGanZhi[1]);

  let hiddenGanDetected = false;
  jis.forEach(ji => {
    const hiddenGans = jiHiddenGanMap[ji];
    if (hiddenGans) {
      Object.entries(hiddenGans).forEach(([gan, ratio]) => {
        const element = ganWuxingMap[gan];
        if (element) {
          wuxing[element] += (1.0 * ratio);
        }
      });
    }
  });

  analysisLogs.push(`◈ 지장간(地藏干) 내 함축된 잠재 기운 추출`);
  analysisLogs.push(`◈ 절기 감응도에 따른 에너지 밀도 정밀 조율`);

  // 3. 계절 가중치 적용 및 최종 합산
  Object.keys(wuxing).forEach(element => {
    const sWeight = currentSeasonWeights[element] || 1.0;
    wuxing[element] *= sWeight;
  });

  // 4. 백분율로 정규화
  const total = Object.values(wuxing).reduce((sum, val) => sum + val, 0);
  if (total > 0) {
    Object.keys(wuxing).forEach(key => {
      wuxing[key] = (wuxing[key] / total) * 100;
    });
  } else {
    Object.keys(wuxing).forEach(key => (wuxing[key] = 20));
  }

  analysisLogs.push(`◈ 오행 균형도 산출 및 시각화 형상 복원`);

  return { wuxing, analysisLogs };
}

/**
 * ❌ 용신(用神) 찾기 함수 제거됨
 * 이유: 전통 명리학의 복잡한 용신 선택 원리를 단순 "가장 약한 오행" 로직으로 대체할 수 없음
 * 해결: AI가 일간·월령·계절·신강신약을 종합 분석하여 용신 계산
 */

/**
 * 대운(大運) 계산 - 10년 단위 운세 흐름
 * @param {Object} lunar - lunar-javascript 객체
 * @param {string} gender - 성별 ('male' | 'female')
 * @returns {Array} 대운 목록 (최대 10개)
 */
function calculateDaUn(lunar, gender) {
  try {
    const eightChar = lunar.getEightChar();
    const genderNum = gender === 'male' ? 1 : 0;
    const yun = eightChar.getYun(genderNum);
    const daTun = yun.getDaYun();

    const ganMap = {
      '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
      '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계'
    };
    const jiMap = {
      '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
      '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
    };

    const dauns = [];
    for (let i = 0; i < 10; i++) {
      const da = daTun[i];
      if (!da) continue;

      const ganZhi = da.getGanZhi();
      const ganChinese = ganZhi.substring(0, 1);
      const jiChinese = ganZhi.substring(1, 2);

      dauns.push({
        startAge: da.getStartAge(),
        endAge: da.getEndAge(),
        ganZhi: `${ganMap[ganChinese] || ganChinese}${jiMap[jiChinese] || jiChinese}`, // 한글 간지
        gan: ganMap[ganChinese] || ganChinese,
        ji: jiMap[jiChinese] || jiChinese
      });
    }
    return dauns;
  } catch (e) {
    console.error('대운 계산 오류:', e);
    return [];
  }
}

/**
 * 십신(十神) 계산 - 일간과 다른 천간의 관계
 * @param {Object} eightChar - lunar-javascript 사주팔자 객체
 * @param {string} dayMaster - 일간 (한자)
 * @param {string} hourGanZhi - 시주 간지
 * @returns {Object} 년·월·일·시 천간 및 지지의 십신
 */
function calculateSipSin(eightChar, dayMaster, hourGanZhi) {
  const yearGZ = eightChar.getYear();
  const monthGZ = eightChar.getMonth();
  const dayGZ = eightChar.getDay();

  const yearGan = yearGZ[0];
  const monthGan = monthGZ[0];
  const hourGan = hourGanZhi ? hourGanZhi[0] : null;

  // 지지의 지장간 중 본기(정기) 추출
  const yearJi = yearGZ[1];
  const monthJi = monthGZ[1];
  const dayJi = dayGZ[1];
  const hourJi = hourGanZhi ? hourGanZhi[1] : null;

  return {
    year: {
      gan: getSipSinName(dayMaster, yearGan),
      ji: getSipSinName(dayMaster, getJiMainGan(yearJi))
    },
    month: {
      gan: getSipSinName(dayMaster, monthGan),
      ji: getSipSinName(dayMaster, getJiMainGan(monthJi))
    },
    day: {
      gan: '비견', // 일간 자신은 항상 비견
      ji: getSipSinName(dayMaster, getJiMainGan(dayJi))
    },
    hour: hourGan ? {
      gan: getSipSinName(dayMaster, hourGan),
      ji: getSipSinName(dayMaster, getJiMainGan(hourJi))
    } : { gan: '미상', ji: '미상' }
  };
}

/**
 * 지지의 본기(정기) 천간 추출
 * @param {string} ji - 지지 (한자)
 * @returns {string} 본기 천간
 */
function getJiMainGan(ji) {
  const jiMainGanMap = {
    '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
    '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
  };
  return jiMainGanMap[ji] || ji;
}

/**
 * 십신 이름 계산
 * @param {string} dayMaster - 일간 (한자)
 * @param {string} targetGan - 대상 천간 (한자)
 * @returns {string} 십신명 (예: '비견', '식신', '정재')
 */
function getSipSinName(dayMaster, targetGan) {
  if (!targetGan) return '미상';

  // 오행 매핑
  const ganWuxingMap = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수'
  };

  // 음양 매핑 (양간: 甲丙戊庚壬, 음간: 乙丁己辛癸)
  const yangGans = ['甲', '丙', '戊', '庚', '壬'];
  const isYang = (gan) => yangGans.includes(gan);

  const dayElement = ganWuxingMap[dayMaster];
  const targetElement = ganWuxingMap[targetGan];
  const sameYinYang = isYang(dayMaster) === isYang(targetGan);

  // 십신 계산 로직
  if (dayElement === targetElement) {
    return sameYinYang ? '비견' : '겁재';
  }

  // 오행 생극 관계
  const shengMap = { // 생(生): 나를 생하는 것
    '목': '수', '화': '목', '토': '화', '금': '토', '수': '금'
  };
  const keMap = { // 극(克): 내가 극하는 것
    '목': '토', '화': '금', '토': '수', '금': '목', '수': '화'
  };

  // 내가 생하는 오행 → 식상
  if (shengMap[targetElement] === dayElement) {
    return sameYinYang ? '식신' : '상관';
  }

  // 나를 생하는 오행 → 인성
  if (shengMap[dayElement] === targetElement) {
    return sameYinYang ? '편인' : '정인';
  }

  // 내가 극하는 오행 → 재성
  if (keMap[dayElement] === targetElement) {
    return sameYinYang ? '편재' : '정재';
  }

  // 나를 극하는 오행 → 관성
  if (keMap[targetElement] === dayElement) {
    return sameYinYang ? '편관' : '정관';
  }

  return '미상';
}

/**
 * 12운성(12 Phases) 계산 - 일간 기준 에너지 강약
 * @param {Object} eightChar - lunar-javascript 사주팔자 객체
 * @param {string} dayMaster - 일간 (한자)
 * @param {string} hourGanZhi - 시주 간지
 * @returns {Object} 년·월·일·시 지지의 12운성
 */
function calculate12Phases(eightChar, dayMaster, hourGanZhi) {
  const yearGZ = eightChar.getYear();
  const monthGZ = eightChar.getMonth();
  const dayGZ = eightChar.getDay();

  const yearJi = yearGZ[1];
  const monthJi = monthGZ[1];
  const dayJi = dayGZ[1];
  const hourJi = hourGanZhi ? hourGanZhi[1] : null;

  return {
    year: get12PhaseName(dayMaster, yearJi),
    month: get12PhaseName(dayMaster, monthJi),
    day: get12PhaseName(dayMaster, dayJi),
    hour: hourJi ? get12PhaseName(dayMaster, hourJi) : '미상'
  };
}

/**
 * 12운성 이름 계산
 * @param {string} dayMaster - 일간 (한자)
 * @param {string} ji - 지지 (한자)
 * @returns {string} 12운성명 (예: '장생', '제왕', '사')
 */
function get12PhaseName(dayMaster, ji) {
  if (!ji) return '미상';

  // 12운성 순서: 장생 → 목욕 → 관대 → 건록 → 제왕 → 쇠 → 병 → 사 → 묘 → 절 → 태 → 양
  const phases = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];

  // 십간별 장생지 (장생이 시작되는 지지)
  const birthPlaceMap = {
    '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
    '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯'
  };

  // 지지 순서 (순행/역행 판단용)
  const jiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  const birthPlace = birthPlaceMap[dayMaster];
  if (!birthPlace) return '미상';

  const birthIndex = jiOrder.indexOf(birthPlace);
  const targetIndex = jiOrder.indexOf(ji);

  if (birthIndex === -1 || targetIndex === -1) return '미상';

  // 양간(甲丙戊庚壬)은 순행, 음간(乙丁己辛癸)은 역행
  const yangGans = ['甲', '丙', '戊', '庚', '壬'];
  const isYang = yangGans.includes(dayMaster);

  let phaseIndex;
  if (isYang) {
    // 순행: 장생지부터 순서대로
    phaseIndex = (targetIndex - birthIndex + 12) % 12;
  } else {
    // 역행: 장생지부터 거꾸로
    phaseIndex = (birthIndex - targetIndex + 12) % 12;
  }

  return phases[phaseIndex] || '미상';
}

/**
 * 신살(神殺) 계산 - 특수 길흉 표시
 * @param {Object} eightChar - lunar-javascript 사주팔자 객체
 * @param {string} dayMaster - 일간 (한자)
 * @returns {Array} 신살 목록
 */
function calculateSinSal(eightChar, dayMaster) {
  const sinsals = [];

  const yearGZ = eightChar.getYear();
  const monthGZ = eightChar.getMonth();
  const dayGZ = eightChar.getDay();

  const yearJi = yearGZ[1];
  const monthJi = monthGZ[1];
  const dayJi = dayGZ[1];

  // 1. 천을귀인(天乙貴人) - 일간 기준
  const cheonEulMap = {
    '甲': ['丑', '未'], '乙': ['申', '子'], '丙': ['亥', '酉'], '丁': ['亥', '酉'], '戊': ['丑', '未'],
    '己': ['申', '子'], '庚': ['丑', '未'], '辛': ['寅', '午'], '壬': ['卯', '巳'], '癸': ['卯', '巳']
  };
  const cheonEul = cheonEulMap[dayMaster] || [];
  if (cheonEul.includes(yearJi) || cheonEul.includes(monthJi) || cheonEul.includes(dayJi)) {
    sinsals.push('천을귀인');
  }

  // 2. 도화살(桃花殺) - 연지·일지 기준
  const doHwaMap = {
    '寅': '卯', '午': '卯', '戌': '卯',  // 인오술 → 묘
    '申': '酉', '子': '酉', '辰': '酉',  // 신자진 → 유
    '巳': '午', '酉': '午', '丑': '午',  // 사유축 → 오
    '亥': '子', '卯': '子', '未': '子'   // 해묘미 → 자
  };
  const doHwa = doHwaMap[yearJi] || doHwaMap[dayJi];
  if (doHwa && (doHwa === yearJi || doHwa === monthJi || doHwa === dayJi)) {
    sinsals.push('도화살');
  }

  // 3. 역마살(驛馬殺) - 연지·일지 기준
  const yeokMaMap = {
    '寅': '申', '午': '申', '戌': '申',  // 인오술 → 신
    '申': '寅', '子': '寅', '辰': '寅',  // 신자진 → 인
    '巳': '亥', '酉': '亥', '丑': '亥',  // 사유축 → 해
    '亥': '巳', '卯': '巳', '未': '巳'   // 해묘미 → 사
  };
  const yeokMa = yeokMaMap[yearJi] || yeokMaMap[dayJi];
  if (yeokMa && (yeokMa === yearJi || yeokMa === monthJi || yeokMa === dayJi)) {
    sinsals.push('역마살');
  }

  // 4. 화개살(華蓋殺) - 연지·일지 기준
  const hwaGaeMap = {
    '寅': '戌', '午': '戌', '戌': '戌',  // 인오술 → 술
    '申': '辰', '子': '辰', '辰': '辰',  // 신자진 → 진
    '巳': '丑', '酉': '丑', '丑': '丑',  // 사유축 → 축
    '亥': '未', '卯': '未', '未': '未'   // 해묘미 → 미
  };
  const hwaGae = hwaGaeMap[yearJi] || hwaGaeMap[dayJi];
  if (hwaGae && (hwaGae === yearJi || hwaGae === monthJi || hwaGae === dayJi)) {
    sinsals.push('화개살');
  }

  // 5. 공망(空亡) - 일주 기준
  const gongMangMap = {
    '甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'], '甲午': ['辰', '巳'], '甲辰': ['寅', '卯'], '甲寅': ['子', '丑']
  };
  const dayGanJi = dayGZ[0] + dayGZ[1];
  const gongMang = gongMangMap[dayGanJi];
  if (gongMang && (gongMang.includes(yearJi) || gongMang.includes(monthJi) || gongMang.includes(dayJi))) {
    sinsals.push('공망');
  }

  // 6. 문창귀인(文昌貴人) - 일간 기준
  const munChangMap = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
    '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
  };
  const munChang = munChangMap[dayMaster];
  if (munChang && (munChang === yearJi || munChang === monthJi || munChang === dayJi)) {
    sinsals.push('문창귀인');
  }

  return sinsals.length > 0 ? sinsals : ['없음'];
}
