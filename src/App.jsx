import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SajuApp from './components/SajuApp';
import ResultPage from './pages/ResultPage';

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
  return (
    <Routes>
      {/* 메인 플로우: 랜딩 → 입력 → 결제 → 분석 → 결과 */}
      <Route path="/" element={<SajuApp />} />

      {/* URL 파라미터로 결과 조회: /result/:token */}
      <Route path="/result/:token" element={<ResultPage />} />

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
  );
}

export default App;
