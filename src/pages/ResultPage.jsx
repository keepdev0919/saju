/**
 * 결과 조회 페이지 (Result Page 2.0)
 * 사용자에게 강렬한 첫인상(Aggro)과 데이터 시각화, 구체적 솔루션을 제공하는 업그레이드 버전
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSajuResult, verifyUser, createPayment, verifyPayment, generatePDF, getPdfDownloadUrl, checkPdfPayment } from '../utils/api';
import { RefreshCw, Download, X, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Share2, Sparkles, TrendingUp, Heart, Briefcase, Activity, Zap, Compass, MapPin, Search } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, RadialBarChart, RadialBar } from 'recharts';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import TalismanCard from '../components/TalismanCard';
import { talismanNames } from '../data/talismanData';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pdfjsOptions = {
  cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// --- [Helper Functions for Naming] ---
const getGanColor = (gan) => {
  if (['갑', '을'].includes(gan)) return { name: '푸른', color: 'text-green-400', bg: 'from-green-500 to-emerald-700' };
  if (['병', '정'].includes(gan)) return { name: '붉은', color: 'text-red-400', bg: 'from-red-500 to-rose-700' };
  if (['무', '기'].includes(gan)) return { name: '황금', color: 'text-yellow-400', bg: 'from-yellow-400 to-amber-600' };
  if (['경', '신'].includes(gan)) return { name: '백색', color: 'text-slate-100', bg: 'from-slate-300 to-slate-500' };
  if (['임', '계'].includes(gan)) return { name: '검은', color: 'text-blue-400', bg: 'from-blue-600 to-indigo-800' };
  return { name: '신비한', color: 'text-purple-400', bg: 'from-purple-500 to-violet-700' };
};

const getJiAnimal = (ji) => {
  const animals = { '자': '쥐', '축': '소', '인': '호랑이', '묘': '토끼', '진': '용', '사': '뱀', '오': '말', '미': '양', '신': '원숭이', '유': '닭', '술': '개', '해': '돼지' };
  return animals[ji] || '동물';
};

// 천간(Gan) 한자 맵
const ganHanjaMap = {
  '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
  '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
};

// 지지(Ji) 한자 맵
const jiHanjaMap = {
  '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
  '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
};

// 전통 오방색 피그먼트 맵 (Premium Pigments)
const elementColorMap = {
  목: '#3F6212', // Faded Pine
  화: '#991B1B', // Cinnabar (Jusa)
  토: '#B45309', // Yellow Earth
  금: '#D1D5DB', // Aged Silver
  수: '#1E3A8A'  // Indigo Ink
};

// 오행별 광휘(Aura) 맵
const elementAuraMap = {
  목: 'rgba(63, 98, 18, 0.4)',
  화: 'rgba(153, 27, 27, 0.4)',
  토: 'rgba(180, 83, 9, 0.4)',
  금: 'rgba(209, 213, 219, 0.3)',
  수: 'rgba(30, 58, 138, 0.4)'
};

// 천간 → 오행
const getElementFromGan = (gan) => {
  if (!gan) return null;
  if (['갑', '을'].includes(gan)) return '목';
  if (['병', '정'].includes(gan)) return '화';
  if (['무', '기'].includes(gan)) return '토';
  if (['경', '신'].includes(gan)) return '금';
  if (['임', '계'].includes(gan)) return '수';
  return null;
};

// 지지 → 오행
const getElementFromJi = (ji) => {
  if (!ji) return null;
  const map = {
    '자': '수', '축': '토', '인': '목', '묘': '목', '진': '토', '사': '화',
    '오': '화', '미': '토', '신': '금', '유': '금', '술': '토', '해': '수'
  };
  return map[ji] || null;
};

const getElementColor = (element) => elementColorMap[element] || '#78716c';
const getElementAura = (element) => elementAuraMap[element] || 'transparent';

const ResultPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // 상태 관리
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sajuResult, setSajuResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('overall'); // overall, money, love, career, health

  // [Tech Demo] 개발자 모드 상태
  const [showTechData, setShowTechData] = useState(false);

  // 인증 및 PDF 상태
  const [showAuth, setShowAuth] = useState(false);
  const [authData, setAuthData] = useState({ phone: '', birthDate: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [pdfPaymentStatus, setPdfPaymentStatus] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // [Talisman Collection Mode]
  const [showTalismanSelector, setShowTalismanSelector] = useState(false);
  const [testTalismanKey, setTestTalismanKey] = useState(null);

  // [Talisman View Interaction]
  const [talismanViewMode, setTalismanViewMode] = useState('image');
  const [isTalismanFlipped, setIsTalismanFlipped] = useState(false);
  const [isTalismanPurchased, setIsTalismanPurchased] = useState(false);

  // 애니메이션 상태
  const [mounted, setMounted] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const talismanCardRef = useRef(null);

  // [Tech Demo] Mock Data for Testing without Token
  const MOCK_DATA = {
    scores: { overall: 85, wealth: 90, love: 75, career: 88, health: 80 },
    oheng: { 목: 20, 화: 30, 토: 10, 금: 15, 수: 25 },
    talisman: {
      name: '갑자',
      reason: {
        element: '수(水)',
        stem: '임(壬)',
        branch: '자',
        branchAnimal: '쥐',
        userYearJi: '쥐'
      }
    }, // Default Demo Talisman
    oheng_deficiency: { most_deficient: '수(水)' },
    detailedData: {
      personality: { description: '당신은 푸른 소나무처럼 굳건한 의지를 지닌 지도자입니다.' },
      wealth: { description: '재물운이 매우 좋으며, 꾸준한 노력으로 큰 부를 쌓을 수 있습니다.' },
      marriage: { description: '진솔하고 깊은 사랑을 추구하며, 신뢰가 바탕이 된 관계가 길합니다.' },
      business: { advice: '새로운 프로젝트를 시작하기에 아주 좋은 시기입니다. 리더십을 발휘하세요.' },
      health: { description: '전반적으로 건강하나 스트레스 관리에 유의해야 합니다.' }
    }
  };

  // 데이터 로드
  useEffect(() => {
    const fetchResult = async () => {
      // [Tech Demo Mode] 토큰이 없으면 모의 데이터 로드
      if (!token) {
        console.warn('⚠️ No token provided. Loading [Tech Demo] Mock Data.');
        setSajuResult(MOCK_DATA);
        setUserInfo({ name: '테스트 유저', birthDate: '1990-01-01' });
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
        return;
      }

      try {
        const response = await getSajuResult(token);
        setSajuResult(response.result);
        setUserInfo(response.user || null);
        if (response.user?.id) checkPdfPaymentStatus(response.user.id);
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
      } catch (err) {
        if (err.status === 404) setShowAuth(true);
        else setError(err.message || '결과 로드 실패');
        setLoading(false);
      }
    };
    fetchResult();
  }, [token]);

  // 점수 애니메이션
  useEffect(() => {
    if (mounted && sajuResult) {
      const targetScore = sajuResult.scores?.overall || 82;
      let start = 0;
      const animate = () => {
        start += (targetScore - start) * 0.1;
        setScoreAnimated(Math.floor(start));
        if (Math.abs(targetScore - start) > 0.5) requestAnimationFrame(animate);
        else setScoreAnimated(targetScore);
      };
      requestAnimationFrame(animate);
    }
  }, [mounted, sajuResult]);

  // --- 기존 핸들러들 (Auth, PDF) 유지 ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authData.phone || !authData.birthDate) { setAuthError('정보를 입력해주세요.'); return; }
    setAuthLoading(true); setAuthError(null);
    try {
      const response = await verifyUser(authData);
      if (response.user?.accessToken) {
        const res = await getSajuResult(response.user.accessToken);
        setSajuResult(res.result);
        setUserInfo(response.user);
        setShowAuth(false);
      }
    } catch (err) { setAuthError(err.message); } finally { setAuthLoading(false); }
  };

  const checkPdfPaymentStatus = async (userId) => {
    try {
      const res = await checkPdfPayment(token);
      setPdfPaymentStatus(res.success && res.hasPaid ? 'paid' : 'none');
    } catch (e) { setPdfPaymentStatus('none'); }
  };

  const handlePdfPreview = async () => {
    if (!userInfo?.id || !sajuResult?.id) return;
    setPdfLoading(true); setPdfError(null);
    try {
      const blob = await generatePDF({ userId: userInfo.id, resultId: sajuResult.id, preview: true });
      if (blob) {
        setPdfPreviewUrl(URL.createObjectURL(blob));
        setShowPdfPreview(true);
      }
    } catch (e) { setPdfError(e.message); } finally { setPdfLoading(false); }
  };

  const handleClosePdfPreview = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null); setShowPdfPreview(false);
  };

  const handlePdfPayment = async () => {
    if (!userInfo?.id) return;
    setPdfLoading(true);
    try {
      if (typeof window.IMP === 'undefined') throw new Error('결제 모듈 로드 실패');
      const amount = parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_PDF || '100', 10);
      const { merchantUid } = await createPayment({ userId: userInfo.id, amount, productType: 'pdf' });

      window.IMP.init(import.meta.env.VITE_PORTONE_IMP_KEY || 'imp12345678');
      window.IMP.request_pay({
        pg: 'html5_inicis', pay_method: 'card', merchant_uid: merchantUid,
        name: '사주 PDF 다운로드', amount, buyer_name: userInfo.name, buyer_tel: userInfo.phone,
        m_redirect_url: `${window.location.origin}/payment/callback`
      }, async (rsp) => {
        if (rsp.success) await processPdfPaymentSuccess(rsp.imp_uid, merchantUid);
        else { setPdfError(rsp.error_msg); setPdfLoading(false); }
      });
    } catch (e) { setPdfError(e.message); setPdfLoading(false); }
  };

  const processPdfPaymentSuccess = async (impUid, merchantUid) => {
    try {
      const verify = await verifyPayment({ imp_uid: impUid, merchant_uid: merchantUid });
      if (!verify.success) throw new Error(verify.error);
      const pdf = await generatePDF({ userId: userInfo.id, resultId: sajuResult.id });
      if (pdf.success) {
        window.open(getPdfDownloadUrl(token), '_blank');
        setPdfPaymentStatus('paid');
      }
    } catch (e) { setPdfError(e.message); } finally { setPdfLoading(false); }
  };

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const pdf = await generatePDF({ userId: userInfo.id, resultId: sajuResult.id });
      if (pdf.success) window.open(getPdfDownloadUrl(token), '_blank');
    } catch (e) { setPdfError(e.message); } finally { setPdfLoading(false); }
  };


  const titleFont = "font-serif tracking-[0.2em]";
  const bodyFont = "font-sans tracking-normal";

  // --- Render Helpers ---
  if (loading) return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center text-amber-900">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-t-2 border-amber-600 rounded-full animate-spin"></div>
        <p className={`text-sm tracking-[0.3em] uppercase ${titleFont}`}>天命錄 로딩 중...</p>
      </div>
    </div>
  );

  if (showAuth) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-amber-900/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="bg-stone-900/40 backdrop-blur-xl p-10 rounded-sm w-full max-w-md text-stone-200 border border-amber-900/20 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <h2 className={`text-2xl font-bold text-amber-500/90 mb-2 ${titleFont}`}>本人確認</h2>
          <p className="text-stone-500 text-xs font-light tracking-widest uppercase">Identity Verification</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] text-stone-600 uppercase tracking-widest ml-1">Phone Number</label>
            <input
              type="tel"
              placeholder="010-0000-0000"
              className="w-full bg-transparent border-b border-amber-900/30 py-3 text-amber-500 outline-none focus:border-amber-500/50 transition-all tracking-widest"
              value={authData.phone}
              onChange={e => setAuthData({ ...authData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-stone-600 uppercase tracking-widest ml-1">Birth Date</label>
            <input
              type="date"
              className="w-full bg-transparent border-b border-amber-900/30 py-3 text-amber-500 outline-none focus:border-amber-500/50 transition-all [color-scheme:dark]"
              value={authData.birthDate}
              onChange={e => setAuthData({ ...authData, birthDate: e.target.value })}
            />
          </div>

          {authError && <p className="text-red-900/80 text-[10px] text-center uppercase tracking-tighter">{authError}</p>}

          <button className="w-full bg-amber-800/80 hover:bg-amber-700 text-amber-100 py-4 rounded-sm font-medium tracking-[0.3em] transition-all border border-amber-600/30">
            確認 (확인)
          </button>
        </form>
      </div>
    </div>
  );
  if (error) return <div className="text-white p-10 text-center">{error}</div>;
  if (!sajuResult) return null;
  // 이름 생성 (Day Gan-Ji) - 데이터 누락 시 안전장치
  const dayGan = sajuResult.sajuData?.day?.gan;
  const dayJi = sajuResult.sajuData?.day?.ji;

  // 데이터가 완벽하지 않으면 로딩/에러 처리
  if (!dayGan || !dayJi) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center p-10">
          <h3 className="text-xl font-bold mb-2">데이터 분석 중 오류가 발생했습니다.</h3>
          <p className="text-slate-400">사주 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { name: colorName, color: colorText, bg: bgGradient } = getGanColor(dayGan);
  const animalName = getJiAnimal(dayJi);
  const characterName = `${colorName} ${animalName}`; // "푸른 호랑이"

  const radarData = [
    { subject: '목(성장)', A: sajuResult.oheng?.목 || 20, fullMark: 100 },
    { subject: '화(열정)', A: sajuResult.oheng?.화 || 20, fullMark: 100 },
    { subject: '토(안정)', A: sajuResult.oheng?.토 || 20, fullMark: 100 },
    { subject: '금(결실)', A: sajuResult.oheng?.금 || 20, fullMark: 100 },
    { subject: '수(지혜)', A: sajuResult.oheng?.수 || 20, fullMark: 100 },
  ];

  // --- Data for Cards ---
  const cards = [
    { id: 'overall', icon: Sparkles, label: '총평', desc: '올해의 핵심 키워드', color: 'from-purple-500 to-indigo-600' },
    { id: 'money', icon: TrendingUp, label: '재물운', desc: '부의 흐름과 기회', color: 'from-emerald-500 to-teal-600' },
    { id: 'love', icon: Heart, label: '인연과 관계의 미학', color: 'from-rose-500 to-pink-600' },
    { id: 'career', icon: Briefcase, label: '직업운', desc: '성취와 명예의 길', color: 'from-blue-500 to-cyan-600' },
    { id: 'health', icon: Activity, label: '건강운', desc: '신체와 정신의 조화', color: 'from-orange-500 to-amber-600' },
  ];

  console.log('Rendering ResultPage', { sajuResult, mounted, activeTab });

  // Safety helper
  const safeJoin = (arr) => Array.isArray(arr) ? arr.join(', ') : arr;

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="min-h-screen bg-[#0f0f10] text-slate-100 pb-20 relative overflow-hidden font-sans">
        {/* 배경: 먹물 느낌의 텍스처와 은은한 금빛 조명 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(60,40,20,0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>

        {/* 상단 네비게이션: 심플하지만 권위있게 */}


        {/* 메인 컨텐츠 */}
        <main className="max-w-md mx-auto px-6 pt-8 space-y-10 relative z-10">

          {/* [Fixed] Top Navigation Bar */}
          <div className="flex justify-between items-center mb-12 px-2">
            <button
              onClick={() => navigate(-1)}
              className="text-stone-500 hover:text-amber-600 transition-colors p-2"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex flex-col items-center">
              <div className="border-t border-amber-800/30 w-12 mb-1"></div>
              <span className="text-amber-700/80 text-xl tracking-[0.3em] font-serif font-bold">天命錄</span>
              <div className="border-b border-amber-800/30 w-12 mt-1"></div>
            </div>

            <div className="w-10"></div> {/* Spacer for centering */}
          </div>

          {/* [Reverted & Polished] Main Title Section */}
          <div className="text-center space-y-4 mb-8">
            {/* Name: Matching Score Description Font */}
            <p className="text-stone-400 text-sm font-light leading-relaxed tracking-widest">
              {userInfo?.name || '사용자'}님의
            </p>

            {/* Title: Reverted to Korean, consistent style */}
            <h2 className="text-4xl font-bold text-[#e8dac0] drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] tracking-widest leading-relaxed" style={{ fontFamily: '"Gungsuh", "Batang", serif' }}>
              <span className="text-amber-500">운명 분석</span>
            </h2>

          </div>

          {/* 2. 종합 점수: 전통 현판 스타일 */}
          <section className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent rounded-lg blur-md" />
            <div className="bg-[#1a1a1c] border border-amber-800/30 rounded-lg p-8 text-center relative overflow-hidden shadow-2xl">
              {/* 현판 장식 - 심플하게 변경 */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-900/40" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-900/40" />

              <h3 className="text-amber-700/80 text-sm tracking-[0.5em] mb-6 font-serif border-b border-amber-900/20 pb-2 inline-block px-8">綜合總運</h3>

              <div className="flex justify-center items-end gap-2 mb-4 relative">
                <span className="text-7xl font-bold text-[#e8dac0] drop-shadow-md font-serif tracking-tighter">{sajuResult?.scores?.overall || 0}</span>
                <span className="text-xl text-amber-800/60 font-serif mb-4">점</span>
              </div>

              <p className="text-stone-400 text-sm font-light leading-relaxed break-keep px-2">
                오행의 조화가 {sajuResult?.scores?.overall >= 80 ? '매우 훌륭합니다' : sajuResult?.scores?.overall >= 60 ? '무난한 편입니다' : '조금 불안정합니다'}.<br />
                당신에게 필요한 것은 <span className="text-amber-600 font-bold">{sajuResult?.oheng_deficiency?.most_deficient || '균형'}</span>의 기운입니다.
              </p>
            </div>

            {/* 하단 점수 그리드 - 심플한 인장 스타일 */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { label: '재물', score: sajuResult?.scores?.wealth },
                { label: '애정', score: sajuResult?.scores?.love },
                { label: '성장', score: sajuResult?.scores?.career },
                { label: '건강', score: sajuResult?.scores?.health }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#1a1a1c] border border-amber-900/20 rounded p-3 flex flex-col items-center justify-center relative group">
                  <span className="text-xs text-stone-500 mb-1 font-serif">{item.label}</span>
                  <span className={`text-lg font-bold font-serif ${item.score >= 80 ? 'text-amber-600' : 'text-stone-300'}`}>{item.score}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 2-1. 사주팔자 8글자 테이블 (Heavenly Seal Grid - RTL Traditional) */}
          <section className="mt-8 px-1">
            <div className="bg-[#0f0f12] border border-amber-900/15 rounded-lg p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] pointer-events-none" />

              <div className="flex items-center justify-between mb-1 relative z-10">
                <h4 className="text-[10px] font-bold text-amber-600/30 tracking-[0.4em] uppercase" style={{ fontFamily: '"Gungsuh", serif' }}>
                  天機一覽
                </h4>
                <span className="text-[9px] text-amber-900/40 tracking-widest font-serif opacity-0">Hidden</span>
              </div>

              <div className="text-center mb-6 relative z-10">
                <h3 className="text-xl font-medium text-[#e8dac0] tracking-[0.2em] font-serif">八字 一覽</h3>
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent mx-auto mt-2"></div>
              </div>

              {/* Grid: 4 Pillars, 2 Rows each, Right-to-Left Ordering */}
              <div className="grid grid-cols-4 gap-2 mb-6 relative z-10 dir-rtl">
                {[
                  { label: '時', gan: sajuResult?.sajuData?.hour?.gan, ji: sajuResult?.sajuData?.hour?.ji, key: 'hour' },
                  { label: '本人', gan: sajuResult?.sajuData?.day?.gan, ji: sajuResult?.sajuData?.day?.ji, key: 'day', isSelf: true },
                  { label: '月', gan: sajuResult?.sajuData?.month?.gan, ji: sajuResult?.sajuData?.month?.ji, key: 'month' },
                  { label: '年', gan: sajuResult?.sajuData?.year?.gan, ji: sajuResult?.sajuData?.year?.ji, key: 'year' }
                ].map(({ label, gan, ji, isSelf }, idx) => {
                  const ganElem = getElementFromGan(gan);
                  const jiElem = getElementFromJi(ji);

                  return (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className={`text-[9px] text-center tracking-[0.3em] font-serif mb-1 
                                      ${isSelf ? 'text-amber-500/40 font-bold' : 'text-stone-700/30'}`}>
                        {label}
                      </div>

                      {/* 천간 (Gan) - Stem Row */}
                      <div className={`relative aspect-square flex items-center justify-center rounded-sm transition-all duration-700
                                      ${isSelf ? 'bg-[#1a1a20] border border-amber-600/40 ring-1 ring-amber-900/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]'
                          : 'bg-[#111113] border border-stone-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]'}`}>
                        {/* Elemental Aura */}
                        <div className={`absolute inset-0 blur-xl opacity-40 rounded-full z-0 ${isSelf ? 'animate-pulse-subtle' : ''}`}
                          style={{ background: `radial-gradient(circle, ${getElementAura(ganElem)} 0%, transparent 70%)` }} />

                        <div className={`relative z-10 text-[28px] font-serif leading-none
                                        ${isSelf ? 'text-stone-50 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] scale-110' : 'text-stone-300'}`}
                          style={{ color: isSelf ? '#fff' : getElementColor(ganElem) }}>
                          {ganHanjaMap[gan] || (gan === '?' ? '?' : gan)}
                        </div>
                      </div>

                      {/* 지지 (Ji) - Branch Row */}
                      <div className="relative aspect-square flex items-center justify-center rounded-sm bg-[#111113] border border-stone-800/40 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
                        {/* Elemental Aura */}
                        <div className="absolute inset-0 blur-xl opacity-30 rounded-full z-0"
                          style={{ background: `radial-gradient(circle, ${getElementAura(jiElem)} 0%, transparent 70%)` }} />

                        <div className="relative z-10 text-[26px] font-serif leading-none"
                          style={{ color: getElementColor(jiElem) }}>
                          {jiHanjaMap[ji] || (ji === '?' ? '?' : ji)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 오행 범례 (Legend) */}
              <div className="flex justify-center flex-wrap items-center gap-4 text-[9px] text-stone-600 font-serif tracking-widest opacity-60 hover:opacity-100 transition-opacity relative z-10">
                {[
                  { label: '木', element: '목' },
                  { label: '火', element: '화' },
                  { label: '土', element: '토' },
                  { label: '金', element: '금' },
                  { label: '水', element: '수' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 grayscale-[0.5] hover:grayscale-0 transition-all">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getElementColor(item.element) }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 개발자 모드 토글 (숨겨진 기능처럼 배치) */}
          <div className="fixed bottom-4 right-4 z-50 opacity-20 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowTechData(!showTechData)}
              className="text-xs font-bold text-slate-500 bg-black/50 p-2 rounded-full border border-slate-700"
            >
              🛠️
            </button>
          </div>

          {/* Tech Demo Inspector Panel is omitted for brevity, keeping existing functionality hidden */}
          {showTechData && sajuResult?.sajuData?.techData && (
            <div className="fixed inset-0 z-50 bg-black/95 overflow-y-auto p-4 text-left font-mono text-xs text-green-500">
              <button onClick={() => setShowTechData(false)} className="absolute top-4 right-4 text-white p-2 border">Close</button>
              <pre>{JSON.stringify(sajuResult.sajuData.techData, null, 2)}</pre>
            </div>
          )}

          {/* Section 1: Visual Dashboard (Radar) - 톤다운 및 한글화 */}
          <div className="px-6 mb-8 z-10 relative">
            <div className="bg-[#1a1a1c] border border-amber-900/20 rounded-lg p-6 shadow-lg relative overflow-hidden">
              <h3 className="text-xs font-bold text-stone-500 mb-4 flex items-center gap-2 tracking-widest justify-center">
                <span className="text-amber-700">五行調和</span> (오행 조화)
              </h3>

              <div className="h-48 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="rgba(120, 113, 108, 0.2)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 11, fontFamily: 'serif' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="My Saju" dataKey="A" stroke="#d97706" strokeWidth={1} fill="#d97706" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Section 2: Card Navigation (Horizontal Scroll) - 인장/패 스타일 */}
          <div className="mb-6 z-10 relative">
            <div className="px-6 mb-3 flex items-end justify-between border-b border-amber-900/20 pb-2 mx-6">
              <h3 className="text-lg font-bold text-[#e8dac0] flex items-center gap-2" style={{ fontFamily: '"Gungsuh", serif' }}>
                상세 운세
              </h3>
            </div>

            <div className="flex overflow-x-auto px-6 pb-8 gap-3 snap-x no-scrollbar mt-4">
              {cards.map((card) => {
                const isActive = activeTab === card.id;
                return (
                  <button
                    key={card.id}
                    onClick={() => setActiveTab(card.id)}
                    className={`
                    flex-shrink-0 w-28 h-36 rounded-sm p-3 flex flex-col justify-between transition-all duration-300 snap-center border
                    ${isActive
                        ? 'bg-[#2a2a2c] border-amber-700/50 shadow-lg shadow-amber-900/20 text-amber-500'
                        : 'bg-[#1a1a1c] border-amber-900/10 text-stone-500 hover:bg-[#202022]'
                      }
                  `}
                  >
                    <div className="text-right opacity-50">
                      <card.icon size={16} />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold mb-1 font-serif" style={{ writingMode: 'horizontal-tb' }}>{card.label}</div>
                    </div>
                    <div className="w-full h-0.5 bg-current opacity-20"></div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Detailed Content */}
          <div className="px-6 pb-24 z-10 relative min-h-[400px]">
            <div className="bg-[#1a1a1c] border border-amber-900/20 rounded-lg p-6 shadow-xl relative">
              {/* 종이 질감 오버레이 */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>

              {activeTab === 'overall' && (
                <>
                  <h4 className="text-amber-600 font-bold text-lg mb-4 flex items-center gap-2 font-serif border-b border-amber-900/10 pb-2">
                    총평 분석
                  </h4>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] mb-6 whitespace-pre-line text-justify">
                    {sajuResult.overallFortune || sajuResult.detailedData?.overall?.summary}
                  </p>
                  {/* Quick Stats: MBTI Style - 성향 분석 */}
                  <div className="space-y-4 pt-6 border-t border-amber-900/20">
                    <h5 className="text-sm font-bold text-stone-500 font-serif">성향 분석 (性向分析)</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-stone-400 font-serif">
                        <span>이성적 (理性的)</span>
                        <span>감성적 (感性的)</span>
                      </div>
                      <div className="h-2 w-full bg-[#151517] rounded-full overflow-hidden border border-amber-900/30">
                        <div className="h-full bg-amber-700/80 w-[60%]" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'money' && (
                <>
                  <h4 className="text-emerald-700 font-bold text-lg mb-4 flex items-center gap-2 font-serif border-b border-emerald-900/20 pb-2">
                    재물운 상세
                  </h4>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] mb-6 text-justify">
                    {sajuResult.wealthFortune || sajuResult.detailedData?.wealth?.description}
                  </p>
                  <div className="bg-[#151517] p-4 rounded border border-emerald-900/20">
                    <h5 className="text-emerald-600/80 text-sm font-bold mb-1 font-serif">💰 투자 포인트</h5>
                    <p className="text-xs text-stone-400 font-serif">{sajuResult.detailedData?.wealth?.investment || '안정적인 자산 운용이 필요한 시기입니다.'}</p>
                  </div>
                </>
              )}

              {activeTab === 'love' && (
                <>
                  <h4 className="text-rose-700 font-bold text-lg mb-4 flex items-center gap-2 font-serif border-b border-rose-900/20 pb-2">
                    애정운 상세
                  </h4>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] mb-6 text-justify">
                    {sajuResult.loveFortune || sajuResult.detailedData?.marriage?.description}
                  </p>
                  <div className="bg-[#151517] p-4 rounded border border-rose-900/20">
                    <h5 className="text-rose-600/80 text-sm font-bold mb-1 font-serif">❤️ 추천 파트너</h5>
                    <p className="text-xs text-stone-400 font-serif">{sajuResult.detailedData?.marriage?.partnerType || '자신과 비슷한 가치관을 가진 사람이 좋습니다.'}</p>
                  </div>
                </>
              )}

              {['career', 'health'].includes(activeTab) && (
                <>
                  <h4 className={`font-bold text-lg mb-4 flex items-center gap-2 font-serif border-b pb-2 ${activeTab === 'career' ? 'text-blue-700 border-blue-900/20' : 'text-amber-700 border-amber-900/20'}`}>
                    {activeTab === 'career' ? '직업운 상세' : '건강운 상세'}
                  </h4>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] text-justify">
                    {activeTab === 'career'
                      ? (sajuResult.careerFortune || sajuResult.detailedData?.business?.advice)
                      : (sajuResult.healthFortune || sajuResult.detailedData?.health?.description)
                    }
                  </p>
                </>
              )}
            </div>

            {/* Solution Cards (Action Items) - 심플한 명패 스타일 */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-stone-500 mb-4 flex items-center gap-2 tracking-wide justify-center">
                <span className="text-amber-800">開運法</span> (개운법)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a1c] p-4 rounded border border-amber-900/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-amber-900/5 rounded-bl-xl" />
                  <div className="text-[10px] text-stone-500 mb-1 font-serif">행운의 방향</div>
                  <div className="text-lg font-bold text-stone-300 font-serif">{sajuResult.detailedData?.direction?.good || '동쪽'}</div>
                </div>
                <div className="bg-[#1a1a1c] p-4 rounded border border-amber-900/20 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-amber-900/5 rounded-bl-xl" />
                  <div className="text-[10px] text-stone-500 mb-1 font-serif">행운의 색상</div>
                  <div className="text-lg font-bold text-stone-300 font-serif">{safeJoin(sajuResult.detailedData?.color?.good) || '적색'}</div>
                </div>
                <div className="col-span-2 bg-[#1a1a1c] p-4 rounded border border-amber-900/20 flex items-center justify-between px-6 relative overflow-hidden">
                  <div className="text-left z-10">
                    <div className="text-[10px] text-stone-500 mb-1 font-serif">행운의 아이템</div>
                    <div className="text-sm font-bold text-stone-300 font-serif">{safeJoin(sajuResult.detailedData?.blessings?.items) || '숫자 3, 8'}</div>
                  </div>
                  <Sparkles className="text-amber-700 opacity-30" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Button (PDF) - 전통 목판 스타일 */}
          <div className="fixed bottom-6 left-0 w-full flex justify-center z-50 pointer-events-none">
            <div className="w-full max-w-[480px] px-6 pointer-events-auto">
              <div className="flex gap-2">
                <button
                  onClick={handlePdfPreview}
                  className="flex-1 bg-[#2a2a2c] hover:bg-[#323235] text-stone-300 py-4 rounded font-bold shadow-lg border border-amber-900/30 flex items-center justify-center gap-2 transition-transform active:scale-95 font-serif"
                >
                  <Eye size={18} /> 미리보기
                </button>
                <button
                  onClick={handlePdfPayment}
                  className="flex-[2] bg-[#3f2e18] hover:bg-[#4a361e] text-amber-100 py-4 rounded font-bold shadow-lg border border-amber-700/50 flex items-center justify-center gap-2 transition-transform active:scale-95 font-serif relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  <Download size={18} />
                  <span>소장하기</span>
                  <span className="text-[10px] bg-amber-900/80 px-1.5 py-0.5 rounded text-amber-200/70 border border-amber-500/20 ml-1">Premium</span>
                </button>
                {/* [Tech Demo] Talisman Collection / Test Button */}
                <button
                  onClick={() => setShowTalismanSelector(true)}
                  className="w-14 bg-[#1a1a1c] hover:bg-[#252528] text-amber-500/70 hover:text-amber-400 rounded font-bold border border-amber-900/30 flex items-center justify-center transition-transform active:scale-95 shadow-lg group relative"
                  title="수호부적 도감 (테스트)"
                >
                  <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Talisman Selector Modal (Collection Mode) */}
          {showTalismanSelector && (
            <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-2 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#1a1a1c] w-full max-w-4xl rounded-xl border border-amber-900/40 shadow-2xl flex flex-col max-h-[95vh] relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="p-5 border-b border-amber-900/30 flex justify-between items-center bg-[#202022] relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📜</span>
                    <h3 className="font-bold text-[#e8dac0] font-serif text-xl tracking-wide">60갑자 수호신 도감</h3>
                  </div>
                  <button
                    onClick={() => setShowTalismanSelector(false)}
                    className="w-8 h-8 rounded-full bg-black/20 hover:bg-white/10 flex items-center justify-center text-stone-500 hover:text-[#e8dac0] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 relative z-10 custom-scrollbar">
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1 mt-2">
                    {Object.keys(talismanNames).map((key) => {
                      const gan = key[0];
                      const { bg } = getGanColor(gan) || { bg: 'from-slate-700 to-slate-800' };
                      const isSelected = testTalismanKey === key;

                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setTestTalismanKey(key);
                            setShowTalismanSelector(false);
                            const talismanSection = document.querySelector('.perspective-1000');
                            if (talismanSection) talismanSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`
                                relative p-1 rounded-md border transition-all duration-300 group overflow-hidden
                                ${isSelected
                              ? 'border-amber-400 bg-amber-900/40 shadow-[0_0_10px_rgba(251,191,36,0.2)] scale-105'
                              : 'border-white/5 bg-[#252528] hover:border-white/20 hover:bg-[#2a2a2d]'
                            }
                                `}
                          title={talismanNames[key].name}
                        >
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${bg}`} />

                          <div className="relative z-10 flex flex-col items-center">
                            <span className={`font-serif font-bold text-xs ${isSelected ? 'text-amber-200' : 'text-stone-300 group-hover:text-stone-100'}`}>
                              {key}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PDF Preview Modal */}
          {showPdfPreview && pdfPreviewUrl && (
            <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
              <div className="bg-[#1a1a1c] w-full max-w-lg rounded-lg overflow-hidden h-[80vh] flex flex-col border border-amber-900/30 shadow-2xl">
                <div className="p-4 border-b border-amber-900/30 flex justify-between items-center bg-[#252528]">
                  <h3 className="font-bold text-[#e8dac0] font-serif">미리보기</h3>
                  <button onClick={handleClosePdfPreview} className="text-stone-500 hover:text-[#e8dac0]"><X /></button>
                </div>
                <div className="flex-1 overflow-auto bg-[#101012] p-4 flex justify-center relative">
                  {/* 배경 질감 */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                  <Document file={pdfPreviewUrl} loading={<div className="text-amber-700 font-serif blink">문서를 불러오는 중...</div>}>
                    <Page pageNumber={1} width={300} />
                  </Document>
                </div>
                <div className="p-4 bg-[#1a1a1c] border-t border-amber-900/30">
                  <button onClick={handlePdfPayment} className="w-full bg-[#3f2e18] hover:bg-[#4a361e] text-amber-100 py-3 rounded font-bold font-serif border border-amber-700/50 flex items-center justify-center gap-2">
                    <span className="text-lg">🧧</span> 전체 결과 소장하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 2.5: Premium Talisman - 페이지 맨 아래 배치 */}
          {/* Talisman Card Section (Premium) */}
          <div className="mt-12 mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

            <div className="text-center mb-10 relative z-10">
              <h3 className="text-2xl font-bold text-[#e8dac0] mb-2 tracking-[0.2em]" style={{ fontFamily: '"Gungsuh", "Batang", serif' }}>
                수호 부적
              </h3>
              <p className="text-xs text-stone-500 font-serif">당신의 부족한 기운을 채워줄 수호신</p>
            </div>

            <div className="flex justify-center items-center gap-4 mb-8 relative">
              {/* Left Arrow (Ghost Navigation) */}
              {sajuResult.talisman?.reason && isTalismanFlipped && (
                <button
                  onClick={() => setTalismanViewMode('image')}
                  className={`flex-shrink-0 w-10 h-20 flex items-center justify-center transition-all duration-500 ${talismanViewMode === 'reason' ? 'opacity-30 hover:opacity-100 text-amber-600' : 'opacity-0 pointer-events-none'}`}
                >
                  <ChevronLeft size={32} />
                </button>
              )}

              <div className="perspective-1000">
                <TalismanCard
                  ref={talismanCardRef}
                  type={testTalismanKey || sajuResult.talisman?.name || "gapja"}
                  userName={userInfo?.name || '사용자'}
                  reason={sajuResult.talisman?.reason}
                  activeTab={talismanViewMode}
                  onFlip={(flipped) => setIsTalismanFlipped(flipped)}
                  isPurchased={isTalismanPurchased}
                  setIsPurchased={setIsTalismanPurchased}
                  // Use selected test talisman data if available, otherwise fallback to result or default
                  talismanData={
                    testTalismanKey
                      ? talismanNames[testTalismanKey]
                      : ((sajuResult.talisman?.name && talismanNames[sajuResult.talisman.name])
                        ? talismanNames[sajuResult.talisman.name]
                        : talismanNames['갑자'])
                  }
                />
              </div>

              {/* Right Arrow (Ghost Navigation) */}
              {sajuResult.talisman?.reason && isTalismanFlipped && (
                <button
                  onClick={() => setTalismanViewMode('reason')}
                  className={`flex-shrink-0 w-10 h-20 flex items-center justify-center transition-all duration-500 ${talismanViewMode === 'image' ? 'opacity-30 hover:opacity-100 text-amber-600' : 'opacity-0 pointer-events-none'}`}
                >
                  <ChevronRight size={32} />
                </button>
              )}
            </div>

            {/* Page Indicators */}
            {sajuResult.talisman?.reason && isTalismanFlipped && (
              <div className="flex justify-center gap-2 mb-10 -mt-4">
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${talismanViewMode === 'image' ? 'bg-amber-600 w-4' : 'bg-stone-700'}`} />
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${talismanViewMode === 'reason' ? 'bg-amber-600 w-4' : 'bg-stone-700'}`} />
              </div>
            )}

            {/* Premium Download/Purchase Button */}
            {isTalismanFlipped && (
              <div className="flex justify-center px-8 mb-8">
                <button
                  onClick={() => talismanCardRef.current?.handleDownload()}
                  className="w-full max-w-[320px] relative group overflow-hidden py-4 rounded-lg transition-all duration-500 active:scale-[0.98]"
                >
                  {/* Button Background: Deep Traditional Ink */}
                  <div className="absolute inset-0 bg-[#0d0d0f] border border-amber-900/30 group-hover:border-amber-600/50 transition-colors" />
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent opacity-50" />

                  {/* Subtle Texture Hook */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] pointer-events-none" />

                  {/* Button Content */}
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="w-8 h-px bg-amber-900/50 group-hover:w-12 transition-all duration-700" />
                    <Download size={18} className="text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-amber-500 font-serif font-bold tracking-[0.2em] text-sm">
                      {isTalismanPurchased ? '護符 貯藏 (저장하기)' : '名銘 貯藏 (이름 새겨 소장하기)'}
                    </span>
                    <div className="w-8 h-px bg-amber-900/50 group-hover:w-12 transition-all duration-700" />
                  </div>

                  {/* Glossy Overlay */}
                  <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] group-hover:left-[100%] transition-all duration-1000" />
                </button>
              </div>
            )}

          </div>

        </main>
      </div >
    </div >
  );
};
export default ResultPage;
