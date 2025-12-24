-- payments 테이블에 refunded_at 컬럼 추가
-- Webhook에서 결제 취소/환불 시간 기록용

ALTER TABLE payments
ADD COLUMN refunded_at TIMESTAMP NULL AFTER paid_at;
