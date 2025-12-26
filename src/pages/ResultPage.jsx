/**
 * 결과 조회 페이지 (Result Page 2.0)
 * 사용자에게 강렬한 첫인상(Aggro)과 데이터 시각화, 구체적 솔루션을 제공하는 업그레이드 버전
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSajuResult, verifyUser, createPayment, verifyPayment, checkPdfPayment, generatePDF, getPdfDownloadUrl, checkAiStatus } from '../utils/api';
import { RefreshCw, Download, Lock, X, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Share2, Sparkles, TrendingUp, Heart, Briefcase, Activity, Zap, Compass, MapPin, Search, Scroll } from 'lucide-react';
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

// 일간(日干)별 성격 키워드 맵
const dayMasterDescriptions = {
  '갑': { hanja: '甲', desc: '곧게 뻗어 나가는 거목(巨木)' },
  '을': { hanja: '乙', desc: '바람에 흔들려도 꺾이지 않는 풀' },
  '병': { hanja: '丙', desc: '만물을 비추는 뜨거운 태양' },
  '정': { hanja: '丁', desc: '어둠 속에서도 길을 밝히는 촛불' },
  '무': { hanja: '戊', desc: '묵직하고 흔들림 없는 큰 산' },
  '기': { hanja: '己', desc: '만물을 품어 기르는 대지' },
  '경': { hanja: '庚', desc: '단단하고 결단력 있는 강철' },
  '신': { hanja: '辛', desc: '깎일수록 빛나는 보석' },
  '임': { hanja: '壬', desc: '깊고 넓게 흐르는 큰 바다' },
  '계': { hanja: '癸', desc: '은밀히 스며들어 적시는 빗물' }
};

// 오행 해석용 데이터 맵
const ohengLabels = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

const 강할때특성 = {
  목: '성장과 도전을 추구하며 창의적입니다. 다만 때로는 산만하거나 고집이 셀 수 있습니다.',
  화: '열정적이고 표현력이 뛰어납니다. 다만 급하거나 감정 기복이 클 수 있습니다.',
  토: '안정적이고 신뢰감을 줍니다. 다만 변화에 둔하거나 완고해 보일 수 있습니다.',
  금: '결단력이 있고 목표 지향적입니다. 다만 융통성이 부족하거나 냉정해 보일 수 있습니다.',
  수: '지혜롭고 유연합니다. 다만 우유부단하거나 감정을 숨기기 쉽습니다.'
};

const 약할때특성 = {
  목: '새로운 시작에서 막힘을 느낄 수 있으나, 운에서 木이 찾아올 때 큰 변화의 기회가 됩니다.',
  화: '추진력이 조심스러울 수 있으나, 운에서 火가 찾아올 때 열정이 폭발합니다.',
  토: '중심을 잡기 흔들릴 수 있으나, 운에서 土가 찾아올 때 안정의 기반이 마련됩니다.',
  금: '결단에 주저할 수 있으나, 운에서 金이 찾아올 때 큰 결실을 맺습니다.',
  수: '깊은 사고에서 답답함을 느낄 수 있으나, 운에서 水가 찾아올 때 지혜가 빛납니다.'
};

// 상생/상극 관계
const 상극관계 = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
const 상생관계 = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };

// 상생/상극 관계 텍스트 생성
const generateRelationText = (strongest, weakest) => {
  if (상극관계[strongest] === weakest) {
    return `${ohengLabels[strongest]}과 ${ohengLabels[weakest]}는 상극(相剋), 즉 조율 관계입니다. ${ohengLabels[strongest]}이 강하면 ${ohengLabels[weakest]}의 발현이 줄어들 수 있습니다.`;
  } else if (상극관계[weakest] === strongest) {
    return `${ohengLabels[weakest]}는 본래 ${ohengLabels[strongest]}을 제어하는 역할이지만, 현재 힘이 미약하여 ${ohengLabels[strongest]}이 자유롭게 발현됩니다.`;
  } else if (상생관계[strongest] === weakest) {
    return `${ohengLabels[strongest]}은 ${ohengLabels[weakest]}를 낳는 상생(相生) 관계입니다. 다만 ${ohengLabels[weakest]}가 여려 에너지 전달이 원활하지 않을 수 있습니다.`;
  } else if (상생관계[weakest] === strongest) {
    return `${ohengLabels[weakest]}가 ${ohengLabels[strongest]}의 근원이 되는 관계입니다. 뿌리가 여리면 결실도 쉽게 흔들릴 수 있습니다.`;
  }
  return `${ohengLabels[strongest]}과 ${ohengLabels[weakest]}는 직접적 상생/상극 관계가 아니어서 독립적으로 작용합니다.`;
};

// 계절 정보 가져오기
const getSeasonInfo = (monthJi) => {
  if (!monthJi) return null;
  const seasonMap = {
    '寅': { season: '초봄', element: '목' },
    '卯': { season: '한봄', element: '목' },
    '辰': { season: '늦봄', element: '토' },
    '巳': { season: '초여름', element: '화' },
    '午': { season: '한여름', element: '화' },
    '未': { season: '늦여름', element: '토' },
    '申': { season: '초가을', element: '금' },
    '酉': { season: '한가을', element: '금' },
    '戌': { season: '늦가을', element: '토' },
    '亥': { season: '초겨울', element: '수' },
    '子': { season: '한겨울', element: '수' },
    '丑': { season: '늦겨울', element: '토' }
  };
  return seasonMap[monthJi] || null;
};

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
  const location = useLocation();

  // [FIX] SajuApp에서 전달받은 데이터 (중복 fetch 방지)
  const prefetchedResult = location.state?.prefetchedResult;
  const prefetchedUser = location.state?.prefetchedUser;

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
  const [showYongshenReason, setShowYongshenReason] = useState(false); // [NEW] 용신 이유 패널 표시 여부

  const [showTechData, setShowTechData] = useState(false);
  const entranceRef = useRef(null);
  const chapter3Ref = useRef(null);
  const hasAutoScrolled = useRef(false);

  // [Digital Ritual] AI Loading Messages
  const LOADER_MESSAGES = [
    "천상의 문을 열고 사주 데이터를 해독합니다...",
    "음양오행의 균형과 기의 흐름을 계산 중입니다...",
    "과거와 현재의 대운을 대조하여 미래를 읽습니다...",
    "하늘의 뜻을 문자로 옮기고 있습니다...",
    "당신을 지켜줄 수호신(용신)을 찾고 있습니다..."
  ];

  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    // 멘트 교체 타이머 (approx. 3.5s interval)
    if (!loading && !sajuResult?.detailedData) return; // 로딩 중이 아니면 중단

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADER_MESSAGES.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [loading, sajuResult]);

  // [NEW] 결제 후 진입 시 제 3서로 강제 이동 로직
  useEffect(() => {
    if (sajuResult && location.state?.isNewPayment && !hasAutoScrolled.current && chapter3Ref.current) {
      const scrollTimer = setTimeout(() => {
        chapter3Ref.current.scrollIntoView({ behavior: 'auto' });
        hasAutoScrolled.current = true;
        // 브라우저 history에서 state 제거하여 새로고침 시 재작동 방지
        window.history.replaceState({}, document.title);
      }, 400); // 렌더링 및 애니메이션 대기용 딜레이
      return () => clearTimeout(scrollTimer);
    }
  }, [sajuResult, location.state]);

  useEffect(() => {
    // reveal-item 애니메이션 감시자
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-item-active');
          }
        });
      },
      { threshold: 0.05 }
    );

    const items = document.querySelectorAll('.reveal-item');
    items.forEach((item) => revealObserver.observe(item));

    return () => {
      revealObserver.disconnect();
    };
  }, [loading, sajuResult]); // 인쇄 데이터나 로딩 상태가 바뀌면 다시 스캔

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
  const [hasTalismanBeenRevealed, setHasTalismanBeenRevealed] = useState(false); // [NEW] 처음 뒤집었는지 여부
  const [isTalismanPurchased, setIsTalismanPurchased] = useState(false);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [showOhengInfo, setShowOhengInfo] = useState(false);
  const [ohengTab, setOhengTab] = useState('sangseong'); // 'sangseong' or 'sanggeuk'

  // 애니메이션 상태
  const [mounted, setMounted] = useState(false);
  const [scoreAnimated, setScoreAnimated] = useState(0);
  const talismanCardRef = useRef(null);

  // AI 해석 상태 관리
  const [aiStatus, setAiStatus] = useState({
    isProcessing: false,  // AI 처리 중 여부
    isCompleted: false,   // AI 완료 여부
    progress: 0,          // 진행률 (0-100)
    elapsedTime: 0        // 경과 시간 (초)
  });
  const pollingIntervalRef = useRef(null);
  const elapsedTimeIntervalRef = useRef(null);

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
    sajuData: {
      year: { gan: '갑', ji: '진' },
      month: { gan: '정', ji: '묘' },
      day: { gan: '갑', ji: '인' },
      time: { gan: '병', ji: '자' }
    },
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
        setUserInfo({
          id: 999, // 테스트용 ID
          name: '테스트 유저',
          birthDate: '1990-01-01',
          birthTime: '12:00',
          phone: '010-0000-0000',
          calendarType: 'solar'
        });
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
        return;
      }

      // [FIX] SajuApp에서 이미 데이터를 가져왔다면 중복 fetch 스킵
      if (prefetchedResult) {
        console.log('✅ Prefetched data found, skipping redundant fetch');
        setSajuResult(prefetchedResult);
        if (prefetchedUser) {
          setUserInfo(prefetchedUser);
          if (prefetchedUser.id) checkPdfPaymentStatus(prefetchedUser.id);
        }
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
        return;
      }

      try {
        const response = await getSajuResult(token);

        // [POLLING LOGIC] AI 데이터가 없으면 폴링 (3초 간격)
        // 조건: AI 데이터 미완료 AND 유료 사용자(isPaid=true)
        const isAiComplete = response.result?.detailedData?.personality;
        const isPaidUser = response.result?.isPaid;

        if (!isAiComplete && isPaidUser) {
          console.log('⏳ AI 분석 진행 중... 3초 후 재요청');
          // 아직 로딩 상태 유지 (또는 부분 데이터 보여주기)
          if (!sajuResult) setSajuResult(response.result); // 일단 기본 오행정보라도 보여줌

          setTimeout(fetchResult, 3000); // 3초 후 재귀 호출
          return;
        }

        console.log('✅ AI 분석 완료 확인!');
        setSajuResult(response.result);
        setUserInfo(response.user || null);
        if (response.user?.id) checkPdfPaymentStatus(response.user.id);
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
      } catch (err) {
        if (err.status === 404) setShowAuth(true);
        else setError(err.message || '결과 로드 실패');
        setLoading(false); // 에러 시에는 로딩 해제 (무한루프 방지)
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
      // 휴대폰 번호 하이픈 제거 후 전송 (DB 저장 형식과 일치)
      const sanitizedAuthData = {
        ...authData,
        phone: authData.phone.replace(/[^\d]/g, '')
      };

      const response = await verifyUser(sanitizedAuthData);
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
    if (!token) return;
    setPdfLoading(true);
    try {
      if (typeof window.IMP === 'undefined') throw new Error('결제 모듈 로드 실패');
      const amount = parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_PDF || '100', 10);
      const { merchantUid } = await createPayment({ accessToken: token, amount, productType: 'pdf' });

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
    console.log('💳 결제 시작 - token:', token);
    if (!token) {
      console.error('❌ token이 없습니다');
      return;
    }
    setLoading(true);
    try {
      if (typeof window.IMP === 'undefined') throw new Error('결제 모듈 로드 실패');
      const amount = parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_BASIC || '100', 10);
      console.log('💰 결제 요청 생성 - accessToken:', token, 'amount:', amount);
      const { merchantUid } = await createPayment({ accessToken: token, amount, productType: 'basic' });
      console.log('✅ merchant_uid 생성 완료:', merchantUid);

      window.IMP.init(import.meta.env.VITE_PORTONE_IMP_KEY || 'imp12345678');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const paymentData = {
        pg: 'html5_inicis',
        pay_method: 'card',
        merchant_uid: merchantUid,
        name: '천명록: 천기비록 (天機祕錄)',
        amount,
        buyer_name: userInfo.name,
        buyer_tel: userInfo.phone,
      };

      if (isMobile) {
        paymentData.m_redirect_url = `${window.location.origin}/payment/callback`;
      }

      window.IMP.request_pay(paymentData, async (rsp) => {
        if (rsp.success) await processBasicPaymentSuccess(rsp.imp_uid, merchantUid);
        else { setError(rsp.error_msg); setLoading(false); }
      });
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const processBasicPaymentSuccess = async (impUid, merchantUid) => {
    try {
      const verify = await verifyPayment({ imp_uid: impUid, merchant_uid: merchantUid });
      if (!verify.success) throw new Error(verify.error);

      // 결제 검증 완료 → AI 분석 모드로 전환 (로딩 유지)
      // setLoading(false); // [변경] 즉시 해제하지 않음 -> AI 완료 시 해제
      setAiStatus(prev => ({ ...prev, isProcessing: true }));

      // AI 계산을 백그라운드에서 시작 (await 없이 비동기 호출)
      calculateSaju({
        accessToken: token,
        birthDate: userInfo.birthDate,
        birthTime: userInfo.birthTime,
        calendarType: userInfo.calendarType,
        isLeap: userInfo.isLeap
      }).catch(err => {
        console.error('AI 계산 시작 실패:', err);
        setError('AI 해석 생성을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
        setLoading(false); // 에러 시에는 로딩 해제
      });

      // 폴링 시작 (AI 완료 상태 확인)
      startPollingForAiCompletion();

    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      const pdf = await generatePDF({ userId: userInfo.id, resultId: sajuResult.id });
      if (pdf.success) window.open(getPdfDownloadUrl(token), '_blank');
    } catch (e) { setPdfError(e.message); } finally { setPdfLoading(false); }
  };

  // AI 완료 상태 폴링 시작
  const startPollingForAiCompletion = () => {
    // AI 처리 시작 상태로 변경
    setAiStatus({
      isProcessing: true,
      isCompleted: false,
      progress: 0,
      elapsedTime: 0
    });

    // 경과 시간 카운터 시작 (1초마다)
    elapsedTimeIntervalRef.current = setInterval(() => {
      setAiStatus(prev => ({
        ...prev,
        elapsedTime: prev.elapsedTime + 1,
        // 경과 시간에 따라 예상 진행률 표시 (실제 완료는 폴링으로 확인)
        progress: Math.min(90, prev.elapsedTime * 3) // 최대 90%까지만 (완료는 API 확인 후)
      }));
    }, 1000);

    // 10초마다 AI 완료 상태 확인
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // 백엔드 상태 확인 API 호출
        const status = await checkAiStatus(token);

        // AI 해석이 완료되었는지 확인
        if (status && status.isCompleted) {
          // AI 완료! 전체 결과 다시 로드
          const response = await getSajuResult(token);
          if (response.result) {
            setSajuResult(response.result);
          }

          setAiStatus({
            isProcessing: false,
            isCompleted: true,
            progress: 100,
            elapsedTime: 0
          });

          // 폴링 중지
          clearInterval(pollingIntervalRef.current);
          clearInterval(elapsedTimeIntervalRef.current);
        }
      } catch (err) {
        console.error('AI 상태 확인 실패:', err);
        // 에러 시에도 계속 폴링 (네트워크 일시 오류 대비)
      }
    }, 10000); // 10초마다
  };

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (elapsedTimeIntervalRef.current) clearInterval(elapsedTimeIntervalRef.current);
    };
  }, []);

  const titleFont = "font-serif tracking-[0.2em]";
  const bodyFont = "font-sans tracking-normal";

  // --- Render Helpers ---
  // 1. Initial Data Fetch Loading (Free User -> Result Page)
  // Restore original simple design
  if (loading) return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center text-amber-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-amber-900/30 border-t-amber-600 rounded-full animate-spin"></div>
        <p className="text-stone-500 text-sm font-serif tracking-widest animate-pulse">운세를 분석하고 있습니다...</p>
      </div>
    </div>
  );

  // 2. AI Processing Loading (Paid User -> AI Answer)
  // Keep the new "Message Rotation" design
  if (aiStatus.isProcessing) return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center text-amber-900 relative">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
      <div className="flex flex-col items-center gap-8 z-10 w-full max-w-lg px-6">
        <div className="w-20 h-20 border-t-2 border-r-2 border-amber-600 rounded-full animate-spin"></div>

        <div className="h-16 flex items-center justify-center w-full">
          <p
            key={loadingStep}
            className="text-center font-serif text-[#e8dac0] text-lg tracking-[0.1em] animate-fade-in"
          >
            {LOADER_MESSAGES[loadingStep]}
          </p>
        </div>

        {/* Progress Indicator */}

        <p className="text-stone-500 text-sm font-serif animate-pulse">
          잠시만 기다려주세요 ({aiStatus.progress || 0}%)
        </p>
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
      <div className="min-h-screen bg-[#0f0f10] text-slate-100 relative font-sans">
        {/* 통합 배경: 최상단부터 끊김 없이 이어지는 먹빛 캔터스 */}
        <div className="fixed inset-0 bg-[#0f0f10] z-0" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(60,40,20,0.18),transparent_80%)] z-1 pointer-events-none" />
        <div className="fixed inset-0 opacity-20 z-2 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>

        {/* [Fixed] Top Navigation Bar - 브랜드 정체성 유지 */}
        <div className="fixed top-0 left-0 w-full z-50 pt-8 pb-4 flex justify-between items-center px-8">
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


        {/* 메인 서사 컨텐츠 - Scroll Snap Parent */}
        <main className="snap-parent relative z-10 w-full">

          {/* Step 1: The Entrance - 천상의 서고 입문 */}
          <section ref={entranceRef} className="snap-section px-6" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="flex-1 flex flex-col items-center justify-center pt-12 pb-10">
              {/* 중앙 컨텐츠 - Always visible, no reveal-item/animation blocking */}
              <div className="text-center space-y-6 animate-fade-in">
                {/* 사용자 이름 및 타이틀 */}
                <div className="flex flex-col items-center">
                  {/* 상단 라벨 */}
                  <div className="flex items-center gap-4 mb-10 opacity-80">
                    <div className="w-10 h-px bg-gradient-to-r from-transparent to-amber-600/40" />
                    <span className="text-[#e8dac0] text-lg sm:text-xl tracking-[0.5em] font-serif font-bold uppercase whitespace-nowrap">천명록 (天命錄)</span>
                    <div className="w-10 h-px bg-gradient-to-l from-transparent to-amber-600/40" />
                  </div>

                  {/* 메인 이름 + 낙관 (Seal) */}
                  <div className="relative mb-6">
                    <h1
                      className="text-4xl sm:text-5xl font-bold italic tracking-[0.2em]"
                      style={{
                        fontFamily: '"Song Myung", "Noto Serif KR", serif',
                        color: '#f5f5f4', // stone-100
                        textShadow: '0 0 30px rgba(232, 218, 192, 0.08)'
                      }}
                    >
                      {userInfo?.name || '사용자'}
                    </h1>

                    {/* 천명(天命) 낙관 - 고서 전문가 스타일 */}
                    <div className="absolute -top-3 -right-6 sm:-right-8 w-7 h-7 sm:w-8 sm:h-8 border border-red-800/60 bg-red-800/5 flex items-center justify-center rotate-[-6deg] mix-blend-screen opacity-70 shadow-[inset_0_0_6px_rgba(153,27,27,0.15)]">
                      <div className="text-[9px] sm:text-[10px] text-red-700/90 font-bold leading-[1.1] text-center p-1" style={{ fontFamily: '"Gungsuh", "Batang", serif' }}>
                        天<br />命
                      </div>
                    </div>
                  </div>

                </div>

                {/* 제안 3. [구조적 여백] : 고서의 '판심(版心)' 스타일 */}
                <div className="w-80 mx-auto mt-16 relative">
                  <div className="absolute -top-4 left-0 text-stone-700 text-lg">「</div>
                  <p className="text-stone-400 text-sm font-serif tracking-[0.2em] leading-relaxed px-6">
                    태어난 순간 새겨진 <span className="text-[#e8dac0] italic">당신의 무늬</span>,<br />
                    그 서사의 첫 문을 엽니다
                  </p>
                  <div className="absolute -bottom-4 right-0 text-stone-700 text-lg">」</div>
                </div>

                {/* 하단 스크롤 안내 */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-5 opacity-40 animate-bounce-gentle">
                  <span className="text-[10px] sm:text-[11px] tracking-[0.4em] text-amber-600 uppercase font-serif">열람하기</span>
                  <div className="w-px h-8 bg-gradient-to-b from-amber-600/60 to-transparent"></div>
                </div>


              </div>
            </div>

          </section>

          {/* Step 2: The First Seal - 제 1권: 숙명의 기록 */}
          <section className="snap-section px-6 pb-8" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="flex-1 flex flex-col items-center h-full">
              {/* 섹션 헤더 - 상단 고정 */}
              <div className="flex flex-col items-center pt-8 pb-4 shrink-0 reveal-item">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-px bg-amber-600/30" />
                  <span className="text-[#e8dac0] text-sm sm:tracking-[0.5em] tracking-[0.2em] font-serif font-bold uppercase whitespace-nowrap">제1서 : 사주팔자 (四柱八字)</span>
                  <div className="w-8 h-px bg-amber-600/30" />
                </div>
              </div>

              {/* 3요소 컨테이너 (남은 공간 균등 분할) */}
              <div className="flex-1 w-full max-w-md flex flex-col justify-evenly items-center">

                {/* 1. 일간 설명 */}
                <div className="text-center relative z-10 text-wrapper w-full px-4">
                  {dayMasterDescriptions[sajuResult?.sajuData?.day?.gan] && (
                    <div className="relative py-3 max-w-sm mx-auto">
                      <div className="absolute -top-1 left-0 text-stone-700 text-lg">「</div>
                      <p className="text-stone-300 font-serif text-[14px] leading-relaxed px-4">
                        {userInfo?.name || '사용자'}님의 정신적 근간은<br />
                        <span className="font-bold text-[#e8dac0] italic">
                          {dayMasterDescriptions[sajuResult.sajuData.day.gan].desc}, {sajuResult.sajuData.day.gan}({dayMasterDescriptions[sajuResult.sajuData.day.gan].hanja})의 기운
                        </span>
                        {' '}입니다.
                      </p>
                      <div className="absolute -bottom-1 right-0 text-stone-700 text-lg">」</div>
                    </div>
                  )}
                </div>

                {/* 2. 사주팔자 8글자 그리드 */}
                <div className="w-full relative reveal-item delay-100">
                  <div className="flex gap-2 sm:gap-4 relative z-10">
                    {/* 행 레이블 (천간 / 지지) */}
                    <div className="flex flex-col justify-center gap-3 pt-6 sm:pt-8 w-6 sm:w-8 shrink-0">
                      <div className="flex items-center justify-center h-14 sm:h-16">
                        <span className="text-[10px] text-stone-600/60 tracking-[0.2em] font-serif [writing-mode:vertical-rl] whitespace-nowrap">천간</span>
                      </div>
                      <div className="flex items-center justify-center h-14 sm:h-16">
                        <span className="text-[10px] text-stone-600/60 tracking-[0.2em] font-serif [writing-mode:vertical-rl] whitespace-nowrap">지지</span>
                      </div>
                    </div>

                    {/* 팔자 그리드 (우측에서 좌측으로) */}
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-3 flex-1">
                      {[
                        { pillar: '시주', meaning: '자식/말년', gan: sajuResult?.sajuData?.hour?.gan, ji: sajuResult?.sajuData?.hour?.ji, key: 'hour' },
                        { pillar: '일주', meaning: '나/배우자', gan: sajuResult?.sajuData?.day?.gan, ji: sajuResult?.sajuData?.day?.ji, key: 'day', isDay: true },
                        { pillar: '월주', meaning: '부모/사회', gan: sajuResult?.sajuData?.month?.gan, ji: sajuResult?.sajuData?.month?.ji, key: 'month' },
                        { pillar: '연주', meaning: '조상', gan: sajuResult?.sajuData?.year?.gan, ji: sajuResult?.sajuData?.year?.ji, key: 'year' }
                      ].map(({ pillar, meaning, gan, ji, isDay }, idx) => {
                        const ganElem = getElementFromGan(gan);
                        const jiElem = getElementFromJi(ji);
                        const ganColor = getElementColor(ganElem);
                        const jiColor = getElementColor(jiElem);

                        return (
                          <div key={idx} className="flex flex-col gap-2">
                            {/* 기둥 라벨 */}
                            <div className="text-center mb-0.5 sm:mb-1">
                              <div className={`text-[10px] font-serif tracking-[0.1em] transition-colors duration-700 ${isDay ? 'text-stone-100 font-bold' : 'text-stone-500/50'}`}>
                                {pillar}
                              </div>
                              <div className={`text-[8px] font-serif tracking-[0.05em] transition-colors duration-700 ${isDay ? 'text-stone-300/80' : 'text-stone-500/60'}`}>
                                {meaning}
                              </div>
                            </div>

                            {/* 천간 */}
                            <div className={`relative aspect-square flex items-center justify-center rounded-sm transition-all duration-1000 overflow-hidden bg-[#121214]
                                            ${isDay ? 'z-10' : ''}`}
                              style={{
                                borderStyle: 'solid',
                                borderWidth: '1px',
                                borderColor: `${ganColor}90`,
                                ...(isDay && {
                                  animation: 'day-master-glow 2.5s ease-in-out infinite',
                                  '--glow-color': ganColor.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ') || '217, 119, 6'
                                })
                              }}>
                              <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ background: `radial-gradient(circle at 50% 120%, ${ganColor}, transparent 70%)` }} />
                              <div className="absolute bottom-0 left-0 w-full h-[1px] opacity-30" style={{ backgroundColor: ganColor }} />
                              <span className="relative z-10 text-[26px] sm:text-[32px] font-bold font-serif transition-colors duration-700 text-stone-300/80">
                                {ganHanjaMap[gan] || gan}
                              </span>
                            </div>

                            {/* 지지 */}
                            <div className="relative aspect-square flex items-center justify-center rounded-sm transition-all duration-1000 overflow-hidden bg-[#121214]"
                              style={{ borderStyle: 'solid', borderWidth: '1px', borderColor: `${jiColor}90` }}>
                              <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ background: `radial-gradient(circle at 50% 120%, ${jiColor}, transparent 70%)` }} />
                              <span className="relative z-10 text-[24px] sm:text-[30px] font-bold font-serif text-stone-300/80">
                                {jiHanjaMap[ji] || ji}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. 관계 안내 텍스트 */}
                <div className="mt-6 text-center relative z-10 w-full px-4">
                  <p className="text-stone-500 font-serif text-[12px] italic">
                    나머지 일곱 기운과의 관계를 통해 {userInfo?.name || '당신'}님만의 서사를 완성합니다.
                  </p>
                </div>
              </div>

              {/* 페이지 번호 (Page 1) */}
              <div className="w-full flex justify-center items-center gap-3 pointer-events-none opacity-60 mt-8 mb-4">
                <div className="w-6 h-px bg-amber-600/30" />
                <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">1</span>
                <div className="w-6 h-px bg-amber-600/30" />
              </div>
            </div>
          </section>


          {/* Tech Demo Inspector Panel is omitted for brevity, keeping existing functionality hidden */}
          {showTechData && sajuResult?.sajuData?.techData && (
            <div className="fixed inset-0 z-50 bg-black/95 overflow-y-auto p-4 text-left font-mono text-xs text-green-500">
              <button onClick={() => setShowTechData(false)} className="absolute top-4 right-4 text-white p-2 border">Close</button>
              <pre>{JSON.stringify(sajuResult.sajuData.techData, null, 2)}</pre>
            </div>
          )}

          {/* Step 3: The Energy Balance - 제 2서: 오행의 조화 */}
          <section className="snap-section px-6 h-auto" style={{ paddingTop: 'var(--safe-area-top)', justifyContent: 'flex-start' }}>
            {console.log('[제2서 렌더링 시작]', { oheng: sajuResult?.oheng, sajuData: sajuResult?.sajuData })}
            <div className="flex flex-col items-center py-12 min-h-screen">
              <div className="flex flex-col items-center mb-6 reveal-item">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-px bg-amber-600/30" />
                  <span className="text-[#e8dac0] text-sm sm:tracking-[0.5em] tracking-[0.2em] font-serif font-bold uppercase whitespace-nowrap">제2서 : 오행의 조화 (五行分析)</span>
                  <div className="w-8 h-px bg-amber-600/30" />
                </div>
              </div>

              {/* 일반론 서문 */}
              <div className="w-full max-w-sm px-4 mb-8 reveal-item">
                <div className="relative py-3">
                  <div className="absolute -top-1 left-0 text-stone-700 text-lg">「</div>
                  <p className="text-stone-400 text-[12px] sm:text-[13px] font-serif tracking-wider leading-relaxed text-center px-4">
                    오행은 좋고 나쁨이 아닌 <span className="text-[#e8dac0] italic">당신이 타고난 재료</span> 입니다<br />
                    이를 깊이 이해할 때, 비로소 당신은 <span className="text-[#e8dac0] italic">운명의 주인</span> 이 됩니다
                  </p>
                  <div className="absolute -bottom-1 right-0 text-stone-700 text-lg">」</div>
                </div>
              </div>

              {/* 오행 차트 - 가시성 복구 및 패딩 최적화 */}
              <div
                className="w-full max-w-xs relative reveal-item delay-100 min-h-[300px] flex flex-col items-center justify-center cursor-pointer group"
                onClick={() => setShowOhengInfo(true)}
              >
                <div className="relative flex flex-col items-center">
                  <svg width="260" height="260" viewBox="0 0 120 120" className="overflow-visible relative z-10 scale-110 sm:scale-125 transition-transform duration-500 group-hover:scale-[1.15] sm:group-hover:scale-[1.3]">
                    <defs>
                      <linearGradient id="poly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#78350f" stopOpacity="0.7" />
                      </linearGradient>
                      <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#92400e" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
                      </radialGradient>

                      {/* 궤도 경로 정의 - 반지름 53 원형 */}
                      <path id="orbit-path" d="M 60,7 A 53,53 0 1,1 59.99,7" fill="none" />

                      {/* 황금빛 그라디언트 - 신비로운 후광 효과 */}
                      <radialGradient id="mystic-glow">
                        <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />      {/* 중심: 밝은 크림 */}
                        <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.9" />   {/* amber-300 */}
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />   {/* amber-500 */}
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0" />    {/* amber-600 페이드아웃 */}
                      </radialGradient>

                      {/* 빛나는 입자 필터 - 다층 블러 효과 */}
                      <filter id="particle-glow" x="-200%" y="-200%" width="400%" height="400%">
                        {/* 강한 외곽 glow */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                        {/* 중간 glow */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
                        {/* 선명한 중심 */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="blur3" />

                        {/* 레이어 합성 */}
                        <feMerge>
                          <feMergeNode in="blur1" />  {/* 가장 넓은 후광 */}
                          <feMergeNode in="blur2" />  {/* 중간 후광 */}
                          <feMergeNode in="blur3" />  {/* 선명한 중심 */}
                          <feMergeNode in="SourceGraphic" />  {/* 원본 */}
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Background Glow Circle (Replaces CSS Blur Div) */}
                    <circle cx="60" cy="60" r="60" fill="url(#bg-glow)" />

                    {[15, 30, 45].map((r, i) => (
                      <circle key={i} cx="60" cy="60" r={r} fill="none" stroke="rgba(217, 119, 6, 0.1)" strokeWidth="0.2" />
                    ))}

                    {[0, 72, 144, 216, 288].map((angle, i) => {
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <line key={i} x1="60" y1="60" x2={60 + 45 * Math.cos(rad)} y2={60 + 45 * Math.sin(rad)} stroke="rgba(217, 119, 6, 0.1)" strokeWidth="0.3" />
                      );
                    })}

                    {/* 상극의 별 (Inner Star) - Pentagram (Control Cycle) */}
                    <path
                      d={
                        [0, 144, 288, 72, 216].map((angle, i) => {
                          const rad = (angle - 90) * (Math.PI / 180);
                          const r = 45;
                          const x = 60 + r * Math.cos(rad);
                          const y = 60 + r * Math.sin(rad);
                          return (i === 0 ? 'M' : 'L') + x + ',' + y;
                        }).join(' ') + ' Z'
                      }
                      fill="none"
                      stroke="rgba(180, 83, 9, 0.1)"
                      strokeWidth="0.4"
                      strokeDasharray="2 2"
                    />

                    {/* 상생의 궤도 (Outer Orbit) - Generation Cycle */}
                    <circle cx="60" cy="60" r="53" fill="none" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="0.4" />

                    {/* 순환하는 빛 (Orbiting Light) - SVG Native Animation */}
                    <circle r="2.5" fill="url(#mystic-glow)" filter="url(#particle-glow)">
                      <animateMotion dur="24s" repeatCount="indefinite">
                        <mpath href="#orbit-path" />
                      </animateMotion>
                      {/* 펄스 애니메이션 - 맥박처럼 커졌다 작아짐 */}
                      <animate
                        attributeName="r"
                        values="2.2;3.2;2.2"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                      {/* 투명도 펄스 - 빛의 강약 */}
                      <animate
                        attributeName="opacity"
                        values="0.85;1;0.85"
                        dur="2.5s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {(() => {
                      try {
                        if (!sajuResult?.oheng) {
                          console.warn('[오행 SVG] 데이터 없음');
                          return null;
                        }

                        const elements = [
                          { key: "목", label: "木", meaning: "성장", angle: 0 },
                          { key: "화", label: "火", meaning: "열정", angle: 72 },
                          { key: "토", label: "土", meaning: "안정", angle: 144 },
                          { key: "금", label: "金", meaning: "결실", angle: 216 },
                          { key: "수", label: "水", meaning: "지혜", angle: 288 }
                        ];

                        const rawData = elements.map(el => ({
                          key: el.key,
                          val: sajuResult.oheng[el.key] || 0
                        }));
                        let floorSum = 0;
                        const processed = rawData.map(d => {
                          const integer = Math.floor(d.val);
                          floorSum += integer;
                          return { ...d, integer, remainder: d.val - integer };
                        });
                        let diff = 100 - floorSum;
                        const finalOheng = {};
                        [...processed].sort((a, b) => b.remainder - a.remainder).forEach((d, idx) => {
                          finalOheng[d.key] = d.integer + (idx < diff ? 1 : 0);
                        });

                        const finalVals = elements.map(el => finalOheng[el.key]);
                        const maxFinalVal = Math.max(...finalVals);

                        // 최강 오행 계산
                        let strongest = elements[0].key;
                        elements.forEach(el => {
                          if (finalOheng[el.key] === maxFinalVal) {
                            strongest = el.key;
                          }
                        });

                        let standardMax = maxFinalVal > 50 ? maxFinalVal + 10 : 50;
                        const scaleFactor = 45 / standardMax;

                        const pointsData = elements.map(el => {
                          const val = finalOheng[el.key];
                          const r = val * scaleFactor;
                          const rad = (el.angle - 90) * (Math.PI / 180);
                          return {
                            ...el,
                            val,
                            x: 60 + r * Math.cos(rad),
                            y: 60 + r * Math.sin(rad)
                          };
                        });

                        const pointsString = pointsData.map(p => `${p.x},${p.y}`).join(" ");

                        return (
                          <g>
                            <polygon points={pointsString} fill="url(#poly-grad)" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="0.5" filter="url(#glow)" />

                            {/* Vertex Glow Points - 크림색 통일 + 맥동 효과 */}
                            {pointsData.map((p, i) => (
                              <circle
                                key={`glow-${i}`}
                                cx={p.x} cy={p.y}
                                r={1.2}
                                fill="#e8dac0"
                                className="animate-vertex-glow"
                              />
                            ))}

                            {/* Labels */}
                            {pointsData.map((p, i) => {
                              const rad = (p.angle - 90) * (Math.PI / 180);
                              const tx = 60 + 55 * Math.cos(rad);
                              const ty = 60 + 55 * Math.sin(rad);
                              return (
                                <g key={i}>
                                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill={elementColorMap[p.key]} className="text-[7px] font-bold font-serif">
                                    {p.label}
                                  </text>
                                  <text x={tx} y={ty + 7} textAnchor="middle" fill="#a8a29e" className="text-[5px] font-mono">
                                    {p.val}%
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      } catch (error) {
                        console.error('[오행 SVG 렌더링 에러]', error);
                        return null;
                      }
                    })()}
                  </svg>
                </div>
                {/* 힌트 텍스트 (Guidance) */}
                <div className="mt-4 sm:mt-8 md:mt-10 opacity-0 animate-fade-in delay-1000 fill-mode-forwards pointer-events-none">
                  <p className="text-[10px] text-amber-500/40 font-serif tracking-widest text-center">
                    * 궤도를 도는 빛을 눌러보세요
                  </p>
                </div>
              </div>

              {/* 스크롤 안내 (천상기록보관소와 통일) */}

              {/* 페이지 번호 (Page 2) */}
              <div className="w-full flex justify-center items-center gap-3 pointer-events-none opacity-60 mt-8 mb-4">
                <div className="w-6 h-px bg-amber-600/30" />
                <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">2</span>
                <div className="w-6 h-px bg-amber-600/30" />
              </div>
            </div>
          </section>

          {/* Step 3-B: 오행 해석 페이지 */}
          <section className="snap-section px-6 pb-12 h-auto" style={{ paddingTop: 'var(--safe-area-top)', justifyContent: 'flex-start' }}>
            {(() => {
              try {
                const ohengData = sajuResult?.oheng;
                if (!ohengData) return null;

                const elements = ['목', '화', '토', '금', '수'];

                // 최강/최약 계산
                let strongest = '목', weakest = '수';
                let maxVal = -1, minVal = 101;
                elements.forEach(el => {
                  const val = ohengData[el] || 0;
                  if (val > maxVal) { maxVal = val; strongest = el; }
                  if (val < minVal) { minVal = val; weakest = el; }
                });

                // 관계 텍스트
                const relationText = generateRelationText(strongest, weakest);

                return (
                  <div className="flex flex-col items-center justify-start py-12 min-h-screen">
                    {/* 오행 미니 바 */}
                    <div className="w-full max-w-sm mb-8 reveal-item delay-100">
                      <div className="flex justify-between items-center px-2 py-3 bg-[#1a1a1c]/50 rounded border border-amber-900/10">
                        {elements.map(el => {
                          const val = Math.round(ohengData[el] || 0);
                          return (
                            <div key={el} className="flex flex-col items-center">
                              <span className={`text-xs font-bold font-serif`} style={{ color: elementColorMap[el] }}>
                                {ohengLabels[el]}
                              </span>
                              <span className="text-[10px] font-mono mt-0.5 text-stone-400">
                                {val}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 오행 분석 텍스트 */}
                    <div className="w-full max-w-sm px-4 reveal-item delay-200">
                      <div className="space-y-6">
                        {/* 최강 기운 */}
                        <div className="p-4 bg-[#1a1a1c]/30 rounded border-l-2" style={{ borderLeftColor: elementColorMap[strongest] }}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold font-serif" style={{ color: elementColorMap[strongest] }}>{ohengLabels[strongest]}</span>
                            <span className="text-stone-500 text-xs">({Math.round(maxVal)}%) - 가장 두드러진 기운</span>
                          </div>

                          {/* 일반적 특성 */}
                          <div>
                            <p className="text-stone-300 text-[13px] font-serif leading-relaxed">
                              {강할때특성[strongest]}
                            </p>
                          </div>
                        </div>

                        {/* 최약 기운 */}
                        <div className="p-4 bg-[#1a1a1c]/30 rounded border-l-2" style={{ borderLeftColor: elementColorMap[weakest] }}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold font-serif" style={{ color: elementColorMap[weakest] }}>{ohengLabels[weakest]}</span>
                            <span className="text-stone-600 text-xs">({Math.round(minVal)}%) - 상대적으로 여린 기운</span>
                          </div>

                          {/* 일반적 특성 */}
                          <div>
                            <p className="text-stone-400 text-[13px] font-serif leading-relaxed">
                              {약할때특성[weakest]}
                            </p>
                          </div>
                        </div>

                        {/* 상생/상극 관계 */}
                        {/* 상생/상극 관계 */}
                        <div className="pt-6 relative">
                          {/* Top horizontal divider with icon */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent flex-1" />
                            <span className="text-[#e8dac0] text-xs font-serif shrink-0 opacity-80">☯ 기운의 관계</span>
                            <div className="h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent flex-1" />
                          </div>

                          <p className="text-stone-400 text-[12px] font-serif leading-relaxed italic text-center px-4">
                            {relationText}
                          </p>
                        </div>

                        {/* 페이지 번호 (Page 3) */}
                        <div className="w-full flex justify-center items-center gap-3 pointer-events-none opacity-60 mt-12 mb-4">
                          <div className="w-6 h-px bg-amber-600/30" />
                          <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">3</span>
                          <div className="w-6 h-px bg-amber-600/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } catch (error) {
                console.error('[오행 해석 에러]', error);
                return null;
              }
            })()}
          </section>

          {/* Step 4: The Sealed Archive - 제 3권: 천개의 비밀 */}
          <section ref={chapter3Ref} className="snap-section px-6 h-auto pb-20" style={{ paddingTop: 'var(--safe-area-top)' }}>
            {/* Chapter 3 Heading */}
            <div className="pt-12 mb-2 z-10 relative reveal-item w-full mx-auto">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-8 h-px bg-amber-600/30" />
                  <h3 className="text-sm font-bold text-[#e8dac0] sm:tracking-[0.5em] tracking-[0.2em] font-serif uppercase whitespace-nowrap">
                    제3서 : 천개의 비밀 (天機錄)
                  </h3>
                  <div className="w-8 h-px bg-amber-600/30" />
                </div>

                {/* Description with Brackets */}
                <div className="relative py-4 mb-6">
                  <div className="absolute -top-1 left-0 text-stone-700 text-lg">「</div>
                  <p className="text-stone-400 text-[12px] font-serif tracking-wider leading-relaxed text-center px-4">
                    운명을 지탱하는 <span className="text-[#e8dac0] italic">일곱 가지 기둥</span>.<br />
                    당신의 삶을 관통하는 <span className="text-[#e8dac0] italic">하늘의 비밀</span>을 기록했습니다.
                  </p>
                  <div className="absolute -bottom-1 right-0 text-stone-700 text-lg">」</div>
                </div>

                {/* Vertical Flow Line */}
                <div className="flex justify-center -mt-2 mb-2 opacity-40">
                  <div className="w-px h-16 bg-gradient-to-b from-amber-600/50 to-transparent"></div>
                </div>
              </div>
            </div>

            {/* Content Chapters */}
            <div className="flex-1 flex flex-col justify-center z-10 relative space-y-12 w-full mx-auto py-10">

              {/* Chapter 1: 본성(本性) - 근원의 불꽃 */}
              <div className="relative reveal-item">
                <div className="flex flex-col items-center mb-6">
                  <span className="text-emerald-600/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 1: Nature</span>
                  <h4 className="text-emerald-600 font-bold text-xl flex items-center gap-2 font-serif border-b border-emerald-900/10 pb-2">
                    제 1장: 본성(本性) <span className="text-stone-500 font-light text-sm">- 근원의 불꽃</span>
                  </h4>
                </div>
                <div className="bg-[#1a1a1c] border border-emerald-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                  <div>
                    {sajuResult.detailedData?.personality?.sub1 ? (
                      <div className="space-y-6">
                        {/* 1. 내면의 성향 */}
                        <div className="border-l-2 border-emerald-900/60 pl-4 py-1">
                          <h6 className="text-emerald-900/70 text-[10px] font-bold tracking-widest mb-1">내면의 성향</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.personality.sub1}
                          </p>
                        </div>
                        {/* 2. 사회적 면모 */}
                        {sajuResult.detailedData.personality.sub2 && (
                          <div className="border-l-2 border-emerald-900/60 pl-4 py-1">
                            <h6 className="text-emerald-900/70 text-[10px] font-bold tracking-widest mb-1">사회적 면모</h6>
                            <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                              {sajuResult.detailedData.personality.sub2}
                            </p>
                          </div>
                        )}
                        {/* 3. 숨겨진 잠재력 */}
                        {sajuResult.detailedData.personality.sub3 && (
                          <div className="border-l-2 border-emerald-900/60 pl-4 py-1">
                            <h6 className="text-emerald-900/70 text-[10px] font-bold tracking-widest mb-1">숨겨진 잠재력</h6>
                            <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                              {sajuResult.detailedData.personality.sub3}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                        {sajuResult.overallFortune || sajuResult.detailedData?.personality?.description || "스스로도 인지하지 못했던 내면의 기질과, 운명을 이끄는 당신만의 고유한 본성을 마주합니다."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Chapter 2: 재록(財祿) - 부의 그릇 */}
              <div className="relative reveal-item">
                <div className="flex flex-col items-center mb-6">
                  <span className="text-stone-400 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 2: Wealth</span>
                  <h4 className="text-stone-300 font-bold text-xl flex items-center gap-2 font-serif border-b border-stone-500/10 pb-2">
                    제 2장: 재록(財祿) <span className="text-stone-500 font-light text-sm">- 부의 그릇</span>
                  </h4>
                </div>
                <div className="bg-[#1a1a1c] border border-stone-500/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                  <div>
                    {sajuResult.detailedData?.wealth?.sub1 ? (
                      <div className="space-y-6">
                        {/* 1. 재물의 그릇 */}
                        <div className="border-l-2 border-stone-600 pl-4 py-1">
                          <h6 className="text-stone-500 text-[10px] font-bold tracking-widest mb-1">재물의 그릇</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.wealth.sub1}
                          </p>
                        </div>
                        {/* 2. 재물의 흐름 */}
                        <div className="border-l-2 border-stone-600 pl-4 py-1">
                          <h6 className="text-stone-500 text-[10px] font-bold tracking-widest mb-1">재물의 흐름</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.wealth.sub2}
                          </p>
                        </div>
                        {/* 3. 증식의 전략 */}
                        <div className="border-l-2 border-stone-600 pl-4 py-1">
                          <h6 className="text-stone-500 text-[10px] font-bold tracking-widest mb-1">증식의 전략</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.wealth.sub3}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                        {sajuResult.wealthFortune || sajuResult.detailedData?.wealth?.description || "당신의 사주 속 재물의 흐름과 부의 그릇, 그리고 그 에너지가 머무는 방향을 분석합니다."}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* Chapter 3: 관운(官運) - 천직의 자리 */}
              <div className="relative reveal-item">
                <div className="flex flex-col items-center mb-6">
                  <span className="text-orange-500/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 3: Career</span>
                  <h4 className="text-orange-500 font-bold text-xl flex items-center gap-2 font-serif border-b border-orange-900/10 pb-2">
                    제 3장: 관운(官運) <span className="text-stone-500 font-light text-sm">- 천직의 자리</span>
                  </h4>
                </div>
                <div className="bg-[#1a1a1c] border border-orange-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                  <div>
                    {sajuResult.detailedData?.career?.sub1 ? (
                      <div className="space-y-6">
                        {/* 1. 천직의 역할 */}
                        <div className="border-l-2 border-orange-900/40 pl-4 py-1">
                          <h6 className="text-orange-900/60 text-[10px] font-bold tracking-widest mb-1">천직의 역할</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.career.sub1}
                          </p>
                        </div>
                        {/* 2. 성공의 형태 */}
                        <div className="border-l-2 border-orange-900/40 pl-4 py-1">
                          <h6 className="text-orange-900/60 text-[10px] font-bold tracking-widest mb-1">성공의 형태</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.career.sub2}
                          </p>
                        </div>
                        {/* 3. 명예의 시기 */}
                        <div className="border-l-2 border-orange-900/40 pl-4 py-1">
                          <h6 className="text-orange-900/60 text-[10px] font-bold tracking-widest mb-1">명예의 시기</h6>
                          <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                            {sajuResult.detailedData.career.sub3}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                        {sajuResult.careerFortune || sajuResult.detailedData?.career?.description || "당신이 세상에서 어떤 역할로 빛나게 될 운인지, 명예와 책임의 자리를 탐색합니다."}
                      </p>
                    )}
                  </div>

                </div>
              </div>

              {/* AI Interpretation Section (Chapters 4-7) - Hybrid Loading Flow */}
              {(aiStatus.isProcessing && !aiStatus.isCompleted) ? (
                <div className="w-full max-w-sm mx-auto py-10 space-y-8 animate-pulse">
                  {/* Progress Card */}
                  <div className="bg-[#1a1a1c] border border-amber-900/20 rounded-md p-6 shadow-lg">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 border-2 border-amber-600 rounded-full animate-spin border-t-transparent flex-shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]"></div>
                      <div className="flex-1">
                        <p className="text-amber-500 font-serif font-bold text-sm tracking-wider mb-1 animate-pulse">
                          천명(天命)을 해석하는 중...
                        </p>
                        <p className="text-stone-500 text-[11px] text-left tracking-wide">
                          약 {Math.max(0, 30 - aiStatus.elapsedTime)}초 남음 - 전문가 AI가 분석 중입니다
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-stone-900/50 h-2 rounded-full overflow-hidden border border-stone-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-800 to-amber-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        style={{ width: `${aiStatus.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Skeleton Cards */}
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-48 bg-[#1a1a1c] border border-stone-800/50 rounded-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] animate-shimmer" style={{ animationDelay: `${i * 0.2}s` }}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="animate-fade-in space-y-12">
                  {/* Chapter 4: 연분(緣分) - 인연의 실타래 */}
                  <div className="relative reveal-item">
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-rose-500/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 4: Love</span>
                      <h4 className="text-rose-500 font-bold text-xl flex items-center gap-2 font-serif border-b border-rose-900/10 pb-2">
                        제 4장: 연분(緣分) <span className="text-stone-500 font-light text-sm">- 인연의 실타래</span>
                      </h4>
                    </div>
                    <div className="bg-[#1a1a1c] border border-rose-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                      <div>
                        {sajuResult.detailedData?.love?.sub1 ? (
                          <div className="space-y-6">
                            {/* 1. 사랑의 관점 */}
                            <div className="border-l-2 border-rose-900/40 pl-4 py-1">
                              <h6 className="text-rose-900/60 text-[10px] font-bold tracking-widest mb-1">사랑의 관점</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.love.sub1}
                              </p>
                            </div>
                            {/* 2. 배우자의 모습 */}
                            <div className="border-l-2 border-rose-900/40 pl-4 py-1">
                              <h6 className="text-rose-900/60 text-[10px] font-bold tracking-widest mb-1">배우자의 모습</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.love.sub2}
                              </p>
                            </div>
                            {/* 3. 결연의 비결 */}
                            <div className="border-l-2 border-rose-900/40 pl-4 py-1">
                              <h6 className="text-rose-900/60 text-[10px] font-bold tracking-widest mb-1">결연의 비결</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.love.sub3}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                            {sajuResult.loveFortune || sajuResult.detailedData?.love?.description || "인연은 때로 한 줄의 실처럼 얇지만, 당신의 사주 속에 그 실이 누구와 엮일 운명인지 새겨져 있습니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chapter 5: 체상(體象) - 신체의 등불 */}
                  <div className="relative reveal-item">
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-lime-500/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 5: Health</span>
                      <h4 className="text-lime-500 font-bold text-xl flex items-center gap-2 font-serif border-b border-lime-900/10 pb-2">
                        제 5장: 체상(體象) <span className="text-stone-500 font-light text-sm">- 신체의 등불</span>
                      </h4>
                    </div>
                    <div className="bg-[#1a1a1c] border border-lime-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                      <div>
                        {sajuResult.detailedData?.health?.sub1 ? (
                          <div className="space-y-6">
                            {/* 1. 생명력 */}
                            <div className="border-l-2 border-lime-900/40 pl-4 py-1">
                              <h6 className="text-lime-900/60 text-[10px] font-bold tracking-widest mb-1">생명력</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.health.sub1}
                              </p>
                            </div>
                            {/* 2. 주의할 점 */}
                            <div className="border-l-2 border-lime-900/40 pl-4 py-1">
                              <h6 className="text-lime-900/60 text-[10px] font-bold tracking-widest mb-1">주의할 점</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.health.sub2}
                              </p>
                            </div>
                            {/* 3. 건강 지침 */}
                            <div className="border-l-2 border-lime-900/40 pl-4 py-1">
                              <h6 className="text-lime-900/60 text-[10px] font-bold tracking-widest mb-1">건강 지침</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.health.sub3}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                            {sajuResult.healthFortune || sajuResult.detailedData?.health?.description || "당신의 몸은 오행의 거울입니다. 그 빛이 머무는 곳과, 가려진 그림자를 함께 비춰봅니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chapter 6: 시운(時運) - 시간의 파도 */}
                  <div className="relative reveal-item">
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-purple-400/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 6: Destiny</span>
                      <h4 className="text-purple-400 font-bold text-xl flex items-center gap-2 font-serif border-b border-purple-500/10 pb-2">
                        제 6장: 시운(時運) <span className="text-stone-500 font-light text-sm">- 시간의 파도</span>
                      </h4>
                    </div>
                    <div className="bg-[#1a1a1c] border border-purple-500/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                      <div>
                        {sajuResult.detailedData?.future?.sub1 ? (
                          <div className="space-y-6">
                            {/* 1. 현재의 계절 */}
                            <div className="border-l-2 border-purple-900/40 pl-4 py-1">
                              <h6 className="text-purple-900/60 text-[10px] font-bold tracking-widest mb-1">현재의 계절</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.future.sub1}
                              </p>
                            </div>
                            {/* 2. 흐름의 변화 */}
                            <div className="border-l-2 border-purple-900/40 pl-4 py-1">
                              <h6 className="text-purple-900/60 text-[10px] font-bold tracking-widest mb-1">흐름의 변화</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.future.sub2}
                              </p>
                            </div>
                            {/* 3. 미래의 전략 */}
                            <div className="border-l-2 border-purple-900/40 pl-4 py-1">
                              <h6 className="text-purple-900/60 text-[10px] font-bold tracking-widest mb-1">미래의 전략</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.future.sub3}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                            {sajuResult.destinyFortune || sajuResult.detailedData?.destiny?.description || "현재 당신이 지나고 있는 대운과 향후 5년의 흐름을 관조합니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* [NEW] The Timeline: Future 5 Years (AI Data) */}
                  {sajuResult.detailedData?.future?.next3to5Years && (
                    <div className="relative reveal-item mt-8 mb-12">
                      <div className="flex flex-col items-center mb-6">
                        <span className="text-purple-400/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">The Timeline</span>
                        <h4 className="text-purple-300 font-bold text-lg flex items-center gap-2 font-serif border-b border-purple-500/10 pb-2">
                          미래(未来)의 흐름
                        </h4>
                      </div>
                      <div className="space-y-4">
                        {sajuResult.detailedData.future.next3to5Years.map((yearData, idx) => (
                          <div key={idx} className="bg-[#151517] border border-stone-800/50 rounded-sm p-4 relative overflow-hidden flex gap-4 items-start">
                            <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-stone-800 pr-4">
                              <span className="text-xl font-bold text-stone-200 font-serif">{yearData.year}</span>
                              <span className="text-[10px] text-purple-400 uppercase tracking-widest">
                                {yearData.year === new Date().getFullYear() ? '올해' : `${yearData.year - new Date().getFullYear()}년후`}
                              </span>
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-purple-200 mb-1">{yearData.energy}</h5>
                              <div className="flex flex-wrap gap-2">
                                {yearData.keyPoints?.map((point, k) => (
                                  <span key={k} className="text-[10px] text-stone-400 bg-stone-800/40 px-2 py-0.5 rounded-full border border-stone-700/50">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chapter 7: 비책(秘策) - 개운의 열쇠 */}
                  <div className="relative reveal-item">
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-blue-500/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 7: Secret</span>
                      <h4 className="text-blue-500 font-bold text-xl flex items-center gap-2 font-serif border-b border-blue-500/10 pb-2">
                        제 7장: 비책(秘策) <span className="text-stone-500 font-light text-sm">- 운명의 파도를 넘는 비책</span>
                      </h4>
                    </div>
                    <div className="bg-[#1a1a1c] border border-blue-500/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                      <div>
                        {sajuResult.detailedData?.advice?.sub1 ? (
                          <div className="space-y-6">
                            {/* 1. 행운의 열쇠 */}
                            <div className="border-l-2 border-blue-900/40 pl-4 py-1">
                              <h6 className="text-blue-900/60 text-[10px] font-bold tracking-widest mb-1">행운의 열쇠</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.advice.sub1}
                              </p>
                            </div>
                            {/* 2. 실천 강령 */}
                            <div className="border-l-2 border-blue-900/40 pl-4 py-1">
                              <h6 className="text-blue-900/60 text-[10px] font-bold tracking-widest mb-1">실천 강령</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.advice.sub2}
                              </p>
                            </div>
                            {/* 3. 인연의 지혜 */}
                            <div className="border-l-2 border-blue-900/40 pl-4 py-1">
                              <h6 className="text-blue-900/60 text-[10px] font-bold tracking-widest mb-1">인연의 지혜</h6>
                              <p className="text-stone-300 text-sm leading-7 font-serif text-justify">
                                {sajuResult.detailedData.advice.sub3}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                            {(typeof sajuResult.detailedData?.advice === 'string' ? sajuResult.detailedData?.advice : sajuResult.detailedData?.blessings?.advice || sajuResult.advice) || "부족한 기운을 채우고 과한 기운을 다스리는 개운법과, 당신을 도울 귀인의 정보가 기록되어 있습니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chapter 8: 부록(附錄) - 삶의 나침반 */}
                  <div className="relative reveal-item mt-16">
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-amber-500/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Chapter 8: Appendix</span>
                      <h4 className="text-amber-500 font-bold text-xl flex items-center gap-2 font-serif border-b border-amber-900/10 pb-2">
                        제 8장: 부록(附錄) <span className="text-stone-500 font-light text-sm">- 삶의 나침반</span>
                      </h4>
                    </div>
                    <div className="bg-[#1a1a1c] border border-amber-500/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                      <div>
                        {sajuResult.detailedData?.food || sajuResult.detailedData?.color || sajuResult.detailedData?.direction ? (
                          <div className="space-y-12">
                            {/* 음식 (Food) */}
                            {sajuResult.detailedData?.food && (
                              <div className="relative">
                                <div className="flex flex-col items-center mb-4">
                                  <h5 className="text-amber-500/80 font-bold text-sm font-serif border-b border-amber-900/10 pb-1">
                                    생명을 기르는 식단
                                  </h5>
                                </div>
                                <div className="space-y-6 relative z-10">
                                  {/* 추천 음식 */}
                                  {sajuResult.detailedData.food.recommend && (
                                    <div className="border-l-2 border-amber-600/30 pl-4 py-1">
                                      <h6 className="text-amber-200/50 text-[10px] font-bold tracking-widest mb-2 uppercase">추천 (推荐)</h6>
                                      <div className="flex flex-wrap gap-2">
                                        {sajuResult.detailedData.food.recommend.map((item, idx) => (
                                          <span key={idx} className="text-xs text-stone-200 bg-stone-900/80 px-3 py-1.5 rounded-sm border border-amber-900/20 font-serif">
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* 피해야 할 음식 */}
                                  {sajuResult.detailedData.food.avoid && (
                                    <div className="border-l-2 border-stone-700 pl-4 py-1">
                                      <h6 className="text-stone-500 text-[10px] font-bold tracking-widest mb-2 uppercase">경계 (警戒)</h6>
                                      <div className="flex flex-wrap gap-2">
                                        {sajuResult.detailedData.food.avoid.map((item, idx) => (
                                          <span key={idx} className="text-xs text-stone-400 bg-stone-900/50 px-3 py-1.5 rounded-sm border border-stone-800 font-serif">
                                            {item}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 색상 (Color) */}
                            {sajuResult.detailedData?.color && (
                              <div className="relative">
                                <div className="flex flex-col items-center mb-4">
                                  <h5 className="text-amber-500/80 font-bold text-sm font-serif border-b border-amber-900/10 pb-1">
                                    기운을 담은 빛깔
                                  </h5>
                                </div>
                                <div className="border-l-2 border-amber-600/30 pl-4 py-1 relative z-10">
                                  <h6 className="text-amber-200/50 text-[10px] font-bold tracking-widest mb-3 uppercase">길한 색 (吉色)</h6>
                                  <div className="flex flex-wrap gap-4 items-center">
                                    {sajuResult.detailedData.color.good?.map((color, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <div
                                          className="w-5 h-5 rounded-full border border-white/10 shadow-inner"
                                          style={{
                                            background: color === '빨강' ? '#ef4444' :
                                              color === '검정' ? '#0a0a0a' :
                                                color === '파랑' ? '#3b82f6' :
                                                  color === '녹색' ? '#22c55e' :
                                                    color === '노랑' ? '#eab308' :
                                                      color === '흰색' ? '#ffffff' :
                                                        color === '갈색' ? '#92400e' :
                                                          color === '회색' ? '#6b7280' : color
                                          }}
                                        />
                                        <span className="text-stone-400 text-xs font-serif">{color}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 방향과 거주지 (Direction & Place) */}
                            {sajuResult.detailedData?.direction && (
                              <div className="relative">
                                <div className="flex flex-col items-center mb-4">
                                  <h5 className="text-amber-500/80 font-bold text-sm font-serif border-b border-amber-900/10 pb-1">
                                    길한 터전
                                  </h5>
                                </div>
                                <div className="space-y-8 relative z-10">
                                  <div className="border-l-2 border-amber-600/30 pl-4 py-1">
                                    <h6 className="text-amber-200/50 text-[10px] font-bold tracking-widest mb-3 uppercase">길한 방향 (吉方)</h6>
                                    <div className="flex items-baseline gap-2 mb-2">
                                      <span className="text-stone-100 text-lg font-bold font-serif">{sajuResult.detailedData.direction.good}</span>
                                      <span className="text-stone-500 text-[10px] italic">방향</span>
                                    </div>
                                    <p className="text-stone-400 text-xs font-serif leading-relaxed">
                                      {sajuResult.detailedData.direction.description}
                                    </p>
                                  </div>
                                  {sajuResult.detailedData.place && (
                                    <div className="border-l-2 border-amber-600/30 pl-4 py-1">
                                      <h6 className="text-amber-200/50 text-[10px] font-bold tracking-widest mb-3 uppercase">길한 거주지 (吉居)</h6>
                                      <p className="text-stone-400 text-xs font-serif leading-relaxed italic">
                                        {sajuResult.detailedData.place.description || "당신의 기운을 보강해줄 최적의 거주 환경을 제안합니다."}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-stone-300 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                            {"부록으로 당신의 기운을 도울 음식, 색상, 방향, 거주지 등 일상 속 실천 지침을 담았습니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 천기의 경고 (Warning Card) */}
                  {sajuResult.detailedData?.disasters && (
                    <div className="relative reveal-item mt-16">
                      <div className="bg-red-950/10 border border-red-900/30 p-6 rounded-sm relative overflow-hidden shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-xl">⚠️</span>
                          <h4 className="text-red-500/90 font-bold font-serif">천기의 경고</h4>
                        </div>
                        <p className="text-red-200/70 text-sm font-serif leading-7 mb-4">
                          {sajuResult.detailedData.disasters.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sajuResult.detailedData.disasters.items?.map((item, idx) => (
                            <span key={idx} className="text-xs text-red-400 bg-red-900/20 px-3 py-1 rounded-full border border-red-500/20">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Overall Summary: 총평(總評) - 맨 마지막으로 배치 */}
                  <div className="relative reveal-item mt-16 pt-12 border-t border-indigo-900/10">
                    <div className="flex flex-col items-center mb-6">
                      <span className="text-indigo-500/70 text-[9px] tracking-[0.5em] uppercase font-bold mb-2">Overall Summary</span>
                      <h4 className="text-indigo-500 font-bold text-xl flex items-center gap-2 font-serif border-b border-indigo-900/10 pb-2">
                        총평: 천명의 갈무리 <span className="text-stone-500 font-light text-sm">- 삶을 관통하는 실</span>
                      </h4>
                    </div>
                    <div className="bg-[#1a1a1c] border border-indigo-900/10 rounded-sm p-6 shadow-xl relative overflow-hidden group">
                      <div className="absolute inset-0 opacity-5 border border-indigo-500/5 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}></div>
                      <div className="absolute -inset-1 bg-indigo-500/5 blur-3xl opacity-20 pointer-events-none"></div>
                      <div className="relative z-10">
                        {sajuResult.detailedData?.overall?.summary ? (
                          <p className="text-stone-200 leading-9 font-serif text-[15px] whitespace-pre-line text-justify">
                            {sajuResult.detailedData.overall.summary}
                          </p>
                        ) : (
                          <p className="text-stone-400 leading-8 font-serif text-[15px] whitespace-pre-line text-justify">
                            {sajuResult.overallFortune || "당신의 평생 운을 관통하는 핵심 흐름과, 가장 큰 변곡점이 되는 시기를 종합적으로 분석하여 인생의 이정표를 제시합니다."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary CTA - 제3서 끝 */}
                  {!sajuResult.isPaid && (
                    <div className="w-full flex flex-col items-center mt-12 mb-8">
                      <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent mb-6" />
                      <button
                        onClick={handleBasicPayment}
                        className="text-amber-500/70 hover:text-amber-400 font-serif text-sm tracking-[0.15em] transition-colors duration-300 group"
                      >
                        <span className="border-b border-amber-600/30 group-hover:border-amber-500/50 pb-1">
                          봉인 해제하고 전문 열람하기 →
                        </span>
                      </button>
                      <p className="text-stone-600 text-xs mt-3 font-serif">7개 장의 상세 분석이 해금됩니다</p>
                    </div>
                  )}
                </div>
              )}

              {/* 페이지 번호 (Page 4) */}
              <div className="w-full flex justify-center items-center gap-3 pointer-events-none opacity-60 mt-12 mb-4">
                <div className="w-6 h-px bg-amber-600/30" />
                <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">4</span>
                <div className="w-6 h-px bg-amber-600/30" />
              </div>
            </div>
          </section>

          {/* Step 5: Celestial Bridge - 모든 기록의 끝에서 */}
          <section className="snap-section px-6 h-auto flex items-center justify-center" style={{ paddingTop: 'var(--safe-area-top)', minHeight: '100dvh' }}>
            <div className="flex flex-col items-center w-full max-w-sm reveal-item">
              <div className="flex flex-col items-center opacity-60">
                <p className="text-amber-600/80 text-lg font-serif italic text-center animate-fade-in tracking-[0.1em] leading-relaxed">
                  모든 기록의 끝에서,<br />
                  당신을 수호할 단 하나의 인연을 마주하십시오
                </p>
                <div className="w-px h-16 bg-gradient-to-b from-amber-600/60 to-transparent mt-8"></div>
              </div>
            </div>
          </section>




          {/* Step 6: The Final Guardian - 수호신령 */}
          <section className="snap-section px-6 pb-32 min-h-screen flex items-center justify-center" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="flex flex-col items-center py-12 w-full">

              <div className="p-6 pb-24 relative group w-full max-w-sm reveal-item">
                {/* 배경 효과 제거 */}

                <div className="relative z-10">
                  {/* ... Guardian Content ... */}

                  <div className="relative z-10">

                    <div className="flex flex-col items-center gap-8 mb-8 relative">
                      <div
                        className="perspective-1000 relative cursor-pointer"
                        onClick={() => {
                          if (!sajuResult.isPaid) {
                            setShowPurchaseSheet(true);
                            return;
                          }

                          if (!isTalismanFlipped) {
                            // [Seal -> Artwork]
                            setIsTalismanFlipped(true);
                            setTalismanViewMode('image');
                            if (!hasTalismanBeenRevealed) setHasTalismanBeenRevealed(true);
                          } else {
                            if (talismanViewMode === 'reason') {
                              // [Reason -> Artwork] (Stay flipped)
                              setTalismanViewMode('image');
                            } else {
                              // [Artwork -> Seal] (Unflip)
                              setIsTalismanFlipped(false);
                            }
                          }
                        }}
                      >
                        {/* [NEW] 처음 진입 시 안내 문구 */}
                        {sajuResult.isPaid && !hasTalismanBeenRevealed && (
                          <div className="absolute -top-12 left-0 right-0 text-center animate-bounce z-20">
                            <span className="text-amber-500/60 text-[10px] font-serif tracking-[0.2em] bg-amber-950/20 px-3 py-1 rounded-full border border-amber-900/20 backdrop-blur-sm">
                              카드를 터치하여 수호신을 마주하십시오
                            </span>
                          </div>
                        )}

                        <div className={!sajuResult.isPaid ? 'pointer-events-none' : ''}>
                          <TalismanCard
                            ref={talismanCardRef}
                            type={testTalismanKey || sajuResult.talisman?.name || "gapja"}
                            userName={userInfo?.name || '사용자'}
                            reason={sajuResult.talisman?.reason}
                            activeTab={talismanViewMode}
                            isFlipped={isTalismanFlipped} // 부모에서 제어
                            onClick={() => { }} // TalismanCard 내부 클릭 핸들러 무시 (부모 wrapper에서 처리)
                            isPurchased={isTalismanPurchased}
                            setIsPurchased={setIsTalismanPurchased}
                            talismanData={
                              testTalismanKey
                                ? talismanNames[testTalismanKey]
                                : ((sajuResult.talisman?.name && talismanNames[sajuResult.talisman.name])
                                  ? talismanNames[sajuResult.talisman.name]
                                  : talismanNames['갑자'])
                            }
                          />
                        </div>


                      </div>

                      {/* [NEW] 수호신 하단 가변형 토글 버튼 (중복 제거 및 미니멀리즘 반영) */}
                      {sajuResult.isPaid && isTalismanFlipped && (
                        <div className="flex items-center justify-center mt-2 animate-fade-in">
                          <button
                            onClick={() => {
                              const nextMode = talismanViewMode === 'image' ? 'reason' : 'image';
                              setTalismanViewMode(nextMode);
                              setIsTalismanFlipped(true); // 항상 리빌된 뒷면 상태 유지
                            }}
                            className="group relative px-8 py-2.5 flex items-center gap-3 transition-all duration-500 overflow-hidden"
                          >
                            {/* Button Background - Glassmorphism Seal Style */}
                            <div className="absolute inset-0 bg-amber-900/10 backdrop-blur-sm border border-amber-600/20 rounded-full group-hover:bg-amber-900/20 group-hover:border-amber-600/40 transition-all duration-500" />

                            <span className="relative text-[11px] font-serif tracking-[0.3em] text-amber-600/80 group-hover:text-amber-500 transition-colors duration-500">
                              {talismanViewMode === 'image' ? (
                                '선정비책 보기'
                              ) : (
                                '수호신령 보기'
                              )}
                            </span>

                            {/* Decorative Dots */}
                            <div className="relative w-1.5 h-1.5 rounded-full bg-amber-600/40 group-hover:bg-amber-500 transition-colors" />
                          </button>
                        </div>
                      )}
                    </div>


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


              </div>
            </div>
          </section>
        </main >

        {/* --- Modals & Overlays (Outside main for focus) --- */}

        {/* Talisman Selector Modal (Tech Demo / Test) */}
        {
          showTalismanSelector && (
            <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-2 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#1a1a1c] w-full max-w-4xl rounded-xl border border-amber-900/40 shadow-2xl flex flex-col max-h-[95vh] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="p-5 border-b border-amber-900/30 flex justify-between items-center bg-[#202022] relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📜</span>
                    <h3 className="font-bold text-[#e8dac0] font-serif text-xl tracking-wide">60갑자 수호신 도감</h3>
                  </div>
                  <button onClick={() => setShowTalismanSelector(false)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-white/10 flex items-center justify-center text-stone-500"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 relative z-10 custom-scrollbar">
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {Object.keys(talismanNames).map((key) => {
                      const gan = key[0];
                      const { color } = getGanColor(gan);
                      return (
                        <button key={key} onClick={() => { setTestTalismanKey(key); setShowTalismanSelector(false); }} className="p-2 border border-white/5 bg-[#252528] rounded hover:border-amber-500/50 transition-all">
                          <span className={`text-[10px] font-serif ${color}`}>{key}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* PDF Preview Modal */}
        {
          showPdfPreview && pdfPreviewUrl && (
            <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
              <div className="bg-[#1a1a1c] w-full max-w-lg rounded-lg overflow-hidden h-[80vh] flex flex-col border border-amber-900/30 shadow-2xl">
                <div className="p-4 border-b border-amber-900/30 flex justify-between items-center bg-[#252528]">
                  <h3 className="font-bold text-[#e8dac0] font-serif">미리보기</h3>
                  <button onClick={handleClosePdfPreview} className="text-stone-500 hover:text-[#e8dac0]"><X /></button>
                </div>
                <div className="flex-1 overflow-auto bg-[#101012] p-4 flex justify-center relative">
                  <Document file={pdfPreviewUrl} loading={<div className="text-amber-700 font-serif blink">문서를 불러오는 중...</div>}>
                    <Page pageNumber={1} width={300} />
                  </Document>
                </div>
                <div className="p-4 bg-[#1a1a1c] border-t border-amber-900/30">
                  <button onClick={handlePdfPayment} className="w-full bg-[#3f2e18] hover:bg-[#4a361e] text-amber-100 py-3 rounded font-bold font-serif border border-amber-700/50 flex justify-center gap-2">
                    <span className="text-lg">🧧</span> 전체 결과 소장하기
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Floating Action Button (PDF) - 숨김 처리 (나중에 위치 결정 후 재활성화) */}

      </div >

      {/* Purchase Bottom Sheet */}
      {
        showPurchaseSheet && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 z-50 transition-opacity"
              onClick={() => setShowPurchaseSheet(false)}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
              <div className="bg-[#111113] border-t border-amber-900/30 rounded-t-3xl p-6 pb-10 max-w-lg mx-auto">
                {/* Handle */}
                <div className="w-16 h-px bg-amber-700/40 mx-auto mb-8" />

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-amber-500 font-serif text-xl font-bold tracking-[0.1em] mb-6 italic">
                    인연의 문이 닫혀 있습니다
                  </h3>
                  <p className="text-stone-400 font-serif leading-relaxed mb-8">
                    天命錄을 발간하여<br />
                    당신만의 수호신을 확인하세요
                  </p>

                  {/* CTA Button */}
                  <button
                    onClick={() => {
                      setShowPurchaseSheet(false);
                      handleBasicPayment();
                    }}
                    className="w-full relative group overflow-hidden py-5 border-2 border-amber-700/60 hover:border-amber-600/80 transition-colors"
                  >
                    {/* Background */}
                    <div className="absolute inset-0 bg-[#111113]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent" />

                    {/* Content */}
                    <div className="relative flex items-center justify-center gap-4 text-amber-600 font-serif font-bold tracking-[0.3em]">
                      <div className="w-8 h-px bg-amber-700/50" />
                      <span>天 命 錄   발 간 하 기</span>
                      <div className="w-8 h-px bg-amber-700/50" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )
      }

      {/* 오행 정보 모달 (Five Elements Info Modal) */}
      {
        showOhengInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowOhengInfo(false)} />
            <div className="relative w-full max-w-md bg-[#050505] border border-amber-800/30 shadow-2xl animate-fade-in">
              {/* 장식용 코너 */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-600/50" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-600/50" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-600/50" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-600/50" />

              <div className="text-center">
                {/* 제목 */}
                <div className="py-6 border-b border-amber-800/20">
                  <h3 className="text-lg font-serif text-amber-500 tracking-[0.3em] font-bold">
                    五行의 순환
                  </h3>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-stone-800">
                  <button
                    onClick={() => setOhengTab('sangseong')}
                    className={`flex-1 py-3 text-sm font-medium tracking-wide transition-colors ${ohengTab === 'sangseong'
                      ? 'text-amber-400 bg-amber-900/20 border-b-2 border-amber-500'
                      : 'text-stone-500 hover:text-stone-300'
                      }`}
                  >
                    相生 (상생)
                  </button>
                  <button
                    onClick={() => setOhengTab('sanggeuk')}
                    className={`flex-1 py-3 text-sm font-medium tracking-wide transition-colors ${ohengTab === 'sanggeuk'
                      ? 'text-stone-300 bg-stone-900/30 border-b-2 border-stone-500'
                      : 'text-stone-500 hover:text-stone-300'
                      }`}
                  >
                    相剋 (상극)
                  </button>
                </div>

                {/* 컨텐츠 */}
                <div className="p-8 min-h-[280px] flex flex-col items-center justify-center">
                  {ohengTab === 'sangseong' ? (
                    <div className="space-y-5 animate-fade-in">
                      {/* 한자 순환 - 작은 화살표로 연결 */}
                      <div className="text-center">
                        <p className="text-lg font-bold leading-relaxed flex items-center justify-center gap-1">
                          <span className="tracking-wider" style={{ color: '#059669' }}>木</span>
                          <span className="text-xs text-amber-600/40">→</span>
                          <span className="tracking-wider" style={{ color: '#e11d48' }}>火</span>
                          <span className="text-xs text-amber-600/40">→</span>
                          <span className="tracking-wider" style={{ color: '#d97706' }}>土</span>
                          <span className="text-xs text-amber-600/40">→</span>
                          <span className="tracking-wider" style={{ color: '#d6d3d1' }}>金</span>
                          <span className="text-xs text-amber-600/40">→</span>
                          <span className="tracking-wider" style={{ color: '#94a3b8' }}>水</span>
                        </p>
                        <p className="text-[10px] text-stone-500/60 mt-2 tracking-wider">
                          목 화 토 금 수
                        </p>
                      </div>

                      {/* 예시 문장 */}
                      <p className="text-xs text-stone-400 leading-relaxed px-4">
                        <span className="text-amber-500/70">"나무가 불을 피우고, 재가 흙이 되는 이치"</span><br />
                        서로를 돕고 키워주는 황금 궤도의 흐름입니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5 animate-fade-in">
                      {/* 한자 제어 관계 - 화살표 + 슬래시로 구분 */}
                      <div className="text-center space-y-2">
                        <p className="text-base font-bold leading-relaxed flex items-center justify-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span style={{ color: '#94a3b8' }}>水</span>
                            <span className="text-xs text-stone-600/40">→</span>
                            <span style={{ color: '#e11d48' }}>火</span>
                          </span>
                          <span className="text-stone-600/60">/</span>
                          <span className="flex items-center gap-1">
                            <span style={{ color: '#e11d48' }}>火</span>
                            <span className="text-xs text-stone-600/40">→</span>
                            <span style={{ color: '#d6d3d1' }}>金</span>
                          </span>
                          <span className="text-stone-600/60">/</span>
                          <span className="flex items-center gap-1">
                            <span style={{ color: '#d6d3d1' }}>金</span>
                            <span className="text-xs text-stone-600/40">→</span>
                            <span style={{ color: '#059669' }}>木</span>
                          </span>
                        </p>
                        <p className="text-base font-bold leading-relaxed flex items-center justify-center gap-2">
                          <span className="flex items-center gap-1">
                            <span style={{ color: '#059669' }}>木</span>
                            <span className="text-xs text-stone-600/40">→</span>
                            <span style={{ color: '#d97706' }}>土</span>
                          </span>
                          <span className="text-stone-600/60">/</span>
                          <span className="flex items-center gap-1">
                            <span style={{ color: '#d97706' }}>土</span>
                            <span className="text-xs text-stone-600/40">→</span>
                            <span style={{ color: '#94a3b8' }}>水</span>
                          </span>
                        </p>
                        <p className="text-[10px] text-stone-500/50 mt-2 tracking-wider">
                          물이 불을 제압, 불이 쇠를 제압...
                        </p>
                      </div>

                      {/* 예시 문장 */}
                      <p className="text-xs text-stone-400 leading-relaxed px-4">
                        <span className="text-stone-500/70">"물이 불을 끄거나, 쇠가 나무를 다듬는 것"</span><br />
                        서로를 제어하고 균형 잡는 별 모양의 힘입니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowOhengInfo(false)}
                className="absolute top-4 right-4 text-stone-600 hover:text-stone-300 p-2 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default ResultPage;
