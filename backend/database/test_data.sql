-- 사주풀이 플랫폼 테스트 데이터
-- 개발용 테스트 계정 및 결과 데이터

USE saju_db;

-- 1. 테스트 사용자 생성 (기존 데이터 있으면 삭제 후 재생성)
DELETE FROM users WHERE access_token = 'ff1b8cc6a85f484170e518cbc8e49a7c2956c5374e5817e75e3b2bbb96a57f11';

INSERT INTO users (name, phone, birth_date, birth_time, gender, calendar_type, access_token, created_at)
VALUES (
  '테스트사용자',
  '010-1234-5678',
  '1990-01-01',
  '12:00',
  'male',
  'solar',
  'ff1b8cc6a85f484170e518cbc8e49a7c2956c5374e5817e75e3b2bbb96a57f11',
  NOW()
);

-- 생성된 user_id 확인
SET @test_user_id = LAST_INSERT_ID();

-- 2. 테스트 사주 결과 생성
INSERT INTO saju_results (
  user_id,
  saju_data,
  overall_fortune,
  wealth_fortune,
  love_fortune,
  career_fortune,
  health_fortune,
  overall_score,
  wealth_score,
  love_score,
  career_score,
  health_score,
  oheng_data,
  created_at
) VALUES (
  @test_user_id,
  '{"year": "경오", "month": "정축", "day": "신해", "time": "갑오"}',
  '2026년은 당신에게 새로운 기회의 해입니다. 목표를 향해 꾸준히 노력한다면 좋은 결과를 얻을 수 있습니다. 변화를 두려워하지 말고 적극적으로 대응하세요.',
  '재물운이 상승하는 한 해입니다. 투자보다는 저축에 집중하는 것이 좋으며, 부업이나 새로운 수입원을 모색해보세요. 상반기보다 하반기에 재운이 더욱 상승합니다.',
  '사랑의 기운이 가득한 해입니다. 솔로라면 새로운 만남의 기회가 많고, 연인이 있다면 관계가 한층 깊어질 수 있습니다. 진솔한 대화가 중요합니다.',
  '직장에서의 인정을 받을 가능성이 높습니다. 새로운 프로젝트나 업무에 적극적으로 참여하면 승진이나 급여 상승의 기회가 올 수 있습니다. 동료와의 협력이 중요합니다.',
  '전반적으로 건강한 한 해이지만, 스트레스 관리에 신경 써야 합니다. 규칙적인 운동과 충분한 휴식을 취하세요. 특히 소화기 계통 건강에 주의가 필요합니다.',
  85,
  78,
  88,
  82,
  75,
  '{"목": 25, "화": 35, "토": 20, "금": 15, "수": 5}',
  NOW()
);

-- 3. 테스트 결제 데이터 생성 (기본 사주 결제 완료)
INSERT INTO payments (
  user_id,
  merchant_uid,
  imp_uid,
  amount,
  product_type,
  status,
  paid_at,
  created_at
) VALUES (
  @test_user_id,
  CONCAT('saju_test_', UNIX_TIMESTAMP()),
  CONCAT('imp_test_', UNIX_TIMESTAMP()),
  9900,
  'basic',
  'paid',
  NOW(),
  NOW()
);

-- 결과 확인
SELECT
  u.id as user_id,
  u.name,
  u.phone,
  u.access_token,
  r.id as result_id,
  r.overall_score,
  p.amount,
  p.status as payment_status
FROM users u
LEFT JOIN saju_results r ON u.id = r.user_id
LEFT JOIN payments p ON u.id = p.user_id
WHERE u.access_token = 'ff1b8cc6a85f484170e518cbc8e49a7c2956c5374e5817e75e3b2bbb96a57f11';
