/**
 * 카카오 알림톡 서비스
 * 카카오 알림톡 API를 통한 메시지 발송
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const KAKAO_ALIMTALK_API_URL = 'https://kapi.kakao.com/v2/api/talk/messages/default/send';
const KAKAO_API_KEY = process.env.KAKAO_ALIMTALK_API_KEY;
const SENDER_KEY = process.env.KAKAO_ALIMTALK_SENDER_KEY;

/**
 * 알림톡 발송
 * @param {Object} messageData - 메시지 데이터
 * @returns {Object} 발송 결과
 */
export async function sendAlimtalk(messageData) {
  try {
    const { phone, templateCode, templateArgs, linkUrl } = messageData;

    if (!KAKAO_API_KEY || !SENDER_KEY) {
      console.warn('카카오 알림톡 API 키가 설정되지 않았습니다. 더미 발송으로 처리합니다.');
      return {
        success: true,
        message: '알림톡이 발송되었습니다. (개발 모드)',
        isDummy: true
      };
    }

    const response = await axios.post(
      KAKAO_ALIMTALK_API_URL,
      {
        receiver_uuids: [phone], // 실제로는 UUID가 필요하지만, 전화번호로도 가능
        template_id: templateCode,
        template_args: templateArgs,
        link: {
          web_url: linkUrl,
          mobile_web_url: linkUrl
        }
      },
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      message: '알림톡이 발송되었습니다.',
      result: response.data
    };
  } catch (error) {
    console.error('알림톡 발송 실패:', error);
    
    // 개발 모드에서는 에러를 던지지 않고 더미 성공 반환
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        message: '알림톡이 발송되었습니다. (개발 모드 - 실제 발송 실패)',
        isDummy: true,
        error: error.message
      };
    }

    throw new Error('알림톡 발송에 실패했습니다.');
  }
}

/**
 * 결과 링크 알림톡 발송
 * @param {Object} data - 발송 데이터
 * @returns {Object} 발송 결과
 */
export async function sendResultLink(data) {
  const { phone, userName, resultUrl } = data;

  return await sendAlimtalk({
    phone,
    templateCode: 'result_link', // 실제 템플릿 코드로 변경 필요
    templateArgs: {
      '#{user_name}': userName,
      '#{result_url}': resultUrl
    },
    linkUrl: resultUrl
  });
}

/**
 * 지연 안내 알림톡 발송
 * @param {Object} data - 발송 데이터
 * @returns {Object} 발송 결과
 */
export async function sendDelayNotice(data) {
  const { phone, userName, estimatedTime } = data;

  return await sendAlimtalk({
    phone,
    templateCode: 'delay_notice', // 실제 템플릿 코드로 변경 필요
    templateArgs: {
      '#{user_name}': userName,
      '#{estimated_time}': estimatedTime
    }
  });
}

/**
 * PDF 완료 알림톡 발송
 * @param {Object} data - 발송 데이터
 * @returns {Object} 발송 결과
 */
export async function sendPdfComplete(data) {
  const { phone, userName, downloadUrl } = data;

  return await sendAlimtalk({
    phone,
    templateCode: 'pdf_complete', // 실제 템플릿 코드로 변경 필요
    templateArgs: {
      '#{user_name}': userName,
      '#{download_url}': downloadUrl
    },
    linkUrl: downloadUrl
  });
}

