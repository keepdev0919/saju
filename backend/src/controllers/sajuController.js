/**
 * 사주 컨트롤러
 * 사주 계산 및 결과 조회 기능
 */
import db from '../config/database.js';
import { calculateSaju as callSajuAPI } from '../services/sajuService.js';
import { interpretSajuWithAI } from '../services/aiService.js';

/**
 * 사주 계산
 * AI를 사용하여 사주 풀이를 생성하고 저장
 * 보안 강화: accessToken으로 사용자 검증 후 계산 수행 (IDOR 방지)
 * 
 * @param {string} req.body.accessToken - 사용자 접근 토큰
 * @param {string} req.body.birthDate - 생년월일 (YYYY-MM-DD)
 * @param {string} req.body.birthTime - 생시 (HH:MM 또는 null)
 * @param {string} req.body.calendarType - 양력/음력 (solar/lunar)
 */
export async function calculateSaju(req, res) {
  try {
    const { accessToken, birthDate, birthTime, calendarType } = req.body;

    if (!accessToken || !birthDate) {
      return res.status(400).json({
        error: '접근 토큰과 생년월일이 필요합니다.'
      });
    }

    // 사용자 정보 조회 (삭제된 사용자 제외, 토큰 기반 검증)
    const [users] = await db.execute(
      `SELECT id, name, gender, phone FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [accessToken]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];
    const userId = user.id;

    console.log('🔮 사주 계산 시작:', {
      userId,
      name: user.name,
      birthDate,
      birthTime,
      calendarType
    });

    // 1단계: lunar-javascript로 사주 계산
    const sajuData = await callSajuAPI({
      birthDate,
      birthTime,
      calendarType: calendarType || 'solar',
      gender: user.gender // Tech Demo용 (대운 계산에 필요)
    });

    console.log('✅ 사주 계산 완료:', {
      year: `${sajuData.year.gan}${sajuData.year.ji}`,
      month: `${sajuData.month.gan}${sajuData.month.ji}`,
      day: `${sajuData.day.gan}${sajuData.day.ji}`,
      hour: `${sajuData.hour.gan}${sajuData.hour.ji}`,
      dayMaster: sajuData.dayMaster,
      wuxing: sajuData.wuxing,
      yongshen: sajuData.yongshen
    });

    // 2단계: AI로 해석 생성
    const result = await interpretSajuWithAI(sajuData, {
      name: user.name,
      gender: user.gender,
      birthDate,
      birthTime
    });

    // [NEW] talisman 데이터를 detailedData에 포함하여 저장
    const detailedDataToSave = result.detailedData || {};
    detailedDataToSave.talisman = result.talisman;

    // 결과 저장
    const [resultData] = await db.execute(
      `INSERT INTO saju_results
       (user_id, saju_data, overall_fortune, wealth_fortune, love_fortune,
        career_fortune, health_fortune, overall_score, wealth_score,
        love_score, career_score, health_score, oheng_data, ai_raw_response, detailed_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        JSON.stringify(result.oheng),
        result.aiRawResponse || null,  // 원본 응답 저장
        JSON.stringify(detailedDataToSave)
      ]
    );

    console.log('✅ 사주 결과 저장 완료 (ID:', resultData.insertId, ')');

    res.json({
      success: true,
      resultId: resultData.insertId,
      result,
      message: '사주 계산이 완료되었습니다.'
    });
  } catch (error) {
    console.error('❌ 사주 계산 오류:', error);
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

    // 사용자 조회 (삭제된 사용자 제외)
    const [users] = await db.execute(
      `SELECT id, name, phone, birth_date, birth_time, gender, calendar_type
       FROM users WHERE access_token = ? AND deleted_at IS NULL`,
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
        sajuData: parseJsonData(result.saju_data, {}),
        talisman: parseJsonData(result.detailed_data, null)?.talisman || { name: '갑자' },
        aiRawResponse: result.ai_raw_response || null,  // 원본 응답 포함
        detailedData: parseJsonData(result.detailed_data, null)  // 상세 데이터 포함
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
