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
 * @param {boolean} req.body.isLeap - 윤달 여부 (음력일 때만 유효)
 */
export async function calculateSaju(req, res) {
  try {
    const { accessToken } = req.body;
    let { birthDate, birthTime, calendarType, isLeap } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        error: '접근 토큰이 필요합니다.'
      });
    }

    // 사용자 정보 조회 (삭제된 사용자 제외, 토큰 기반 검증)
    const [users] = await db.execute(
      `SELECT id, name, gender, phone, birth_date, birth_time, calendar_type FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [accessToken]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];
    const userId = user.id;

    // [New] Request Body에 정보가 없으면 DB 정보 사용 (Fallback)
    if (!birthDate) birthDate = user.birth_date;
    if (!birthTime) birthTime = user.birth_time;
    if (!calendarType) calendarType = user.calendar_type;

    // [OPTIMIZATION] 이미 생성된 유료 결과가 있는지 확인
    const [existingResults] = await db.execute(
      `SELECT * FROM saju_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existingResults.length > 0) {
      const row = existingResults[0];
      try {
        const data = JSON.parse(row.saju_data || '{}');
        if (data.detailedData && data.detailedData.personality) {
          console.log('✅ 기존 유료 결과 발견! 중복 계산 스킵 및 즉시 반환 (ID:', row.id, ')');
          return res.json({
            success: true,
            resultId: row.id,
            result: {
              ...JSON.parse(row.oheng_data || '{}'),
              overall: row.overall_fortune,
              wealth: row.wealth_fortune,
              love: row.love_fortune,
              career: row.career_fortune,
              health: row.health_fortune,
              detailedData: data.detailedData,
              analysisLogs: []
            },
            message: '사주 계산이 완료되었습니다.'
          });
        }
      } catch (e) { /* ignore parse error and proceed */ }
    }

    // [FIX] DB에서 가져온 birthDate가 Date 객체인 경우
    // Timezone 이슈(UTC vs KST)로 인한 -1일 문제 방지
    // toISOString() 대신 로컬 시간 기준 연월일 추출 사용
    if (birthDate instanceof Date) {
      const offset = birthDate.getTimezoneOffset() * 60000;
      const localDate = new Date(birthDate.getTime() - offset);
      birthDate = localDate.toISOString().split('T')[0];
    }

    // isLeap은 DB에 없으면 false로 가정 (필요시 DB 추가 필요하지만 현재 명세상 body 우선)

    if (!birthDate) {
      return res.status(400).json({ error: '생년월일 정보를 찾을 수 없습니다.' });
    }

    console.log('🔮 사주 계산 시작:', {
      userId,
      name: user.name,
      birthDate,
      birthTime,
      calendarType,
      isLeap: !!isLeap
    });

    // 1단계: lunar-javascript로 사주 계산
    const sajuData = await callSajuAPI({
      birthDate,
      birthTime,
      calendarType: calendarType || 'solar',
      isLeap: !!isLeap,
      gender: user.gender // Tech Demo용 (대운 계산에 필요)
    });

    console.log('✅ 사주 계산 완료:', {
      year: `${sajuData.year.gan}${sajuData.year.ji}`,
      month: `${sajuData.month.gan}${sajuData.month.ji}`,
      day: `${sajuData.day.gan}${sajuData.day.ji}`,
      hour: `${sajuData.hour.gan}${sajuData.hour.ji}`,
      dayMaster: sajuData.dayMaster,
      wuxing: sajuData.wuxing
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
    detailedDataToSave.yongshen = result.yongshen; // [NEW] AI 용신 데이터 저장

    // 결과 저장 (스키마에 맞게 수정)
    const [resultData] = await db.execute(
      `INSERT INTO saju_results
       (user_id, saju_data, overall_fortune, wealth_fortune, love_fortune,
        career_fortune, health_fortune, oheng_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify({ ...sajuData, detailedData: detailedDataToSave }), // detailedData를 saju_data에 포함
        result.overall,
        result.wealth,
        result.love,
        result.career,
        result.health,
        JSON.stringify(result.oheng)
      ]
    );

    console.log('✅ 사주 결과 저장 완료 (ID:', resultData.insertId, ')');

    res.json({
      success: true,
      resultId: resultData.insertId,
      result: {
        ...result,
        analysisLogs: sajuData.analysisLogs // 서비스에서 생성된 로그 포함
      },
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
 * 무료 사용자용 사주 결과 계산 (AI 해석 제외)
 * 라이브러리(lunar-javascript)만 사용하여 즉시 결과를 반환하고 저장
 */
export async function calculateFreeResult(req, res) {
  try {
    const { accessToken, birthDate, birthTime, calendarType, isLeap } = req.body;

    if (!accessToken || !birthDate) {
      return res.status(400).json({
        error: '접근 토큰과 생년월일이 필요합니다.'
      });
    }

    // 사용자 정보 조회
    const [users] = await db.execute(
      `SELECT id, name, gender FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [accessToken]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];
    const userId = user.id;

    // [OPTIMIZATION] 기존에 결제하여 AI 결과가 있는지 먼저 확인 ('함수 수정 방식')
    // 가장 최근 결과 중 saju_data 안에 detailedData가 있는 것을 조회
    const [existingResults] = await db.execute(
      `SELECT * FROM saju_results WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // AI 데이터가 있는 결과 찾기
    const paidResult = existingResults.find(row => {
      try {
        const data = JSON.parse(row.saju_data || '{}');
        return data.detailedData && data.detailedData.personality; // AI 데이터 존재 확인
      } catch (e) { return false; }
    });

    // 기존 유료 결과가 있으면 즉시 반환 (LITERAL PASS-THROUGH)
    if (paidResult) {
      console.log('✅ 기존 유료 결과 발견! 무료 계산 스킵 및 즉시 반환 (ID:', paidResult.id, ')');

      const parsedSajuData = JSON.parse(paidResult.saju_data);
      const detailedData = parsedSajuData.detailedData;

      return res.json({
        success: true,
        result: {
          id: paidResult.id,
          sajuData: parsedSajuData,
          oheng: JSON.parse(paidResult.oheng_data || '{}'),
          talisman: detailedData.talisman,
          detailedData: detailedData,
          isPaid: true, // 프론트엔드에 유료 상태임을 알림
          analysisLogs: [] // 로딩 스킵을 위해 빈 로그 전달
        },
        message: '기존 유료 결과를 불러왔습니다.'
      });
    }

    // 1단계: lunar-javascript로 사주 계산 (매우 빠름)
    const sajuData = await callSajuAPI({
      birthDate,
      birthTime,
      calendarType: calendarType || 'solar',
      isLeap: !!isLeap,
      gender: user.gender
    });

    // 기본 결과 저장 (AI 데이터는 비워둠)
    const [resultData] = await db.execute(
      `INSERT INTO saju_results
       (user_id, saju_data, oheng_data)
       VALUES (?, ?, ?)`,
      [
        userId,
        JSON.stringify(sajuData),
        JSON.stringify(sajuData.wuxing) // 서비스에서 계산된 오행
      ]
    );

    res.json({
      success: true,
      result: {
        sajuData,
        oheng: sajuData.wuxing,
        analysisLogs: sajuData.analysisLogs, // 서비스에서 계산된 실시간 로그 포함

        isPaid: false
      },
      message: '기초 사주 계산이 완료되었습니다.'
    });
  } catch (error) {
    console.error('❌ 기초 사주 계산 오류:', error);
    res.status(500).json({
      error: '기초 사주 계산에 실패했습니다.',
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

    // 결제 여부 확인
    const [payments] = await db.execute(
      `SELECT id FROM payments WHERE user_id = ? AND product_type = 'basic' AND status = 'paid'`,
      [userId]
    );
    const isPaid = payments.length > 0;

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

    // saju_data에서 detailedData 추출 (스키마 변경으로 saju_data 안에 저장됨)
    const parsedSajuData = parseJsonData(result.saju_data, {});
    const detailedData = parsedSajuData.detailedData || null;

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
        isPaid, // 결제 여부 추가
        isPremium: !!result.is_premium, // 프리미엄 여부
        customHanjaName: result.custom_hanja_name || null, // 한자 이름
        overallFortune: result.overall_fortune,
        wealthFortune: result.wealth_fortune,
        loveFortune: result.love_fortune,
        careerFortune: result.career_fortune,
        healthFortune: result.health_fortune,
        scores: {
          overall: result.overall_score || 0,
          wealth: result.wealth_score || 0,
          love: result.love_score || 0,
          career: result.career_score || 0,
          health: result.health_score || 0
        },
        oheng: parseJsonData(result.oheng_data, {}),
        sajuData: parsedSajuData,
        talisman: detailedData?.talisman || { name: '갑자' },
        aiRawResponse: null,  // 더 이상 별도 저장 안 함
        detailedData: detailedData  // saju_data에서 추출한 상세 데이터
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
 * AI 해석 상태 확인
 * 사주 결과 생성 여부와 AI 데이터 포함 여부만 가볍게 확인
 */
export async function checkAiStatus(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    // 사용자 조회
    const [users] = await db.execute(
      `SELECT id FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [token]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const userId = users[0].id;

    // 최신 결과 조회
    const [results] = await db.execute(
      `SELECT id, ai_raw_response, detailed_data, created_at FROM saju_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    let isCompleted = false;
    let progress = 0;

    if (results.length > 0) {
      const result = results[0];
      // AI 데이터가 있거나 detailed_data에 내용이 있으면 완료로 판단
      if (result.ai_raw_response || (result.detailed_data && (typeof result.detailed_data === 'string' ? result.detailed_data.length > 50 : Object.keys(result.detailed_data).length > 2))) {
        isCompleted = true;
        progress = 100;
      }
    }

    // 결제 정보 확인
    const [payments] = await db.execute(
      `SELECT id FROM payments WHERE user_id = ? AND product_type = 'basic' AND status = 'paid'`,
      [userId]
    );
    const isPaid = payments.length > 0;

    res.json({
      success: true,
      isPaid,
      isCompleted,
      progress: isCompleted ? 100 : 30
    });

  } catch (error) {
    console.error('AI 상태 확인 오류:', error);
    res.status(500).json({
      error: '상태 확인 실패',
      message: error.message
    });
  }
}
