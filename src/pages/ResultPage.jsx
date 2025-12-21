/**
 * 결과 조회 페이지 (Result Page 2.0)
 * 사용자에게 강렬한 첫인상(Aggro)과 데이터 시각화, 구체적 솔루션을 제공하는 업그레이드 버전
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSajuResult, verifyUser, createPayment, verifyPayment, generatePDF, getPdfDownloadUrl, checkPdfPayment } from '../utils/api';
import { RefreshCw, Download, Lock, X, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Share2, Sparkles, TrendingUp, Heart, Briefcase, Activity, Zap, Compass, MapPin, Search } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, RadialBarChart, RadialBar } from 'recharts';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import TalismanCard from '../components/TalismanCard';
import { talismanNames } from '../data/talismanData';
import { getGanColor, getJiAnimal, ganHanjaMap, jiHanjaMap } from '../utils/sajuHelpers';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pdfjsOptions = {
  cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// --- Constants for UI ---

// 전통 오방색 피그먼트 맵 (Celestial Archive Consistency)
const elementColorMap = {
  목: '#059669', // Emerald (청색)
  화: '#e11d48', // Rose (적색)
  토: '#d97706', // Amber (황색)
  금: '#d6d3d1', // Stone (백색)
  수: '#94a3b8'  // Slate (흑색 - 차가운 먹색)
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

// --- Sub-components for Archive Style ---

const ChapterLockOverlay = ({ element }) => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
    <div className="relative mb-6">
      <div className="w-20 h-20 rounded-full bg-black/40 border border-amber-600/30 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(180,83,9,0.2)]">
        <Lock size={28} className="text-amber-500 shadow-glow" />
      </div>
      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-900 border border-amber-500/50 flex items-center justify-center shadow-lg">
        <span className="text-amber-200 text-xs font-serif font-bold">{element}</span>
      </div>
    </div>
    <h5 className="text-amber-500 font-serif font-bold text-lg mb-2 tracking-widest">天機 (천기) 봉인됨</h5>
    <p className="text-stone-400 text-[11px] font-serif leading-relaxed px-8 opacity-80">
      당신의 운명에 새겨진 이 기록은<br />
      현세의 인연을 맺은 후에야 그 빛을 드러냅니다.
    </p>
    <div className="mt-6 w-32 h-px bg-gradient-to-r from-transparent via-amber-900/50 to-transparent" />
  </div>
);

const ResultPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // 유틸리티 함수
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength <= 3) return phoneNumber;
    if (phoneNumberLength <= 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    }
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const isPhoneValid = (phone) => {
    const regex = /^010-\d{4}-\d{4}$/;
    return regex.test(phone);
  };

  const isBirthDateValid = (date) => {
    if (!date) return false;
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const [year, month, day] = date.split('-').map(Number);
    if (year < 1900 || year > todayYear || String(year).length !== 4) return false;
    if (year === todayYear) {
      if (month > todayMonth) return false;
      if (month === todayMonth && day > todayDay) return false;
    }
    return true;
  };

  const getBirthDateError = (date) => {
    if (!date) return null;
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const [year, month, day] = date.split('-').map(Number);
    if (String(year).length !== 4) return "연도는 4자리로 입력해 주세요.";
    if (year < 1900) return "1900년 이후의 날짜를 입력해 주세요.";
    if (year > todayYear || (year === todayYear && (month > todayMonth || (month === todayMonth && day > todayDay)))) {
      return "미래의 날짜는 입력할 수 없습니다.";
    }
    return null;
  };

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
  const [authFieldErrors, setAuthFieldErrors] = useState({ phone: null, birthDate: null });
  const [pdfPaymentStatus, setPdfPaymentStatus] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const [testTalismanKey, setTestTalismanKey] = useState(null);
  const [showTalismanSelector, setShowTalismanSelector] = useState(false);

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
  const handleAuthInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      setAuthData(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setAuthData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAuthInputBlur = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      if (value) {
        setAuthFieldErrors(prev => ({
          ...prev,
          phone: isPhoneValid(value) ? null : '올바른 연락처 형식이 아닙니다.'
        }));
      } else {
        setAuthFieldErrors(prev => ({ ...prev, phone: null }));
      }
    } else if (name === 'birthDate') {
      if (value) {
        setAuthFieldErrors(prev => ({
          ...prev,
          birthDate: getBirthDateError(value)
        }));
      } else {
        setAuthFieldErrors(prev => ({ ...prev, birthDate: null }));
      }
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    // 필드 존재 여부 체크
    if (!authData.phone || !authData.birthDate) {
      setAuthError('모든 정보를 입력해주세요.');
      return;
    }

    // 유효성 검사
    const phoneError = isPhoneValid(authData.phone) ? null : '올바른 연락처 형식이 아닙니다.';
    const birthDateError = getBirthDateError(authData.birthDate);

    if (phoneError || birthDateError) {
      setAuthFieldErrors({ phone: phoneError, birthDate: birthDateError });
      setAuthError('입력 정보를 확인해 주세요.');
      return;
    }

    // 제출 진행
    setAuthLoading(true);
    setAuthError(null);
    setAuthFieldErrors({ phone: null, birthDate: null });

    try {
      const response = await verifyUser(authData);
      if (response.user?.accessToken) {
        const res = await getSajuResult(response.user.accessToken);
        setSajuResult(res.result);
        setUserInfo(response.user);
        setShowAuth(false);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
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

  const handleBasicPayment = async () => {
    if (!userInfo?.id) return;
    setLoading(true);
    try {
      if (typeof window.IMP === 'undefined') throw new Error('결제 모듈 로드 실패');
      const amount = parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_BASIC || '100', 10);
      const { merchantUid } = await createPayment({ userId: userInfo.id, amount, productType: 'basic' });

      window.IMP.init(import.meta.env.VITE_PORTONE_IMP_KEY || 'imp12345678');
      window.IMP.request_pay({
        pg: 'html5_inicis', pay_method: 'card', merchant_uid: merchantUid,
        name: '2026 프리미엄 사주 상세 리포트', amount, buyer_name: userInfo.name, buyer_tel: userInfo.phone,
        m_redirect_url: `${window.location.origin}/payment/callback`
      }, async (rsp) => {
        if (rsp.success) await processBasicPaymentSuccess(rsp.imp_uid, merchantUid);
        else { setError(rsp.error_msg); setLoading(false); }
      });
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const processBasicPaymentSuccess = async (impUid, merchantUid) => {
    try {
      const verify = await verifyPayment({ imp_uid: impUid, merchant_uid: merchantUid });
      if (!verify.success) throw new Error(verify.error);

      // 결제 성공 시 AI 사주 계산 실행 (백엔드의 상세 계산 로직 호출)
      const sajuResponse = await calculateSaju({
        accessToken: token,
        birthDate: userInfo.birthDate,
        birthTime: userInfo.birthTime,
        calendarType: userInfo.calendarType,
        isLeap: userInfo.isLeap
      });

      setSajuResult(sajuResponse.result);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
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
          <h2 className={`text-2xl font-bold text-amber-500/90 mb-2 italic ${titleFont}`}>본인인증</h2>
          <p className="text-stone-500 text-xs font-light tracking-widest italic">本人確認</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] text-stone-600 tracking-widest ml-1 italic">전화번호</label>
            <input
              type="tel"
              name="phone"
              placeholder="010-0000-0000"
              className={`w-full bg-transparent border-b py-3 text-amber-500 outline-none transition-all tracking-widest italic ${authFieldErrors.phone
                ? 'border-red-900/50 focus:border-red-700/50'
                : 'border-amber-900/30 focus:border-amber-500/50'
                }`}
              value={authData.phone}
              onChange={handleAuthInputChange}
              onBlur={handleAuthInputBlur}
              autoComplete="tel"
            />
            {authFieldErrors.phone && (
              <p className="text-amber-900/80 text-[10px] tracking-tighter italic">
                {authFieldErrors.phone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-stone-600 tracking-widest ml-1 italic">생년월일</label>
            <input
              type="date"
              name="birthDate"
              className={`w-full bg-transparent border-b py-3 text-amber-500 outline-none transition-all italic [color-scheme:dark] ${authFieldErrors.birthDate
                ? 'border-red-900/50 focus:border-red-700/50'
                : 'border-amber-900/30 focus:border-amber-500/50'
                }`}
              value={authData.birthDate}
              onChange={handleAuthInputChange}
              onBlur={handleAuthInputBlur}
              autoComplete="bday"
            />
            {authFieldErrors.birthDate && (
              <p className="text-red-900/80 text-[10px] tracking-tighter italic">
                {authFieldErrors.birthDate}
              </p>
            )}
          </div>

          {authError && <p className="text-red-900/80 text-[10px] text-center tracking-tighter italic">{authError}</p>}

          <button
            type="submit"
            disabled={
              !authData.phone ||
              !authData.birthDate ||
              !isPhoneValid(authData.phone) ||
              !!getBirthDateError(authData.birthDate) ||
              authLoading
            }
            className={`w-full py-4 rounded-sm font-medium tracking-[0.3em] transition-all border italic ${!authData.phone ||
              !authData.birthDate ||
              !isPhoneValid(authData.phone) ||
              !!getBirthDateError(authData.birthDate) ||
              authLoading
              ? 'bg-stone-800 text-stone-600 cursor-not-allowed border-stone-700/30'
              : 'bg-amber-800/80 hover:bg-amber-700 text-amber-100 border-amber-600/30'
              }`}
          >
            {authLoading ? '천명록(天命錄) 열람 중...' : '천명록(天命錄) 열람하기'}
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

          {/* 오행 그래프 2.5 - 최적화된 스케일 및 가독성 버전 */}
          <div className="bg-stone-900/60 backdrop-blur-2xl p-6 pt-12 pb-14 rounded-sm border border-amber-900/30 animate-fade-in-up delay-200 opacity-0-init relative overflow-hidden group shadow-2xl" style={{ animationFillMode: "forwards" }}>
            <div className="flex flex-col items-center mb-4 relative z-10 text-center">
              <span className="text-amber-600/40 text-[9px] uppercase tracking-[0.4em] font-medium block mb-2">Five Elements Balance</span>
              <h3 className={`font-bold text-2xl text-stone-100 ${titleFont}`}>
                五行調和 <span className="text-stone-500 font-light text-base">(오행 조화)</span>
              </h3>
            </div>

            <div className="relative flex flex-col items-center py-6">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] bg-amber-800/5 blur-[100px] rounded-full group-hover:bg-amber-700/10 transition-colors duration-1000"></div>

              {/* SVG 레이더 차트 (Safe Scaling for Mobile) */}
              <svg width="310" height="310" viewBox="0 0 120 120" className="overflow-visible relative z-10">
                <defs>
                  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#78350f" stopOpacity="0.7" />
                  </linearGradient>
                  {/* 심해 우주 네뷸라 그라데이션 */}
                  <radialGradient id="nebula-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(217, 119, 6, 0.15)" />
                    <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                  </radialGradient>
                </defs>
                {/* 가이드 라인 시스템 (Reverted to Classic Style from Photo) */}
                {[15, 30].map((r, i) => (
                  <circle key={i} cx="60" cy="60" r={r} fill="none" stroke="rgba(217, 119, 6, 0.08)" strokeWidth="0.4" />
                ))}

                {/* 메인 경계선 (Outer Boundary at 45) */}
                <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(217, 119, 6, 0.15)" strokeWidth="0.8" />

                {/* 5행 메인 축 (Extending to 45) */}
                {[0, 72, 144, 216, 288].map((angle, i) => {
                  const rad = (angle - 90) * (Math.PI / 180);
                  return (
                    <line
                      key={i} x1="60" y1="60"
                      x2={60 + 45 * Math.cos(rad)}
                      y2={60 + 45 * Math.sin(rad)}
                      stroke="rgba(217, 119, 6, 0.12)"
                      strokeWidth="0.5"
                    />
                  );
                })}

                {(() => {
                  const elements = [
                    { key: "목", label: "木", meaning: "성장", angle: 0 },
                    { key: "화", label: "火", meaning: "열정", angle: 72 },
                    { key: "토", label: "土", meaning: "안정", angle: 144 },
                    { key: "금", label: "金", meaning: "결실", angle: 216 },
                    { key: "수", label: "水", meaning: "지혜", angle: 288 }
                  ];

                  // --- Largest Remainder Method (합계 100% 보정 로직) ---
                  const rawData = elements.map(el => ({
                    key: el.key,
                    val: sajuResult.oheng?.[el.key] || 0
                  }));

                  let floorSum = 0;
                  const processed = rawData.map(d => {
                    const integer = Math.floor(d.val);
                    const remainder = d.val - integer;
                    floorSum += integer;
                    return { ...d, integer, remainder };
                  });

                  let diff = 100 - floorSum;

                  const finalOheng = {};
                  [...processed]
                    .sort((a, b) => b.remainder - a.remainder)
                    .forEach((d, idx) => {
                      finalOheng[d.key] = d.integer + (idx < diff ? 1 : 0);
                    });
                  // ---------------------------------------------------

                  const finalVals = elements.map(el => finalOheng[el.key]);
                  const maxFinalVal = Math.max(...finalVals);

                  // --- 어댑티브 스카이 스케일링 (Adaptive Sky Scaling) ---
                  // 사용자의 기세에 맞춰 우주의 크기를 유연하게 조절합니다.
                  let standardMax = 50;
                  if (maxFinalVal >= 45 && maxFinalVal <= 60) {
                    standardMax = 60; // 강력한 주도권 사주를 위한 여백 확보
                  } else if (maxFinalVal > 60) {
                    standardMax = maxFinalVal + 15; // 극단적 에너지를 우아하게 담아내는 확장
                  }

                  const scaleFactor = 45 / standardMax;
                  // ---------------------------------------------------

                  const points = elements.map(el => {
                    const r = finalOheng[el.key] * scaleFactor;
                    const rad = (el.angle - 90) * (Math.PI / 180);
                    return `${60 + r * Math.cos(rad)},${60 + r * Math.sin(rad)}`;
                  }).join(" ");

                  return (
                    <g>
                      <polygon points={points} fill="url(#poly-grad)" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" filter="url(#glow)" className="animate-pulse-subtle" />
                      {elements.map((el, i) => {
                        const val = finalOheng[el.key];
                        const r = val * scaleFactor;
                        const rad = (el.angle - 90) * (Math.PI / 180);
                        const x = 60 + r * Math.cos(rad);
                        const y = 60 + r * Math.sin(rad);
                        const tx = 60 + 56 * Math.cos(rad);
                        const ty = 60 + 56 * Math.sin(rad);

                        const isStrongest = val === maxFinalVal && val > 0;

                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="1.4" fill="#fff" className="shadow-2xl" />
                            <text
                              x={tx} y={ty}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={elementColorMap[el.key] || "#d6d3d1"}
                              className={`text-[6.8px] font-bold ${titleFont} tracking-widest ${isStrongest ? 'animate-highest-pulse' : ''}`}
                              style={{
                                color: elementColorMap[el.key],
                                filter: isStrongest ? undefined : 'drop-shadow(0 0 2px rgba(255,255,255,0.1))'
                              }}
                            >
                              {el.label}({el.meaning})
                            </text>
                            <text
                              x={tx} y={ty + 8}
                              textAnchor="middle"
                              className={`text-[5.5px] font-mono font-bold ${isStrongest ? 'animate-highest-pulse' : ''}`}
                              fill="#a8a29e"
                              style={{ color: '#a8a29e' }}
                            >
                              {val}%
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

              </svg>
            </div>
          </div>
          {/* Section 2: Chapter Navigation Indicator (Visual Only) */}
          <div className="mb-6 z-10 relative">
            <div className="px-6 mb-3 flex items-end justify-between border-b border-amber-900/20 pb-2 mx-6">
              <h3 className="text-lg font-bold text-[#e8dac0] flex items-center gap-2" style={{ fontFamily: '"Gungsuh", serif' }}>
                천상의 기록 (天機錄)
              </h3>
              <span className="text-[9px] text-amber-700/60 uppercase tracking-[0.2em] mb-1 font-serif font-bold">5 Chapters of Fate</span>
            </div>
          </div>

          {/* Section 3: Detailed Content Chapters */}
          <div className="px-6 pb-0 z-10 relative space-y-12">

            {/* Chapter 1: 명(命) - 타고난 근원과 기질 */}
            <div className="relative scroll-reveal">
              <div className="flex flex-col items-center mb-6">
                <span className="text-emerald-600/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 1: Life</span>
                <h4 className="text-emerald-700 font-bold text-xl flex items-center gap-2 font-serif border-b border-emerald-900/10 pb-2">
                  제 1장: 명(命) <span className="text-stone-500 font-light text-sm">- 근원과 기질</span>
                </h4>
              </div>
              <div className="bg-[#1a1a1c] border border-emerald-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                <div className={`${!sajuResult.isPaid ? 'blur-[10px] select-none pointer-events-none opacity-40' : ''}`}>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                    {sajuResult.overallFortune || sajuResult.detailedData?.overall?.summary || "기록을 해제하면 당신의 타고난 기질과 운명의 뿌리가 담긴 분석이 펼쳐집니다."}
                  </p>
                </div>
                {!sajuResult.isPaid && <ChapterLockOverlay element="木" />}
              </div>
            </div>

            {/* Chapter 2: 업(業) - 부와 사회적 위엄 */}
            <div className="relative scroll-reveal">
              <div className="flex flex-col items-center mb-6">
                <span className="text-amber-600/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 2: Karma</span>
                <h4 className="text-amber-700 font-bold text-xl flex items-center gap-2 font-serif border-b border-amber-900/10 pb-2">
                  제 2장: 업(業) <span className="text-stone-500 font-light text-sm">- 부와 사회적 위엄</span>
                </h4>
              </div>
              <div className="bg-[#1a1a1c] border border-amber-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                <div className={`${!sajuResult.isPaid ? 'blur-[10px] select-none pointer-events-none opacity-40' : ''}`}>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                    {sajuResult.wealthFortune || sajuResult.detailedData?.wealth?.description || "현세에서 당신이 거머쥘 재물의 크기와 사회적 지위의 한계를 분석합니다."}
                  </p>
                </div>
                {!sajuResult.isPaid && <ChapterLockOverlay element="土" />}
              </div>
            </div>

            {/* Chapter 3: 연(緣) - 마음의 거울과 인연 */}
            <div className="relative scroll-reveal">
              <div className="flex flex-col items-center mb-6">
                <span className="text-rose-600/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 3: Connection</span>
                <h4 className="text-rose-700 font-bold text-xl flex items-center gap-2 font-serif border-b border-rose-900/10 pb-2">
                  제 3장: 연(緣) <span className="text-stone-500 font-light text-sm">- 마음의 거울과 인연</span>
                </h4>
              </div>
              <div className="bg-[#1a1a1c] border border-rose-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                <div className={`${!sajuResult.isPaid ? 'blur-[10px] select-none pointer-events-none opacity-40' : ''}`}>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                    {sajuResult.loveFortune || sajuResult.detailedData?.marriage?.description || "나를 완성해 줄 타자와의 연결 고리, 평생의 인연에 대한 기록입니다."}
                  </p>
                </div>
                {!sajuResult.isPaid && <ChapterLockOverlay element="火" />}
              </div>
            </div>

            {/* Chapter 4: 운(運) - 다가올 시간의 흐름 */}
            <div className="relative scroll-reveal">
              <div className="flex flex-col items-center mb-6">
                <span className="text-stone-400 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 4: Fortune</span>
                <h4 className="text-stone-100 font-bold text-xl flex items-center gap-2 font-serif border-b border-stone-500/10 pb-2">
                  제 4장: 운(運) <span className="text-stone-500 font-light text-sm">- 다가올 시간의 흐름</span>
                </h4>
              </div>
              <div className="bg-[#1a1a1c] border border-stone-500/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                <div className={`${!sajuResult.isPaid ? 'blur-[10px] select-none pointer-events-none opacity-40' : ''}`}>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                    {sajuResult.careerFortune || sajuResult.detailedData?.business?.advice || "현재 당신이 지나고 있는 인생의 계절과 다가올 거대한 흐름을 관조합니다."}
                  </p>
                </div>
                {!sajuResult.isPaid && <ChapterLockOverlay element="金" />}
              </div>
            </div>

            {/* Chapter 5: 비기(秘記) - 신의 한 수와 비책 */}
            <div className="relative scroll-reveal">
              <div className="flex flex-col items-center mb-6">
                <span className="text-slate-400 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 5: Secret</span>
                <h4 className="text-slate-300 font-bold text-xl flex items-center gap-2 font-serif border-b border-slate-500/10 pb-2">
                  제 5장: 비기(秘記) <span className="text-stone-500 font-light text-sm">- 신의 한 수와 비책</span>
                </h4>
              </div>
              <div className="bg-[#1a1a1c] border border-slate-500/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                <div className={`${!sajuResult.isPaid ? 'blur-[10px] select-none pointer-events-none opacity-40' : ''}`}>
                  <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                    {(sajuResult.detailedData?.blessings?.advice || sajuResult.advice) || "부족한 기운을 채우고 과한 기운을 다스리는 개운법과, 당신의 운명을 바꿀 결정적인 조언이 기록되어 있습니다."}
                  </p>
                </div>
                {!sajuResult.isPaid && <ChapterLockOverlay element="水" />}
              </div>
            </div>

            {/* Celestial Bridge - 섹션 간의 영적 연결 */}
            <div className="flex flex-col items-center pt-8 pb-12 opacity-60">
              {sajuResult.isPaid && (
                <p className="mb-12 text-amber-600/80 text-lg font-serif italic text-center animate-fade-in tracking-[0.2em] leading-relaxed">
                  모든 기록의 끝에서,<br />
                  당신을 수호할 단 하나의 인연을 <br />마주하십시오
                </p>
              )}
              <div className="w-px h-16 bg-gradient-to-b from-amber-600/60 to-transparent"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-600/40 my-2 shadow-[0_0_8px_rgba(217,119,6,0.5)]"></div>
            </div>
          </div>




          {/* Talisman Selector Modal (Tech Demo / Test) */}
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
                  <div className="grid grid-flow-col grid-rows-5 gap-1 mt-2 overflow-x-auto custom-scrollbar pb-2">
                    {['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'].flatMap(animal =>
                      Object.keys(talismanNames).filter(k => k.endsWith(animal))
                    ).map((key) => {
                      const gan = key[0];
                      const { color, bg } = getGanColor(gan) || { color: 'text-stone-300', bg: 'from-slate-700 to-slate-800' };
                      const isSelected = testTalismanKey === key;

                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setTestTalismanKey(key);
                            setShowTalismanSelector(false);
                            const talismanSection = document.querySelector('.perspective-1000');
                            if (talismanSection) {
                              talismanSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className={`
                                relative p-1 rounded-md border transition-all duration-300 group overflow-hidden min-w-[45px]
                                ${isSelected
                              ? 'border-amber-400 bg-amber-900/40 shadow-[0_0_10px_rgba(251,191,36,0.2)] scale-105'
                              : 'border-white/5 bg-[#252528] hover:border-white/20 hover:bg-[#2a2a2d]'
                            }
                                `}
                          title={talismanNames[key].name}
                        >
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${bg}`} />

                          <div className="relative z-10 flex flex-col items-center">
                            <span className={`font-serif font-bold text-xs ${isSelected ? 'text-amber-200' : `${color} opacity-70 group-hover:opacity-100`}`}>
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
        </main>

        {/* Section 4: Premium Talisman - Celestial Altar Style */}
        <div className="relative mt-12 pb-24 overflow-hidden">
          {/* Full-width Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />

          <div className="max-w-md mx-auto px-6 relative z-10">
            <div className="text-center mb-16 animate-fade-in-up">
              <span className="text-amber-700/40 text-[9px] tracking-[0.8em] font-serif uppercase mb-4 block">Eternal Guardian</span>
              <h3 className="text-4xl font-bold text-[#e8dac0] mb-6 tracking-[0.5em] drop-shadow-[0_0_15px_rgba(180,83,9,0.3)]" style={{ fontFamily: '"Gungsuh", "Batang", serif' }}>
                守護神靈
              </h3>
              <div className="flex items-center justify-center gap-4 opacity-50">
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-amber-900/50 to-transparent" />
                <span className="text-[10px] text-stone-500 font-serif tracking-[0.2em] whitespace-nowrap">
                  수호신령 : 당신을 지키는 단 하나의 인연
                </span>
                <div className="w-8 h-px bg-gradient-to-l from-transparent via-amber-900/50 to-transparent" />
              </div>
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

              <div className="perspective-1000 relative">
                <div className={`${!sajuResult.isPaid ? 'blur-[12px] opacity-40 grayscale pointer-events-none' : ''}`}>
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

                {!sajuResult.isPaid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <div className="p-8 rounded-full border-4 border-amber-600/30 text-amber-600/40 font-bold text-3xl tracking-[0.5em] font-serif rotate-12 bg-black/20 backdrop-blur-[2px]">
                      未結 (미결)
                    </div>
                    <p className="text-amber-500/60 mt-6 font-serif text-sm tracking-widest animate-pulse">
                      수호신령의 인연을 맺어주세요
                    </p>
                  </div>
                )}
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
        </div>
        {/* Floating Action Button (PDF) - 전통 목판 스타일 */}
        <div className="fixed bottom-6 left-0 w-full flex justify-center z-50 pointer-events-none">
          <div className="w-full max-w-[480px] px-6 pointer-events-auto">
            {sajuResult.isPaid ? (
              <div className="flex gap-2">
                <button
                  onClick={handlePdfPreview}
                  className="flex-1 bg-[#2a2a2c] hover:bg-[#323235] text-stone-300 py-4 rounded font-bold shadow-lg border border-amber-900/30 flex items-center justify-center gap-2 transition-transform active:scale-95 font-serif"
                >
                  <Eye size={18} /> 기록 미리보기
                </button>
                <button
                  onClick={handlePdfPayment}
                  className="flex-[2] bg-[#3f2e18] hover:bg-[#4a361e] text-amber-100 py-4 rounded font-bold shadow-lg border border-amber-700/50 flex items-center justify-center gap-2 transition-transform active:scale-95 font-serif relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  <Download size={18} />
                  <span>영구 소장하기</span>
                  <span className="text-[10px] bg-amber-900/80 px-1.5 py-0.5 rounded text-amber-200/70 border border-amber-500/20 ml-1">Archive</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleBasicPayment}
                className="group relative w-full overflow-hidden rounded py-5 shadow-2xl transition-all active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900/90 via-amber-800 to-amber-900/90" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] opacity-20" />
                <div className="relative flex items-center justify-center gap-4 text-amber-100">
                  <div className="w-8 h-[1px] bg-amber-500/30 group-hover:w-12 transition-all duration-700" />
                  <span className="font-serif text-lg font-bold tracking-[0.3em]">천기(天機) 열람하기</span>
                  <div className="w-8 h-[1px] bg-amber-500/30 group-hover:w-12 transition-all duration-700" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
