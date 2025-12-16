
import db from '../config/database.js';
import { logAdminAction } from '../utils/auditLogger.js';

/**
 * 사주 결과 수정 (관리자용)
 * 특정 사주 결과의 텍스트 내용을 수정합니다.
 */
export async function updateResult(req, res) {
    try {
        const { id } = req.params;
        const { overall, wealth, love, career, health } = req.body;
        const adminId = req.user.id; // adminAuth 미들웨어에서 설정됨

        if (!id) {
            return res.status(400).json({ error: '결과 ID가 필요합니다.' });
        }

        // 1. 기존 결과 조회 (존재 여부 확인)
        const [existing] = await db.execute(
            `SELECT id, user_id FROM saju_results WHERE id = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: '해당 사주 결과를 찾을 수 없습니다.' });
        }

        const { user_id } = existing[0];

        // 2. 결과 업데이트
        // JSON 필드가 아닌 텍스트 컬럼(overall_fortune 등)을 업데이트합니다.
        await db.execute(
            `UPDATE saju_results 
       SET overall_fortune = ?, wealth_fortune = ?, love_fortune = ?, career_fortune = ?, health_fortune = ?
       WHERE id = ?`,
            [overall, wealth, love, career, health, id]
        );

        // 3. 감사 로그 기록
        await logAdminAction({
            adminId,
            action: 'UPDATE_RESULT',
            target: `result_id:${id}`,
            details: JSON.stringify({ overall, wealth, love, career, health }), // 변경된 내용 요약
            req
        });

        res.json({
            success: true,
            message: '사주 결과가 성공적으로 수정되었습니다.'
        });

    } catch (error) {
        console.error('❌ Admin Update Result Error:', error);
        res.status(500).json({
            error: '사주 결과 수정 중 오류가 발생했습니다.',
            message: error.message
        });
    }
}
