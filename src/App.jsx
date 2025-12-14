import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SajuApp from './components/SajuApp';
import ResultPage from './pages/ResultPage';

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
    </Routes>
  );
}

export default App;
