/**
 * 카카오 알림톡 서비스
 * 카카오 알림톡 API를 통한 메시지 발송
 * 
 * 참고: 실제 발송을 위해서는 카카오 비즈니스 채널 등록 및 템플릿 승인이 필요합니다.
 * 자세한 내용은 docs/카카오-알림톡-연동-가이드.md 참고
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// 카카오 알림톡 API 엔드포인트 (알림톡 전용)
const KAKAO_ALIMTALK_API_URL = 'https://kapi.kakao.com/v1/alimtalk/messages/send';
const KAKAO_API_KEY = process.env.KAKAO_ALIMTALK_API_KEY; // REST API 키
const SENDER_KEY = process.env.KAKAO_ALIMTALK_SENDER_KEY; // 발신 프로필 키
const TEMPLATE_CODE = process.env.KAKAO_ALIMTALK_TEMPLATE_CODE; // 템플릿 코드

/**
 * 알림톡 발송
 * 카카오 알림톡 API를 사용하여 메시지 발송
 * 
 * @param {Object} messageData - 메시지 데이터
 * @param {string} messageData.phone - 수신자 전화번호 (하이픈 제거, 숫자만)
 * @param {string} messageData.templateCode - 템플릿 코드 (환경 변수 또는 파라미터)
 * @param {Object} messageData.templateArgs - 템플릿 변수 객체
 * @param {string} messageData.linkUrl - 링크 URL (선택)
 * @returns {Object} 발송 결과
 */
export async function sendAlimtalk(messageData) {
  try {
    const { phone, templateCode, templateArgs, linkUrl } = messageData;

    // 환경 변수 확인
    if (!KAKAO_API_KEY || !SENDER_KEY) {
      console.warn('⚠️  카카오 알림톡 API 키가 설정되지 않았습니다. 더미 발송으로 처리합니다.');
      console.warn('   환경 변수 설정: KAKAO_ALIMTALK_API_KEY, KAKAO_ALIMTALK_SENDER_KEY');
      return {
        success: true,
        message: '알림톡이 발송되었습니다. (개발 모드 - 더미)',
        isDummy: true
      };
    }

    // 전화번호 포맷팅 (하이픈 제거, 숫자만)
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    
    // 템플릿 코드 (파라미터 우선, 없으면 환경 변수)
    const templateId = templateCode || TEMPLATE_CODE;
    
    if (!templateId) {
      console.warn('⚠️  템플릿 코드가 설정되지 않았습니다.');
      return {
        success: false,
        message: '템플릿 코드가 필요합니다.',
        isDummy: true
      };
    }

    // 알림톡 API 요청 본문 구성
    const requestBody = {
      receiver_phone_number: formattedPhone,
      template_id: templateId,
      template_argument: templateArgs || {}
    };

    // 링크가 있는 경우 추가
    if (linkUrl) {
      requestBody.link = {
        web_url: linkUrl,
        mobile_web_url: linkUrl
      };
    }

    // API 호출
    const response = await axios.post(
      KAKAO_ALIMTALK_API_URL,
      requestBody,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ 알림톡 발송 성공:', {
      phone: formattedPhone,
      templateId,
      messageId: response.data?.message_id
    });

    return {
      success: true,
      message: '알림톡이 발송되었습니다.',
      result: response.data,
      messageId: response.data?.message_id
    };
  } catch (error) {
    console.error('❌ 알림톡 발송 실패:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // 개발 모드에서는 에러를 던지지 않고 더미 성공 반환
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        message: '알림톡이 발송되었습니다. (개발 모드 - 실제 발송 실패)',
        isDummy: true,
        error: error.response?.data?.msg || error.message
      };
    }

    // 프로덕션 모드에서는 에러 던지기
    throw new Error(`알림톡 발송에 실패했습니다: ${error.response?.data?.msg || error.message}`);
  }
}

/**
 * 결과 링크 알림톡 발송
 * 결제 완료 후 사주 결과 조회 링크를 발송
 * 
 * @param {Object} data - 발송 데이터
 * @param {string} data.phone - 수신자 전화번호
 * @param {string} data.userName - 사용자 이름
 * @param {string} data.resultUrl - 결과 조회 링크 URL
 * @returns {Object} 발송 결과
 */
export async function sendResultLink(data) {
  const { phone, userName, resultUrl } = data;

  // 템플릿 변수 설정 (카카오 알림톡 템플릿 변수 형식)
  // 템플릿에서 #{변수명} 형식으로 사용하는 경우, 변수명만 전달
  const templateArgs = {
    '#{user_name}': userName || '고객',
    '#{result_url}': resultUrl
  };

  return await sendAlimtalk({
    phone,
    templateCode: process.env.KAKAO_ALIMTALK_TEMPLATE_CODE || 'result_link',
    templateArgs,
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

