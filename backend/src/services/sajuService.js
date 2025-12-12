/**
 * 사주 API 서비스
 * 만세력 API 또는 대체 사주 API 연동
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SAJU_API_URL = process.env.SAJU_API_URL || 'https://api.example.com/saju';
const SAJU_API_KEY = process.env.SAJU_API_KEY;

/**
 * 사주 계산 API 호출
 * @param {Object} userData - 사용자 생년월일 정보
 * @returns {Object} 사주 데이터
 */
export async function calculateSaju(userData) {
  try {
    // 실제 사주 API 연동
    // 여기서는 예시로 더미 데이터 반환
    // 실제로는 만세력 API나 다른 사주 API를 호출해야 함

    if (SAJU_API_KEY && SAJU_API_URL) {
      // 실제 API 호출 (예시)
      const response = await axios.post(
        SAJU_API_URL,
        {
          birthDate: userData.birthDate,
          birthTime: userData.birthTime,
          calendarType: userData.calendarType
        },
        {
          headers: {
            'Authorization': `Bearer ${SAJU_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    }

    // API 키가 없을 경우 더미 데이터 반환 (개발용)
    return generateDummySajuData(userData);
  } catch (error) {
    console.error('사주 API 호출 실패:', error);
    // API 실패 시에도 더미 데이터 반환 (개발용)
    return generateDummySajuData(userData);
  }
}

/**
 * 더미 사주 데이터 생성 (개발/테스트용)
 * 실제 사주 API가 없을 때 사용
 */
function generateDummySajuData(userData) {
  const { birthDate, birthTime, calendarType } = userData;
  
  // 생년월일 파싱
  const [year, month, day] = birthDate.split('-');
  const [hour, minute] = birthTime ? birthTime.split(':') : [12, 0];

  // 간단한 사주 데이터 생성 (실제로는 정교한 계산 필요)
  return {
    year: {
      gan: getGan(year),
      ji: getJi(year)
    },
    month: {
      gan: getGan(month),
      ji: getJi(month)
    },
    day: {
      gan: getGan(day),
      ji: getJi(day)
    },
    hour: {
      gan: getGan(hour),
      ji: getJi(hour)
    },
    calendarType,
    birthDate,
    birthTime
  };
}

/**
 * 간지 계산 (간단한 예시)
 * 실제로는 복잡한 계산 로직이 필요
 */
function getGan(value) {
  const gan = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  return gan[parseInt(value) % 10];
}

function getJi(value) {
  const ji = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  return ji[parseInt(value) % 12];
}

