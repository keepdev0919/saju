/**
 * 관리자 회원 관리 컨트롤러
 * 회원 목록 조회, 상세 조회 (사주 결과, 결제 내역 포함)
 */
import db from '../config/database.js';

/**
 * 회원 목록 조회 (페이징, 검색)
 * GET /api/admin/users
 * 
 * @query {number} page - 페이지 번호
 * @query {number} limit - 페이지당 항목 수
 * @query {string} search - 검색어 (이름, 전화번호)
 */
export async function getUsers(req, res) {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = `WHERE name LIKE ? OR phone LIKE ?`;
            const searchPattern = `%${search}%`;
            queryParams = [searchPattern, searchPattern];
        }

        // 총 개수 조회
        const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        // 회원 목록 조회
        const listQuery = `
      SELECT 
        id, name, phone, birth_date, gender, calendar_type, created_at, deleted_at,
        (SELECT COUNT(*) FROM payments WHERE user_id = users.id AND status = 'paid') as payment_count,
        (SELECT SUM(amount) FROM payments WHERE user_id = users.id AND status = 'paid') as total_payment_amount
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

        const [users] = await db.query(listQuery, [...queryParams, parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ 회원 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '회원 목록 조회 중 오류가 발생했습니다.'
        });
    }
}

/**
 * 회원 상세 조회
 * GET /api/admin/users/:id
 */
export async function getUserDetail(req, res) {
    try {
        const { id } = req.params;

        // 1. 회원 기본 정보
        const [users] = await db.query(
            `SELECT id, name, phone, birth_date, birth_time, gender, calendar_type, created_at, deleted_at FROM users WHERE id = ?`,
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        const user = users[0];

        // 2. 사주 결과 내역
        const [sajuResults] = await db.query(
            `SELECT id, LEFT(overall_fortune, 50) as request_summary, created_at FROM saju_results WHERE user_id = ? ORDER BY created_at DESC`,
            [id]
        );

        // 3. 결제 내역
        const [payments] = await db.query(
            `SELECT id, merchant_uid, amount, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC`,
            [id]
        );

        res.json({
            success: true,
            user,
            sajuResults,
            payments
        });

    } catch (error) {
        console.error('❌ 회원 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: '회원 상세 조회 중 오류가 발생했습니다.'
        });
    }
}
