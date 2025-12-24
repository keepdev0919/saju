-- 사주풀이 플랫폼 데이터베이스 스키마
-- MySQL 데이터베이스 생성 및 테이블 구조

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS saju_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saju_db;

-- 사용자 테이블 (결제 정보 기반, 비회원)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  birth_date DATE NOT NULL,
  birth_time VARCHAR(10),           -- "모름" 또는 "02:30" 형태
  gender ENUM('male', 'female') NOT NULL,
  calendar_type ENUM('solar', 'lunar') DEFAULT 'solar',
  access_token VARCHAR(100) UNIQUE, -- 결과 페이지 접근용 고유 토큰
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL, -- Soft Delete (탈퇴/삭제 시 날짜 기록)
  
  -- 같은 휴대폰+생년월일 조합으로 본인 확인
  UNIQUE KEY unique_user (phone, birth_date),
  INDEX idx_access_token (access_token),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_name (name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 결제 테이블
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  merchant_uid VARCHAR(100) UNIQUE NOT NULL, -- 주문번호 (우리가 생성)
  imp_uid VARCHAR(100),                       -- 포트원 결제 고유번호
  amount INT NOT NULL,                        -- 결제 금액
  product_type ENUM('basic', 'pdf') NOT NULL DEFAULT 'basic', -- 기본 사주 or PDF 추가
  status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  refunded_at TIMESTAMP NULL,                 -- 환불 처리 시간 (Webhook용)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_merchant_uid (merchant_uid),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사주 결과 테이블
CREATE TABLE IF NOT EXISTS saju_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  -- 사주 팔자 (API에서 받아온 원본 데이터)
  saju_data JSON,                    -- 만세력 API 응답 저장
  
  -- 해석된 결과 (텍스트)
  overall_fortune TEXT,              -- 총운
  wealth_fortune TEXT,               -- 재물운
  love_fortune TEXT,                 -- 애정운
  career_fortune TEXT,               -- 직장운
  health_fortune TEXT,               -- 건강운
  
  -- 점수
  overall_score INT,
  wealth_score INT,
  love_score INT,
  career_score INT,
  health_score INT,
  
  -- 오행 분석
  oheng_data JSON,                   -- { "목": 20, "화": 60, ... }
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 알림톡 발송 기록
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('result_link', 'delay_notice', 'pdf_complete') NOT NULL,
  phone VARCHAR(20) NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

