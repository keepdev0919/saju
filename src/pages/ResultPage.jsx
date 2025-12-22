/**
 * 결과 조회 페이지 (Result Page 2.0)
 * 사용자에게 강렬한 첫인상(Aggro)과 데이터 시각화, 구체적 솔루션을 제공하는 업그레이드 버전
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSajuResult, verifyUser, createPayment, verifyPayment, generatePDF, getPdfDownloadUrl, checkPdfPayment } from '../utils/api';
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
  '을': { hanja: '乙', desc: '바람에 흔들려도 꺾이지 않는 꽃' },
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

// 오행이 강한/약한 원인을 8자에서 찾는 함수 (구조적 설명만)
const analyzeElementSource = (element, ohengValue, sajuData) => {
  if (!sajuData) return { reasons: [] };
  
  const reasons = [];
  const sources = [];
  
  // 1. 천간에서 찾기
  const gans = [
    { gan: sajuData.year?.gan, pillar: '년주', meaning: '조상' },
    { gan: sajuData.month?.gan, pillar: '월주', meaning: '부모/사회' },
    { gan: sajuData.day?.gan, pillar: '일주', meaning: '나' },
    { gan: sajuData.hour?.gan, pillar: '시주', meaning: '자식/말년' }
  ];
  
  gans.forEach(({ gan, pillar, meaning }) => {
    if (gan && getElementFromGan(gan) === element) {
      sources.push({ type: 'gan', pillar, gan });
      if (pillar === '일주') {
        reasons.push(`일간(日干)이 ${element} 기운이어서 근본 기운이 강하게 발현됩니다.`);
      } else {
        reasons.push(`${pillar}의 천간에 ${element} 기운이 있습니다.`);
      }
    }
  });
  
  // 2. 지지에서 찾기
  const jis = [
    { ji: sajuData.year?.ji, pillar: '년주', meaning: '조상' },
    { ji: sajuData.month?.ji, pillar: '월주', meaning: '부모/사회' },
    { ji: sajuData.day?.ji, pillar: '일주', meaning: '나' },
    { ji: sajuData.hour?.ji, pillar: '시주', meaning: '자식/말년' }
  ];
  
  jis.forEach(({ ji, pillar, meaning }) => {
    if (ji && getElementFromJi(ji) === element) {
      sources.push({ type: 'ji', pillar, ji });
      if (pillar === '월주') {
        reasons.push(`월지(月支)에 ${element} 기운이 있어 계절의 도움을 받고 있습니다.`);
      } else {
        reasons.push(`${pillar}의 지지에 ${element} 기운이 있습니다.`);
      }
    }
  });
  
  // 3. 계절(득시) 확인
  const monthJi = sajuData.month?.ji;
  const seasonInfo = getSeasonInfo(monthJi);
  if (seasonInfo && seasonInfo.element === element && ohengValue >= 20) {
    reasons.push(`${seasonInfo.season}에 태어나 ${element} 기운이 계절의 도움을 받고 있습니다.`);
  }
  
  // 4. 통근 확인 (일간과 같은 오행이 지지에 있는지)
  const dayMaster = sajuData.day?.gan;
  const dayMasterElement = getElementFromGan(dayMaster);
  if (dayMasterElement === element) {
    const hasTonggen = jis.some(({ ji }) => ji && getElementFromJi(ji) === element);
    if (hasTonggen) {
      reasons.push(`일간 ${element} 기운이 지지에 뿌리를 내려 실질적인 힘이 강합니다.`);
    }
  }
  
  return {
    element,
    value: ohengValue,
    sources,
    reasons: reasons.length > 0 ? reasons : [`${element} 기운이 지장간(地藏干)에 숨어 있거나 다른 경로로 작용하고 있습니다.`]
  };
};

// 일간과 오행의 관계 해석 (구조적 설명만)
const analyzeDayMasterRelation = (dayMaster, element, ohengValue) => {
  if (!dayMaster) return null;
  
  const dayMasterElement = getElementFromGan(dayMaster);
  if (!dayMasterElement) return null;
  
  if (dayMasterElement === element) {
    // 일간과 같은 오행
    if (ohengValue >= 30) {
      return `일간(日干)이 ${element} 기운인데 ${element} 기운이 매우 강합니다. 근본 기운이 뚜렷하게 발현되는 구조입니다.`;
    } else if (ohengValue >= 20) {
      return `일간(日干)이 ${element} 기운이고 ${element} 기운이 적절합니다.`;
    } else {
      return `일간(日干)이 ${element} 기운인데 ${element} 기운이 상대적으로 약합니다. 같은 기운을 보강할 기회를 찾는 것이 도움이 될 수 있습니다.`;
    }
  } else {
    // 일간과 다른 오행 - 상극/상생 관계 확인
    if (상극관계[element] === dayMasterElement) {
      // 오행이 일간을 극함
      if (ohengValue >= 30) {
        return `${element} 기운이 강하여 일간 ${dayMasterElement} 기운을 극하는 구조입니다.`;
      }
    } else if (상극관계[dayMasterElement] === element) {
      // 일간이 오행을 극함
      if (ohengValue >= 30) {
        return `일간 ${dayMasterElement} 기운이 ${element} 기운을 제어하는 구조입니다.`;
      }
    } else if (상생관계[element] === dayMasterElement) {
      // 오행이 일간을 생함
      if (ohengValue >= 25) {
        return `${element} 기운이 강하여 일간 ${dayMasterElement} 기운을 도와주는 구조입니다.`;
      }
    } else if (상생관계[dayMasterElement] === element) {
      // 일간이 오행을 생함
      if (ohengValue >= 25) {
        return `일간 ${dayMasterElement} 기운이 ${element} 기운을 낳아주는 구조입니다.`;
      }
    }
  }
  
  return null; // 특별한 관계 없음
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

  const [showTechData, setShowTechData] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const entranceRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // entrance-section이 화면에 보이지 않을 때(isIntersecting이 false일 때) FAB 노출
        setShowFab(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

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

    if (entranceRef.current) {
      observer.observe(entranceRef.current);
    }

    const items = document.querySelectorAll('.reveal-item');
    items.forEach((item) => revealObserver.observe(item));

    return () => {
      observer.disconnect();
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
            </div>
            {/* 페이지 번호 (Page 1) */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-3 pointer-events-none z-10 opacity-60">
              <div className="w-6 h-px bg-amber-600/30" />
              <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">1</span>
              <div className="w-6 h-px bg-amber-600/30" />
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
          <section className="snap-section px-6" style={{ paddingTop: 'var(--safe-area-top)' }}>
            {console.log('[제2서 렌더링 시작]', { oheng: sajuResult?.oheng, sajuData: sajuResult?.sajuData })}
            <div className="flex-1 flex flex-col items-center py-12">
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
              <div className="w-full max-w-xs relative reveal-item delay-100 min-h-[300px] flex items-center justify-center">
                <div className="relative flex flex-col items-center">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] bg-amber-800/10 blur-[80px] rounded-full"></div>

                  <svg width="260" height="260" viewBox="0 0 120 120" className="overflow-visible relative z-10 scale-110 sm:scale-125">
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
                    </defs>

                    {[15, 30, 45].map((r, i) => (
                      <circle key={i} cx="60" cy="60" r={r} fill="none" stroke="rgba(217, 119, 6, 0.1)" strokeWidth="0.2" />
                    ))}

                    {[0, 72, 144, 216, 288].map((angle, i) => {
                      const rad = (angle - 90) * (Math.PI / 180);
                      return (
                        <line key={i} x1="60" y1="60" x2={60 + 45 * Math.cos(rad)} y2={60 + 45 * Math.sin(rad)} stroke="rgba(217, 119, 6, 0.1)" strokeWidth="0.3" />
                      );
                    })}

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
              </div>

              {/* 스크롤 안내 (천상기록보관소와 통일) */}
            </div>

            {/* 페이지 번호 (Page 2) */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-3 pointer-events-none z-10 opacity-60">
              <div className="w-6 h-px bg-amber-600/30" />
              <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">2</span>
              <div className="w-6 h-px bg-amber-600/30" />
            </div>
          </section>

          {/* Step 3-B: 오행 해석 페이지 */}
          <section className="snap-section px-6 pb-12" style={{ paddingTop: 'var(--safe-area-top)' }}>
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

                // 구조적 분석 (8자-오행 연결)
                const strongestAnalysis = analyzeElementSource(strongest, maxVal, sajuResult?.sajuData);
                const weakestAnalysis = analyzeElementSource(weakest, minVal, sajuResult?.sajuData);
                const dayMasterRelationStrongest = analyzeDayMasterRelation(
                  sajuResult?.sajuData?.day?.gan,
                  strongest,
                  maxVal
                );
                const dayMasterRelationWeakest = analyzeDayMasterRelation(
                  sajuResult?.sajuData?.day?.gan,
                  weakest,
                  minVal
                );

                return (
                  <div className="flex-1 flex flex-col items-center justify-start py-12">
                    {/* 오행 미니 바 */}
                    <div className="w-full max-w-sm mb-8 reveal-item">
                      <div className="flex justify-between items-center px-2 py-3 bg-[#1a1a1c]/50 rounded border border-amber-900/10">
                        {elements.map(el => {
                          const val = Math.round(ohengData[el] || 0);
                          const isMax = el === strongest;
                          const isMin = el === weakest;
                          return (
                            <div key={el} className="flex flex-col items-center">
                              <span className={`text-xs font-bold font-serif`} style={{ color: isMax ? '#f59e0b' : isMin ? '#57534e' : elementColorMap[el] }}>
                                {ohengLabels[el]}
                              </span>
                              <span className={`text-[10px] font-mono mt-0.5 ${isMax ? 'text-amber-500' : isMin ? 'text-stone-600' : 'text-stone-400'}`}>
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
                        <div className="p-4 bg-[#1a1a1c]/30 rounded border-l-2 border-amber-600/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-amber-500 font-bold font-serif">{ohengLabels[strongest]}</span>
                            <span className="text-stone-500 text-xs">({Math.round(maxVal)}%) - 가장 두드러진 기운</span>
                          </div>
                          
                          {/* 구조적 설명 (8자-오행 연결) */}
                          {strongestAnalysis.reasons.length > 0 && (
                            <div className="mb-3 space-y-1">
                              {strongestAnalysis.reasons.map((reason, idx) => (
                                <p key={idx} className="text-stone-400 text-[11px] font-serif leading-relaxed">
                                  {reason}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* 일간-오행 관계 */}
                          {dayMasterRelationStrongest && (
                            <p className="text-amber-400/80 text-[11px] font-serif leading-relaxed italic mb-3">
                              {dayMasterRelationStrongest}
                            </p>
                          )}
                          
                          {/* 일반적 특성 */}
                          <p className="text-stone-300 text-[13px] font-serif leading-relaxed">
                            {강할때특성[strongest]}
                          </p>
                        </div>

                        {/* 최약 기운 */}
                        <div className="p-4 bg-[#1a1a1c]/30 rounded border-l-2 border-stone-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-stone-500 font-bold font-serif">{ohengLabels[weakest]}</span>
                            <span className="text-stone-600 text-xs">({Math.round(minVal)}%) - 상대적으로 여린 기운</span>
                          </div>
                          
                          {/* 구조적 설명 (8자-오행 연결) */}
                          {weakestAnalysis.reasons.length > 0 && (
                            <div className="mb-3 space-y-1">
                              {weakestAnalysis.reasons.map((reason, idx) => (
                                <p key={idx} className="text-stone-500 text-[11px] font-serif leading-relaxed">
                                  {reason}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* 일간-오행 관계 */}
                          {dayMasterRelationWeakest && (
                            <p className="text-stone-400/80 text-[11px] font-serif leading-relaxed italic mb-3">
                              {dayMasterRelationWeakest}
                            </p>
                          )}
                          
                          {/* 일반적 특성 */}
                          <p className="text-stone-400 text-[13px] font-serif leading-relaxed">
                            {약할때특성[weakest]}
                          </p>
                        </div>

                        {/* 상생/상극 관계 */}
                        <div className="pt-4 border-t border-amber-900/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-stone-500 text-xs font-serif">🔗 기운의 관계</span>
                          </div>
                          <p className="text-stone-400 text-[12px] font-serif leading-relaxed italic">
                            {relationText}
                          </p>
                        </div>

                        {/* 안내 문구 */}
                        <div className="pt-4 border-t border-amber-900/10">
                          <p className="text-stone-500 text-[10px] font-serif text-center leading-relaxed italic">
                            이 정보는 사주팔자의 구조적 분석입니다.<br />
                            오행의 의미와 운세 해석은 제3서 천개의 비밀에서 확인하실 수 있습니다.
                          </p>
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
            {/* 페이지 번호 (Page 3) */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-3 pointer-events-none z-10 opacity-60">
              <div className="w-6 h-px bg-amber-600/30" />
              <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">3</span>
              <div className="w-6 h-px bg-amber-600/30" />
            </div>
          </section>

          {/* 중간 힌트 (Sub CTA) */}
          {
            !sajuResult.isPaid && (
              <div className="flex justify-center pb-8">
                <button
                  onClick={handleBasicPayment}
                  className="text-amber-600/70 hover:text-amber-500 font-serif text-sm tracking-wider transition-colors flex items-center gap-2"
                >
                  <Lock size={14} />
                  <span>봉인된 천기(天機)를 지금 바로 확인하기</span>
                </button>
              </div>
            )
          }

          {/* Step 4: The Sealed Archive - 제 3권: 천개의 비밀 */}
          <section className="snap-section px-6 h-auto pb-20" style={{ paddingTop: 'var(--safe-area-top)' }}>
            {/* Chapter 3 Heading */}
            <div className="pt-12 mb-10 z-10 relative reveal-item max-w-sm mx-auto">
              <div className="flex items-center justify-center gap-4 mb-3 border-b border-amber-900/20 pb-4">
                <div className="w-4 h-px bg-amber-600/30" />
                <h3 className="text-sm font-bold text-[#e8dac0] sm:tracking-[0.3em] tracking-[0.1em] font-serif uppercase whitespace-nowrap">
                  제3서 : 천개의 비밀 (天機錄)
                </h3>
                <div className="w-4 h-px bg-amber-600/30" />
              </div>
            </div>

            {/* Content Chapters */}
            <div className="flex-1 flex flex-col justify-center z-10 relative space-y-12 max-w-sm mx-auto py-10">
              {/* Chapter 1: 명(命) */}
              <div className="relative reveal-item">
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
                </div>
              </div>

              {/* Chapter 2: 업(業) */}
              <div className="relative reveal-item">
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

              {/* Chapter 3: 연(緣) */}
              <div className="relative reveal-item">
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

              {/* Chapter 4: 운(運) */}
              <div className="relative reveal-item">
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

              {/* Chapter 5: 비기(秘記) */}
              <div className="relative reveal-item">
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

              {/* Celestial Bridge */}
              <div className="flex flex-col items-center pt-8 pb-4 opacity-60">
                {sajuResult.isPaid && (
                  <p className="mb-10 text-amber-600/80 text-lg font-serif italic text-center animate-fade-in tracking-[0.1em] leading-relaxed">
                    모든 기록의 끝에서,<br />
                    당신을 수호할 단 하나의 인연을 마주하십시오
                  </p>
                )}
                <div className="w-px h-16 bg-gradient-to-b from-amber-600/60 to-transparent"></div>
              </div>
            </div>
            {/* 페이지 번호 (Page 4) */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-3 pointer-events-none z-10 opacity-60">
              <div className="w-6 h-px bg-amber-600/30" />
              <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">4</span>
              <div className="w-6 h-px bg-amber-600/30" />
            </div>
          </section>




          {/* Step 5: The Final Guardian - 수호신령 */}
          <section className="snap-section px-6 pb-32" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="flex-1 flex flex-col items-center py-12 reveal-item">

              <div className="p-6 pb-24 relative overflow-hidden group w-full max-w-sm">
                {/* 배경 효과 제거 */}

                <div className="relative z-10">
                  {/* ... Guardian Content ... */}

                  <div className="relative z-10">

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

                {/* 마지막 섹션 인라인 CTA */}
                {!sajuResult.isPaid && (
                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={handleBasicPayment}
                      className="group relative w-full max-w-[320px] overflow-hidden rounded py-5 shadow-2xl transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900" />
                      <div className="relative flex items-center justify-center gap-4 text-amber-100 font-serif text-lg font-bold tracking-[0.3em]">
                        <span>천기(天機) 열람하기</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* 페이지 번호 (Page 5) */}
            <div className="absolute bottom-8 left-0 w-full flex justify-center items-center gap-3 pointer-events-none z-10 opacity-60">
              <div className="w-6 h-px bg-amber-600/30" />
              <span className="text-[#e8dac0] text-[10px] font-serif tracking-[0.2em]">5</span>
              <div className="w-6 h-px bg-amber-600/30" />
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
        {/* FAB는 인라인 CTA로 대체되어 숨김 처리됨 */}
        {
          false && showFab && (
            <div className="fixed bottom-6 left-0 w-full flex justify-center z-40 pointer-events-none animate-fade-in">
              <div className="w-full max-w-[480px] px-6 pointer-events-auto">
                {sajuResult.isPaid ? (
                  <div className="flex gap-2">
                    <button onClick={handlePdfPreview} className="flex-1 bg-[#2a2a2c] text-stone-300 py-4 rounded font-bold border border-amber-900/30 flex items-center justify-center gap-2 font-serif"><Eye size={18} /> 미리보기</button>
                    <button onClick={handlePdfPayment} className="flex-[2] bg-[#3f2e18] text-amber-100 py-4 rounded font-bold border border-amber-700/50 flex items-center justify-center gap-2 font-serif"><Download size={18} /> <span>영구 소장하기</span></button>
                  </div>
                ) : (
                  <button onClick={handleBasicPayment} className="group relative w-full overflow-hidden rounded py-5 shadow-2xl transition-all">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900" />
                    <div className="relative flex items-center justify-center gap-4 text-amber-100 font-serif text-lg font-bold tracking-[0.3em]">
                      <span>천기(天機) 열람하기</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )
        }

      </div >
    </div >
  );
};

export default ResultPage;
