import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SajuApp from './components/SajuApp';
import ResultPage from './pages/ResultPage';
import ArchivePage from './pages/ArchivePage';
import PaymentCallback from './pages/PaymentCallback';
import Footer from './components/Footer';

// Legal Pages
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';


// Admin Components
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminPayments from './pages/AdminPayments';
import AdminUsers from './pages/AdminUsers';
import AdminProfile from './pages/AdminProfile';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * 메인 App 컴포넌트
 * 라우터 설정 및 페이지 라우팅
 */
function App() {
  const location = useLocation();

  // Footer를 표시할 페이지 목록 (랜딩 페이지 + 법적 페이지만)
  const searchParams = new URLSearchParams(location.search);
  const currentStep = searchParams.get('step');

  // 푸터 표시 조건:
  // 1. / 경로이면서 step이 없거나 'landing'인 경우 (랜딩 페이지)
  // 2. /terms 또는 /privacy 페이지
  const shouldShowFooter =
    (location.pathname === '/' && (!currentStep || currentStep === 'landing')) ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy';

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Routes>
          {/* 메인 플로우: 랜딩 → 입력 → 결제 → 분석 → 결과 */}
          <Route path="/" element={<SajuApp />} />
          <Route path="/archive" element={<ArchivePage />} />

          {/* URL 파라미터로 결과 조회: /result/:token */}
          <Route path="/result" element={<ResultPage />} />
          <Route path="/result/:token" element={<ResultPage />} />

          {/* 결제 콜백 처리 (모바일/하이브리드 결제 리다이렉트용) */}
          <Route path="/payment/callback" element={<PaymentCallback />} />

          {/* 법적 필수 페이지 (PG사 심사 필수) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />


          {/* 관리자 페이지 */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>
          </Route>
        </Routes>
      </main>

      {/* 메인 페이지와 법적 페이지에만 Footer 표시 (서비스 페이지는 집중도 향상을 위해 숨김) */}
      {shouldShowFooter && <Footer />}
    </div>
  );
}

export default App;
