-- 관리자 테이블 생성
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '관리자 로그인 ID',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시 비밀번호',
  name VARCHAR(50) NOT NULL COMMENT '관리자 이름',
  email VARCHAR(100) COMMENT '관리자 이메일',
  last_login TIMESTAMP NULL COMMENT '마지막 로그인 시간',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 계정 테이블';

-- payments 테이블에 환불 추적 컬럼 추가
ALTER TABLE payments
ADD COLUMN refund_reason TEXT COMMENT '환불 사유',
ADD COLUMN refunded_by INT COMMENT '환불 처리한 관리자 ID',
ADD COLUMN refunded_at TIMESTAMP NULL COMMENT '환불 처리 일시',
ADD CONSTRAINT fk_payments_refunded_by FOREIGN KEY (refunded_by) REFERENCES admins(id) ON DELETE SET NULL;

-- 환불 관련 인덱스 추가
ALTER TABLE payments
ADD INDEX idx_refunded_at (refunded_at);
