/**
 * 사주 컨트롤러
 * 사주 계산 및 결과 조회 기능
 */
import db from '../config/database.js';
import { calculateSaju as callSajuAPI } from '../services/sajuService.js';

/**
 * 사주 계산
 * 사주 API를 호출하여 사주를 계산하고 결과를 저장
 */
export async function calculateSaju(req, res) {
  try {
    const { userId, birthDate, birthTime, calendarType } = req.body;

    if (!userId || !birthDate) {
      return res.status(400).json({ 
        error: '사용자 ID와 생년월일이 필요합니다.' 
      });
    }

    // 사주 API 호출
    const sajuData = await callSajuAPI({
      birthDate,
      birthTime,
      calendarType: calendarType || 'solar'
    });

    // 사주 결과 해석 (간단한 로직, 추후 개선 필요)
    const result = interpretSaju(sajuData);

    // 결과 저장
    const [resultData] = await db.execute(
      `INSERT INTO saju_results 
       (user_id, saju_data, overall_fortune, wealth_fortune, love_fortune, 
        career_fortune, health_fortune, overall_score, wealth_score, 
        love_score, career_score, health_score, oheng_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(sajuData),
        result.overall,
        result.wealth,
        result.love,
        result.career,
        result.health,
        result.scores.overall,
        result.scores.wealth,
        result.scores.love,
        result.scores.career,
        result.scores.health,
        JSON.stringify(result.oheng)
      ]
    );

    res.json({
      success: true,
      resultId: resultData.insertId,
      result,
      message: '사주 계산이 완료되었습니다.'
    });
  } catch (error) {
    console.error('사주 계산 오류:', error);
    res.status(500).json({ 
      error: '사주 계산에 실패했습니다.',
      message: error.message 
    });
  }
}

/**
 * 사주 결과 조회
 * 접근 토큰으로 사주 결과를 조회
 */
export async function getSajuResult(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    // 사용자 조회
    const [users] = await db.execute(
      `SELECT id, name, phone, birth_date, birth_time, gender, calendar_type 
       FROM users WHERE access_token = ?`,
      [token]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];
    const userId = user.id;

    // 사주 결과 조회
    const [results] = await db.execute(
      `SELECT * FROM saju_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: '사주 결과를 찾을 수 없습니다.' });
    }

    const result = results[0];

    /**
     * JSON 데이터 파싱 헬퍼 함수
     * 문자열이면 파싱하고, 객체면 그대로 반환, null이면 기본값 반환
     */
    const parseJsonData = (data, defaultValue = {}) => {
      if (!data) return defaultValue;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.warn('JSON 파싱 실패:', e.message);
          return defaultValue;
        }
      }
      // 이미 객체인 경우 그대로 반환
      return data;
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        gender: user.gender,
        calendarType: user.calendar_type
      },
      result: {
        id: result.id,
        overallFortune: result.overall_fortune,
        wealthFortune: result.wealth_fortune,
        loveFortune: result.love_fortune,
        careerFortune: result.career_fortune,
        healthFortune: result.health_fortune,
        scores: {
          overall: result.overall_score,
          wealth: result.wealth_score,
          love: result.love_score,
          career: result.career_score,
          health: result.health_score
        },
        oheng: parseJsonData(result.oheng_data, {}),
        sajuData: parseJsonData(result.saju_data, {})
      }
    });
  } catch (error) {
    console.error('사주 결과 조회 오류:', error);
    res.status(500).json({ 
      error: '사주 결과 조회에 실패했습니다.',
      message: error.message 
    });
  }
}

/**
 * 사주 해석 함수 (임시 로직)
 * 실제로는 더 정교한 사주 해석 로직이 필요
 */
function interpretSaju(sajuData) {
  // 임시로 랜덤 점수와 텍스트 생성
  // 실제로는 사주 데이터를 분석하여 해석해야 함
  const scores = {
    overall: Math.floor(Math.random() * 30) + 70,
    wealth: Math.floor(Math.random() * 30) + 70,
    love: Math.floor(Math.random() * 30) + 70,
    career: Math.floor(Math.random() * 30) + 70,
    health: Math.floor(Math.random() * 30) + 70
  };

  const oheng = {
    목: Math.floor(Math.random() * 30) + 10,
    화: Math.floor(Math.random() * 30) + 10,
    토: Math.floor(Math.random() * 30) + 10,
    금: Math.floor(Math.random() * 30) + 10,
    수: Math.floor(Math.random() * 30) + 10
  };

  return {
    overall: '2026년은 당신에게 변화의 해가 될 것입니다. 인내심을 갖고 기다리시면 좋은 결과가 있을 것입니다.',
    wealth: '상반기에는 신중하게 투자하시고, 하반기부터 큰 수익을 기대할 수 있습니다.',
    love: '새로운 인연이 찾아올 가능성이 높습니다. 특히 5월과 9월에 주목하세요.',
    career: '현재 위치에서 실력을 쌓는 것이 좋습니다. 하반기에 승진이나 이직의 기회가 있을 수 있습니다.',
    health: '과로를 피하고 충분한 휴식을 취하세요. 특히 소화기 계통을 주의하세요.',
    scores,
    oheng
  };
}

