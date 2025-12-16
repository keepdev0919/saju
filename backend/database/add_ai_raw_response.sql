-- AI 원본 응답 컬럼 추가
-- 실행 방법: MySQL에서 실행하거나 데이터베이스 관리 도구에서 실행

ALTER TABLE saju_results 
ADD COLUMN ai_raw_response TEXT COMMENT 'AI 원본 응답 (파싱 전 전체 텍스트)' 
AFTER health_fortune;

