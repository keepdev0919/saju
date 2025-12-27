/**
 * 수호신 카드 컨트롤러
 * 고화질 수호신 이미지 다운로드 기능
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import db from '../config/database.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 수호신 카드 이미지 다운로드
 * 프리미엄 사용자: 한자 이름 각인
 * 일반 사용자: 기본 "天命錄" 각인
 */
export async function downloadTalismanImage(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    // 사용자 및 사주 결과 조회
    const [users] = await db.execute(
      `SELECT u.id, u.name, sr.talisman_name, sr.custom_hanja_name, sr.is_premium
       FROM users u
       LEFT JOIN saju_results sr ON u.id = sr.user_id AND sr.deleted_at IS NULL
       WHERE u.access_token = ? AND u.deleted_at IS NULL`,
      [token]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];

    if (!user.talisman_name) {
      return res.status(404).json({ error: '수호신 카드 정보를 찾을 수 없습니다.' });
    }

    // 원본 이미지 경로
    const imagePath = path.join(
      __dirname,
      '../../public/images/talisman',
      `${user.talisman_name}.png`
    );

    // 이미지 파일 존재 확인
    try {
      await fs.access(imagePath);
    } catch {
      return res.status(404).json({
        error: '수호신 이미지를 찾을 수 없습니다.',
        talismanName: user.talisman_name
      });
    }

    // Sharp로 이미지 로드
    let image = sharp(imagePath);

    // 프리미엄 사용자일 경우 한자 이름 각인
    if (user.is_premium && user.custom_hanja_name) {
      const customName = user.custom_hanja_name;

      // 한자 이름 포맷팅
      let displayName;
      if (customName.length === 2) {
        displayName = customName + '之印'; // 2자: "李浩之印"
      } else if (customName.length === 3) {
        displayName = customName + '印'; // 3자: "李敏浩印"
      } else {
        displayName = customName; // 4자: 그대로
      }

      // SVG 텍스트 레이어 생성 (2×2 그리드 배치)
      const chars = displayName.split('');
      const svgText = `
        <svg width="1024" height="1536">
          <defs>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@900&display=swap');
            </style>
          </defs>
          ${chars.map((char, i) => {
            const col = i % 2; // 0 or 1
            const row = Math.floor(i / 2); // 0, 1, 2...
            const x = 825 + (col * 50); // 825, 875
            const y = 1400 + (row * 60); // 1400, 1460, 1520...
            return `<text x="${x}" y="${y}"
                    font-family="Noto Serif KR, Gungsuh, Batang, serif"
                    font-size="60"
                    fill="#b91c1c"
                    font-weight="900"
                    text-anchor="middle">${char}</text>`;
          }).join('')}
        </svg>
      `;

      const textBuffer = Buffer.from(svgText);

      // 이미지 합성
      image = image.composite([
        { input: textBuffer, top: 0, left: 0 }
      ]);

      console.log(`✅ 프리미엄 수호신 카드 생성 (한자: ${displayName})`);
    } else {
      console.log(`✅ 기본 수호신 카드 생성 (기본 각인)`);
    }

    // PNG로 변환
    const buffer = await image.png({ quality: 100 }).toBuffer();

    // 파일명 설정
    const fileName = user.is_premium && user.custom_hanja_name
      ? `수호신_${user.custom_hanja_name}.png`
      : `수호신_${user.name}.png`;

    // 응답 헤더 설정
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('수호신 이미지 다운로드 오류:', error);
    res.status(500).json({
      error: '수호신 이미지 다운로드에 실패했습니다.',
      message: error.message
    });
  }
}
