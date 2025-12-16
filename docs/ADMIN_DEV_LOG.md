# 🛡️ 관리자 페이지 개발 일지 (Admin Development Log)

> **프로젝트**: 사주 서비스 (Saju Project)
> **작성일**: 2025.12.16
> **작성자**: Antigravity (with User)

## 1. 프로젝트 철학: "책임 회피 (Responsibility Avoidance)"
이 관리자 페이지의 핵심 설계 사상은 **"개발자가 귀찮아질 일을 만들지 말자"**입니다.
운영팀이나 사장님이 개발자에게 DB 조회를 요청하지 않도록, 필요한 모든 기능을 UI로 구현했습니다.

- **POS 시스템 모토**: "사장님은 화면만 누르세요. DB는 저희가 알아서 합니다."
- **안전 제일**: 실수로 데이터를 날리거나, 보안 사고가 나지 않도록 이중 장치를 마련했습니다.

---

## 2. 주요 개발 과정 (History)

### Phase 1: 인증 시스템 (Authentication)
- **최초 설계**: Access/Refresh Token 이중 구조 고려.
- **최종 결정**: 관리자는 트래픽이 적고 보안이 통제된 환경이므로, **단일 JWT (Access Token)** 방식 채택.
- **보안 강화**:
    - 비밀번호는 `bcrypt`로 암호화.
    - `is_active` 컬럼 추가: 퇴사자 발생 시 DB에서 `0`으로 바꾸면 즉시 접속 차단 (Soft Block).

### Phase 2: 기능 구현 (Features)
1.  **회원 관리**:
    - 전체 회원 조회 및 상세 사주 결과 열람.
    - "이 회원 왜 결제 안 돼요?" 문의 대응용.
2.  **결제 및 환불**:
    - 포트원(Portone) API 연동.
    - **중요**: 부분 환불 및 전액 환불 기능을 관리자 페이지에 내장. (DB 직접 수정 금지)

### Phase 3: 보안 및 감사 (Audit & Security)
- **아이디 불변성 (Immutable Username)**:
    - 초기에는 아이디 변경이 가능했으나, 보안 감사(Audit) 추적을 위해 **변경 불가**로 스펙 변경.
- **감사 로그 (Audit Logs)**:
    - 누가(Admin), 언제(Time), 무엇을(Action), 어디서(IP) 했는지 기록하는 `admin_audit_logs` 테이블 구축.
    - **추적 대상**: 로그인, 비밀번호 변경, 환불 처리 등 민감한 작업.

### Phase 4: 대시보드 고도화 (Dashboard)
- **초기**: 단순 텍스트("통계 로드됨").
- **최종**: **"살아있는 상황판"**
    - 실시간 매출, 결제 건수, 평균 객단가(Total Revenue / Count) 표시.
    - **최근 활동 피드**: Audit Log를 연동하여 "누가 들어왔고, 누가 환불했는지" 실시간 중계.

---

## 3. 기술 스택 및 구조 (Tech Stack)

### Backend (Node.js + Express)
- **Middleware**: `adminAuth.js` - JWT 검증 및 `is_active` 체크.
- **Logger**: `auditLogger.js` - DB 기반 감사 로그 유틸리티.
- **Controllers**:
    - `adminController.js`: 인증 및 프로필.
    - `adminPaymentController.js`: 결제 통계 및 환불 로직.

### Frontend (React + Vite)
- **UI Library**: TailwindCSS + Lucide Icons (직관적인 아이콘 사용).
- **Api Utility**: `adminApi.js` - Axios Interceptor로 JWT 자동 주입.
- **Components**:
    - `AdminDashboard`: 실시간 활동 피드 포함.
    - `AdminProfile`: 보안 설정(비번 변경 등).

---

## 4. 인수인계 가이드 (For Next Developer)
1.  **DB 접근 금지**: 운영 이슈는 99% 관리자 페이지에서 해결 가능하도록 설계됨.
2.  **로그 확인**: `admin_audit_logs` 테이블을 보면 누가 사고쳤는지 1초 만에 파악 가능.
3.  **확장성**: 메뉴가 추가되면 `Layout.jsx` 사이드바에만 추가하면 됨.

> "이 시스템은 개발자의 '주말이 있는 삶'을 위해 설계되었습니다."
