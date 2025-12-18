import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Download, ChevronRight, CheckCircle, Smartphone, User, Star, RefreshCw, Sparkles, Moon, Scroll, Hand, ArrowRight, Timer, Eye, X, Lock } from 'lucide-react';
import { createUser, createPayment, verifyPayment, calculateSaju, getSajuResult } from '../utils/api';

/**
 * 사주 시간대 데이터
 * 각 시간대(시신)에 해당하는 범위와 표시 라벨을 정의
 */
const SAJU_TIMES = [
  { id: 'joja', label: '조자/朝子', range: '00:00~01:29', value: '00:30' },
  { id: 'chuk', label: '축/丑', range: '01:30~03:29', value: '02:30' },
  { id: 'in', label: '인/寅', range: '03:30~05:29', value: '04:30' },
  { id: 'myo', label: '묘/卯', range: '05:30~07:29', value: '06:30' },
  { id: 'jin', label: '진/辰', range: '07:30~09:29', value: '08:30' },
  { id: 'sa', label: '사/巳', range: '09:30~11:29', value: '10:30' },
  { id: 'o', label: '오/午', range: '11:30~13:29', value: '12:30' },
  { id: 'mi', label: '미/未', range: '13:30~15:29', value: '14:30' },
  { id: 'shin', label: '신/申', range: '15:30~17:29', value: '16:30' },
  { id: 'yu', label: '유/酉', range: '17:30~19:29', value: '18:30' },
  { id: 'sul', label: '술/戌', range: '19:30~21:29', value: '20:30' },
  { id: 'hae', label: '해/亥', range: '21:30~23:29', value: '22:30' },
  { id: 'yaja', label: '야자/夜子', range: '23:30~23:59', value: '23:45' },
];

/**
 * 사주 앱 메인 컴포넌트
 * 랜딩 → 정보입력 → 결제 → 분석중 → 결과 순서로 진행되는 다단계 앱
 */
const SajuApp = () => {
  const navigate = useNavigate();
  
  // 현재 화면 단계 상태 (landing, input, payment, analyzing, result)
  const [step, setStep] = useState('landing');
  
  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    name: '',
    gender: 'male',
    birthDate: '',
    birthTime: '', // HH:MM 형식 (내부 로직용)
    birthTimeLabel: '', // UI 표시용 (예: 축시 01:30~03:29)
    timeUnknown: false,
    calendarType: 'solar', // 'solar' 또는 'lunar'
    isLeap: false, // 음력일 때 윤달 여부
    phone: '', // 휴대폰 번호
    userId: null, // 백엔드에서 받은 사용자 ID
    accessToken: null // 결과 페이지 접근용 토큰
  });
  
  // 사주 결과 상태
  const [sajuResult, setSajuResult] = useState(null);
  
  // 로딩 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 분석 진행률 상태
  const [progress, setProgress] = useState(0);

  // 터치/마우스 위치 추적을 위한 상태 (모바일 인터랙티브용)
  const [interactionPos, setInteractionPos] = useState({ x: 50, y: 50 });
  const [isInteracting, setIsInteracting] = useState(false);
  
  // 시간 선택 모달 표시 여부
  const [showTimeModal, setShowTimeModal] = useState(false);
  
  // 현재 수정 중인 필드 ('phone' | 'birthDate' | null)
  const [editingField, setEditingField] = useState(null);
  
  // 결제 수단 선택 상태 (기본값: 카드/간편결제)
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  // 타이머 상태 관리 (1/100초 단위: 59분 59초 99)
  const INITIAL_TIME_CS = (59 * 60 + 59) * 100 + 99;
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_CS);
  
  /**
   * 모바일 뷰포트 높이 처리를 위한 효과
   * CSS 변수 --vh를 설정하여 모바일에서 100vh 문제 해결
   */
  useEffect(() => {
    const handleResize = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  /**
   * 타이머 카운트다운 효과 (10ms 단위)
   * 긴박감을 주기 위한 마케팅용 타이머
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          return INITIAL_TIME_CS; // 0이 되면 다시 초기화 (무한 루프)
        }
        return prev - 1; // 10ms마다 1씩 감소
      });
    }, 10); 
    return () => clearInterval(timer);
  }, []);

  /**
   * 전화번호 유효성 검사 (010-XXXX-XXXX 형식)
   */
  const isPhoneValid = (phone) => {
    const regex = /^010-\d{4}-\d{4}$/;
    return regex.test(phone);
  };

  /**
   * 생년월일 유효성 검사
   * 1. 미래 날짜 불가 (연도 숫자 비교로 정확도 향상)
   * 2. 1900년 이전 불가
   * 3. 연도는 반드시 4자리여야 함
   */
  const isBirthDateValid = (date) => {
    if (!date) return false;
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const [year, month, day] = date.split('-').map(Number);

    // 연도 길이 및 범위 체크
    if (year < 1900 || year > todayYear || String(year).length !== 4) return false;

    // 미래 날짜 정밀 체크 (연도가 올해인 경우 월, 일 비교)
    if (year === todayYear) {
      if (month > todayMonth) return false;
      if (month === todayMonth && day > todayDay) return false;
    }

    return true;
  };

  /**
   * 생년월일 에러 메시지 반환
   */
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
  
  /**
   * 시간 포맷팅 함수
   * @param {number} centiseconds - 1/100초 단위의 시간
   * @returns {string} MM:SS:CS 형식의 문자열
   */
  const formatTime = (centiseconds) => {
    const totalSeconds = Math.floor(centiseconds / 100);
    const cs = centiseconds % 100;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
  };

  /**
   * 전화번호 자동 하이픈 포매팅 함수
   * @param {string} value - 입력된 숫자 문자열
   * @returns {string} 하이픈이 포함된 포맷팅된 문자열
   */
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, ''); // 숫자 외 제거
    const phoneNumberLength = phoneNumber.length;

    if (phoneNumberLength <= 3) return phoneNumber;
    if (phoneNumberLength <= 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    }
    // 010-XXXX-XXXX (총 11자리)
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7, 11)}`;
  };
  
  /**
   * 입력 필드 변경 핸들러
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // 전화번호 필드일 경우 포매팅 적용
    if (name === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      setUserInfo(prev => ({ ...prev, [name]: formattedValue }));
    } else {
    setUserInfo(prev => ({ ...prev, [name]: value }));
    }
  };
  
  /**
   * 시간 선택 핸들러 (모달에서 호출)
   * @param {object|null} timeSlot - 선택된 시간대 객체 또는 null(모름)
   */
  const handleTimeSelect = (timeSlot) => {
    if (timeSlot === null) {
      // 모름 선택 시
      setUserInfo(prev => ({
        ...prev,
        timeUnknown: true,
        birthTime: '',
        birthTimeLabel: '모름'
      }));
    } else {
      // 시간대 선택 시
      setUserInfo(prev => ({
        ...prev,
        timeUnknown: false,
        birthTime: timeSlot.value,
        birthTimeLabel: `${timeSlot.label} (${timeSlot.range})`
      }));
    }
    setShowTimeModal(false);
  };
  
  /**
   * 날짜 포맷팅 함수
   * @param {string} dateString - YYYY-MM-DD 형식의 날짜
   * @returns {string} YYYY년 M월 D일 형식의 문자열
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  };
  
  /**
   * 포트원 결제 처리 함수
   * 포트원 결제 위젯을 호출하고 결제 완료 후 사주 계산을 진행
   */
  const handlePortonePayment = async (paymentMethod) => {
    if (!userInfo.userId) {
      setError('사용자 정보가 없습니다. 다시 시도해주세요.');
      return;
    }

    // 포트원 스크립트가 로드되었는지 확인
    if (typeof window.IMP === 'undefined') {
      setError('결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      // 결제 금액 설정 (환경 변수 또는 기본값)
      const paymentAmount = parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_BASIC || '100', 10);

      // 1. 결제 요청 생성 (백엔드에서 merchant_uid 받기)
      const paymentResponse = await createPayment({
        accessToken: userInfo.accessToken,
        amount: paymentAmount,
        productType: 'basic'
      });

      const { merchantUid } = paymentResponse;

      // 2. 포트원 초기화
      const IMP = window.IMP;
      const IMP_KEY = import.meta.env.VITE_PORTONE_IMP_KEY || 'imp12345678'; // 테스트용 기본값
      
      IMP.init(IMP_KEY);

      // 3. 결제 요청
      // V1 API 사용 시 store_id는 필요 없음 (포트원 SDK가 자동으로 추가하지만 무시됨)
      IMP.request_pay({
        pg: paymentMethod === 'kakaopay' ? 'kakaopay' : 
            paymentMethod === 'naverpay' ? 'naverpay' : 
            paymentMethod === 'card' ? 'html5_inicis' : 
            'html5_inicis', // 기본값: 카드결제
        pay_method: paymentMethod === 'kakaopay' ? 'kakaopay' : 
                    paymentMethod === 'naverpay' ? 'naverpay' : 
                    paymentMethod === 'trans' ? 'trans' : 
                    'card',
        merchant_uid: merchantUid,
        name: '2026 프리미엄 운세 리포트',
        amount: paymentAmount,
        buyer_name: userInfo.name,
        buyer_tel: userInfo.phone,
        m_redirect_url: `${window.location.origin}/payment/callback`
      }, async (rsp) => {
        // 결제 완료 콜백
        console.log('💳 포트원 결제 응답:', rsp);
        
        if (rsp.success) {
          console.log('✅ 결제 성공, 처리 시작');
          // 결제 성공 시 분석 시작
          await processPaymentSuccess(rsp.imp_uid, merchantUid);
        } else {
          // 결제 실패
          console.error('❌ 결제 실패:', rsp.error_msg);
          setError(rsp.error_msg || '결제에 실패했습니다.');
          setStep('payment');
          setLoading(false);
        }
      });

    } catch (err) {
      console.error('결제 요청 오류:', err);
      setError(err.message || '결제 요청에 실패했습니다.');
      setStep('payment');
      setLoading(false);
    }
  };

  /**
   * 결제 성공 후 처리 함수
   * 결제 검증 및 사주 계산을 수행
   */
  const processPaymentSuccess = async (impUid, merchantUid) => {
    setStep('analyzing');
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      console.log('🔍 결제 검증 시작:', { impUid, merchantUid });

      // 프로그레스 바 애니메이션 (결제 검증 중)
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 10;
        if (currentProgress > 30) {
          currentProgress = 30;
          clearInterval(progressInterval);
        }
        setProgress(currentProgress);
      }, 200);

      // 1. 결제 검증
      const verifyResponse = await verifyPayment({
        imp_uid: impUid,
        merchant_uid: merchantUid
      });

      console.log('✅ 결제 검증 완료:', verifyResponse);

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.error || '결제 검증에 실패했습니다.');
      }

      // accessToken 확인
      const accessToken = verifyResponse.accessToken || userInfo.accessToken;
      if (!accessToken) {
        console.error('❌ accessToken이 없습니다:', { verifyResponse, userInfo });
        throw new Error('접근 토큰을 받을 수 없습니다. 다시 시도해주세요.');
      }

      // 프로그레스 바 계속 진행 (사주 계산 중)
      currentProgress = 30;
      const calcInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) {
          currentProgress = 90;
          clearInterval(calcInterval);
        }
        setProgress(currentProgress);
      }, 300);

      console.log('🔮 사주 계산 시작:', {
        accessToken: accessToken.substring(0, 10) + '...',
        birthDate: userInfo.birthDate,
        birthTime: userInfo.timeUnknown ? null : userInfo.birthTime,
        calendarType: userInfo.calendarType,
        isLeap: userInfo.isLeap
      });

      // 2. 사주 계산
      const sajuResponse = await calculateSaju({
        accessToken: accessToken,
        birthDate: userInfo.birthDate,
        birthTime: userInfo.timeUnknown ? null : userInfo.birthTime,
        calendarType: userInfo.calendarType,
        isLeap: userInfo.isLeap
      });

      console.log('✅ 사주 계산 완료:', sajuResponse);

      // 프로그레스 바 완료
      setProgress(100);

      // 3. 사주 결과 저장
      setSajuResult(sajuResponse.result);

      // accessToken 업데이트
      if (verifyResponse.accessToken) {
        setUserInfo(prev => ({ ...prev, accessToken: verifyResponse.accessToken }));
      }

      // 결과 페이지로 이동 (토큰을 URL에 포함)
      console.log('🚀 결과 페이지로 이동:', { token: accessToken });
      setTimeout(() => {
        navigate(`/result/${accessToken}`);
        setLoading(false);
      }, 800);

    } catch (err) {
      console.error('❌ 결제 후 처리 오류:', {
        error: err,
        message: err.message,
        response: err.response,
        status: err.status,
        code: err.code
      });

      // 타임아웃 에러 구분
      let errorMessage;
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = '요청 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else {
        errorMessage = '결제 후 처리에 실패했습니다. 잠시 후 다시 시도해주세요.';
      }

      setError(errorMessage);
      setLoading(false);
      setProgress(0);
      
      // 에러 메시지를 5초간 표시한 후 결제 페이지로 이동
      setTimeout(() => {
        setStep('payment');
      }, 5000);
    }
  };

  /**
   * 분석 시작 함수 (기존 호환성 유지)
   * 결제 처리 및 사주 계산을 수행
   * 현재는 카드/간편결제만 실제 결제 진행
   */
  const startAnalysis = async (paymentMethod = 'card') => {
    // 네이버페이, 카카오페이, 계좌이체는 아직 미구현
    if (paymentMethod === 'naverpay' || paymentMethod === 'kakaopay' || paymentMethod === 'trans') {
      setError('해당 결제 수단은 준비 중입니다. 카드/간편결제를 이용해주세요.');
      return;
    }
    
    // 카드/간편결제만 실제 결제 진행
    await handlePortonePayment(paymentMethod);
  };
  
  /**
   * PDF 다운로드 핸들러 (브라우저 프린트 기능 사용)
   */
  const handleDownloadPDF = () => {
    window.print();
  };
  
  // 바이럴 마케팅 스타일 폰트 클래스 (천명록 브랜딩 적용)
  const titleFont = "font-serif tracking-[0.2em]";
  const bodyFont = "font-sans tracking-normal";
  
  /**
   * 랜딩 페이지 렌더링
   * 첫 화면으로 마케팅 문구와 CTA 버튼 표시 (모바일 최적화 인터랙티브 버전)
   */
  const renderLandingPage = () => {
    // 터치/마우스 핸들러
    const handleInteraction = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      
      setInteractionPos({ x, y });
      setIsInteracting(true);
    };

    return (
      <div 
        className="flex flex-col h-full relative overflow-hidden bg-gradient-to-b from-[#1a1a1c] via-[#0f0f10] to-[#050505] text-stone-200"
        onMouseMove={handleInteraction}
        onTouchMove={handleInteraction}
        onMouseLeave={() => setIsInteracting(false)}
        onTouchEnd={() => setIsInteracting(false)}
      >
        {/* 상단 황금빛 조명 강화 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-amber-900/15 blur-[150px] rounded-full z-0"></div>
        
        {/* 중앙 부드러운 조명 레이어 추가 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-amber-900/8 blur-[200px] rounded-full z-0"></div>

        {/* 1. 자가 호흡 광원 (Ambient Breathing Light) - 투명도 상향 */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_50%,rgba(217,119,6,0.25),transparent_70%)] animate-ambient-breathing" 
          />
        </div>

        {/* 2. 터치/마우스 추적 광원 (Interaction Glow) - 투명도 상향 */}
        <div 
          className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${isInteracting ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: `radial-gradient(circle 300px at ${interactionPos.x}% ${interactionPos.y}%, rgba(217,119,6,0.15), transparent 80%)`
          }}
        />
        
        {/* 배경 텍스처 (한지 느낌) - 투명도 상향 */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]" />
      
      {/* 메인 콘텐츠 */}
        <div className="z-10 flex flex-col items-center justify-center h-full p-8 text-center relative pb-40">
          <div className="space-y-16">
            {/* 로고 영역: 브랜드 정체성 강화 - 슬로건을 브랜드명 바로 아래로 이동 */}
            <div className="space-y-4 animate-fade-in" style={{ animationDuration: '2.5s' }}>
              <p className={`text-amber-500/70 text-[9px] tracking-[0.8em] uppercase font-light ${titleFont}`}>The Sacred Archive</p>
              <h1 className={`text-6xl font-bold text-amber-400/95 tracking-[0.3em] font-serif drop-shadow-[0_0_30px_rgba(217,119,6,0.4)]`}>
                天命錄
            </h1>
              {/* 슬로건을 브랜드명 바로 아래로 이동 */}
              <div className="inline-block mt-2">
                <p className="text-stone-400/80 text-[10px] font-extralight leading-relaxed tracking-[0.3em] uppercase font-sans">
                  당신의 운명이 기록된 단 하나의 기록
                </p>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-700/50 to-transparent mx-auto mt-8"></div>
              </div>
            </div>

            {/* 메인 카피: 궁서체 계열 Serif 폰트로 전통적 권위감 부여 - 텍스트 밝기 개선 */}
            <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
              <h2 className={`text-xl font-medium leading-relaxed text-stone-50/95 tracking-[0.2em] break-keep ${titleFont}`}>
                천기(天機)를 읽어<br />
                삶의 지혜를 마주하십시오
              </h2>
      </div>
      
            {/* 인터랙티브 Scroll 아이콘 - 옵션 2: 회전 + 펄스 효과 */}
            <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '1.2s', animationFillMode: 'forwards' }}>
              <div className="group cursor-pointer relative inline-block">
                {/* 호버 시 황금빛 발광 효과 */}
                <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 scale-150"></div>
                
                {/* Scroll 아이콘 - 기본: 천천히 회전, 호버: 빠르게 회전 + 펄스 */}
                <Scroll 
                  className="w-20 h-20 text-amber-400/60 mx-auto 
                             transition-all duration-500
                             group-hover:text-amber-400/90 
                             group-hover:drop-shadow-[0_0_30px_rgba(217,119,6,0.8)]
                             group-active:scale-95
                             animate-rotate-slow
                             group-hover:animate-rotate-fast
                             group-hover:animate-pulse-glow" 
                  strokeWidth={1.5} 
                />
             </div>
        </div>
          </div>
        </div>

        {/* 하단 CTA 영역: 모바일 최적화 인장 스타일 버튼 - 밝기 개선 */}
        <div className="absolute bottom-0 left-0 w-full z-20 p-10 pb-20">
          <div className="max-w-[400px] mx-auto">
            <button 
                onClick={() => setStep('input')}
              className="group relative w-full overflow-hidden border border-amber-700/40 bg-stone-900/30 backdrop-blur-sm py-6 rounded-sm transition-all duration-500 active:scale-[0.97] active:bg-stone-800/40 active:border-amber-500/60 shadow-[0_0_30px_rgba(217,119,6,0.15)]"
            >
              <div className="relative flex items-center justify-center gap-6">
                <div className="w-6 h-px bg-amber-700/40 group-active:w-10 group-active:bg-amber-500/60 transition-all duration-500" />
                <span className="text-amber-500/85 font-light tracking-[0.6em] text-[11px] group-active:text-amber-400 transition-colors">
                  기록 시작하기
                </span>
                <div className="w-6 h-px bg-amber-700/40 group-active:w-10 group-active:bg-amber-500/60 transition-all duration-500" />
              </div>
            </button>
            
            <p className="text-stone-500/70 text-[8px] tracking-[0.4em] text-center mt-10 uppercase font-light">
              Restricted Access
            </p>
        </div>
      </div>
    </div>
  );
  };
  
  /**
   * 전화번호 입력 화면 렌더링
   * 이미지 설명에 맞춘 전용 입력 화면 (천명록 브랜딩 적용)
   */
  const renderPhoneInputPage = () => (
    <div className="flex flex-col h-full bg-[#0f0f10] text-stone-200 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[300px] bg-amber-900/5 blur-[80px] rounded-full z-0"></div>
      
      {/* 상단 타이틀 */}
      <div className="p-8 pt-12 z-10">
        <h1 className={`text-2xl font-bold text-stone-100 mb-3 ${titleFont}`}>연락처 기록</h1>
        <p className="text-stone-500 text-sm font-light">결과지 전달 및 본인 확인을 위해 사용됩니다.</p>
      </div>
      
      {/* 입력 카드 */}
      <div className="flex-1 flex items-center justify-center px-6 pb-32 z-10">
        <div className="bg-stone-900/40 backdrop-blur-xl rounded-sm w-full border border-amber-900/20 shadow-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="p-5 border-b border-amber-900/10 flex items-center justify-between bg-stone-900/60">
            <button 
              onClick={() => setEditingField(null)}
              className="text-amber-700 hover:text-amber-500 transition-colors"
            >
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <span className={`text-stone-300 text-sm tracking-[0.2em] ${titleFont}`}>휴대전화</span>
            <div className="w-6"></div>
          </div>
          
          {/* 입력 필드 */}
          <div className="p-10">
            <input 
              type="tel" 
              name="phone"
              value={userInfo.phone}
              onChange={handleInputChange}
              placeholder="010-0000-0000"
              className="w-full bg-transparent text-amber-500 text-center text-2xl font-light placeholder:text-stone-800 outline-none py-4 border-b border-amber-900/30 focus:border-amber-500/50 transition-all tracking-[0.1em]"
              autoFocus 
            />
            {userInfo.phone && !isPhoneValid(userInfo.phone) && (
              <p className="text-amber-900/80 text-[10px] mt-4 text-center tracking-tighter uppercase font-medium">
                Invalid Phone Number Format
              </p>
            )}
          </div>
          
          {/* 완료 버튼 */}
          <div className="p-6 pt-0">
            <button 
              onClick={() => setEditingField(null)}
              disabled={!isPhoneValid(userInfo.phone)}
              className={`w-full font-medium py-4 rounded-sm transition-all tracking-[0.2em] ${!isPhoneValid(userInfo.phone)
                  ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700'
                }`}
            >
              기록 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * 생년월일 입력 화면 렌더링
   * 이미지 설명에 맞춘 전용 입력 화면 (천명록 브랜딩 적용)
   */
  const renderBirthDateInputPage = () => (
    <div className="flex flex-col h-full bg-[#0f0f10] text-stone-200 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[300px] bg-amber-900/5 blur-[80px] rounded-full z-0"></div>

      {/* 상단 타이틀 */}
      <div className="p-8 pt-12 z-10">
        <h1 className={`text-2xl font-bold text-stone-100 mb-3 ${titleFont}`}>생년월일(生年月日時)</h1>
        <p className="text-stone-500 text-sm font-light">당신의 명(命)이 시작된 시각을 기록해 주세요.</p>
      </div>
      
      {/* 입력 카드 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32 gap-6 z-10">
        <div className="bg-stone-900/40 backdrop-blur-xl rounded-sm w-full border border-amber-900/20 shadow-2xl overflow-hidden">
          {/* 헤더 */}
          <div className="p-5 border-b border-amber-900/10 flex items-center justify-between bg-stone-900/60">
            <button 
              onClick={() => setEditingField(null)}
              className="text-amber-700 hover:text-amber-500 transition-colors"
            >
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <span className={`text-stone-300 text-sm tracking-[0.2em] ${titleFont}`}>생년월일 기록</span>
            <div className="w-6"></div>
          </div>
          
          {/* 입력 필드 */}
          <div className="p-8 space-y-10">
            {/* 양력/음력 선택 버튼 */}
            <div className="flex bg-stone-950/60 p-1 rounded-sm border border-amber-900/20">
              <button
                onClick={() => setUserInfo({ ...userInfo, calendarType: 'solar', isLeap: false })}
                className={`flex-1 py-3 rounded-sm text-xs tracking-[0.2em] transition-all ${userInfo.calendarType === 'solar' ? 'bg-amber-900/30 text-amber-500 shadow-lg' : 'text-stone-600'}`}
              >
                陽曆 (양력)
              </button>
              <button
                onClick={() => setUserInfo({ ...userInfo, calendarType: 'lunar' })}
                className={`flex-1 py-3 rounded-sm text-xs tracking-[0.2em] transition-all ${userInfo.calendarType === 'lunar' ? 'bg-amber-900/30 text-amber-500 shadow-lg' : 'text-stone-600'}`}
              >
                陰曆 (음력)
              </button>
            </div>

            {/* 날짜 입력 */}
            <div className="relative">
            <input 
              type="date" 
              name="birthDate"
              value={userInfo.birthDate}
              onChange={handleInputChange}
                className={`w-full bg-transparent text-stone-100 text-center text-2xl font-light outline-none py-3 border-b transition-all [color-scheme:dark] tracking-[0.1em] ${getBirthDateError(userInfo.birthDate) ? 'border-red-900/50' : 'border-amber-900/30 focus:border-amber-500/50'}`}
              autoFocus 
            />
              {getBirthDateError(userInfo.birthDate) && (
                <p className="text-red-900/80 text-[10px] mt-4 text-center tracking-tighter uppercase font-medium">
                  {getBirthDateError(userInfo.birthDate)}
                </p>
              )}
            </div>

            {/* 음력 선택 시 윤달 체크박스 */}
            {userInfo.calendarType === 'lunar' && (
              <div className="flex items-center justify-center pt-2">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div
                    onClick={() => setUserInfo({ ...userInfo, isLeap: !userInfo.isLeap })}
                    className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all ${userInfo.isLeap ? 'bg-amber-800 border-amber-700' : 'border-stone-700 group-hover:border-stone-500'}`}
                  >
                    {userInfo.isLeap && <CheckCircle size={14} className="text-stone-100" />}
                  </div>
                  <span className={`text-xs tracking-[0.1em] transition-colors ${userInfo.isLeap ? 'text-amber-500' : 'text-stone-600'}`}>
                    閏月 (윤달인가요?)
                  </span>
                </label>
              </div>
            )}
          </div>
          
          {/* 완료 버튼 */}
          <div className="p-6 pt-0">
            <button 
              onClick={() => setEditingField(null)}
              disabled={!isBirthDateValid(userInfo.birthDate)}
              className={`w-full font-medium py-4 rounded-sm transition-all tracking-[0.2em] ${!isBirthDateValid(userInfo.birthDate) ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700 shadow-lg shadow-amber-900/20'}`}
            >
              기록 완료
            </button>
          </div>
        </div>

        {/* 도움말 안내 */}
        <p className="text-stone-700 text-[10px] tracking-[0.1em] text-center px-8 leading-relaxed uppercase">
          {userInfo.calendarType === 'solar'
            ? "Solar Calendar is used by default in modern times."
            : "Lunar Calendar is used for traditional Saju analysis."}
        </p>
      </div>
    </div>
  );

  /**
   * 정보 입력 페이지 렌더링
   * 천명록 브랜딩 적용: 딥 블랙, 엠버 골드, 오리엔탈 모던 스타일
   */
  const renderInputPage = () => {
    // 전화번호 수정 화면
    if (editingField === 'phone') {
      return renderPhoneInputPage();
    }
    
    // 생년월일 수정 화면
    if (editingField === 'birthDate') {
      return renderBirthDateInputPage();
    }
    
    // 기본 정보 입력 화면
    return (
      <div className="flex flex-col h-full bg-[#0f0f10] text-stone-200 font-sans relative">
        <div className="absolute top-0 left-0 w-full h-[400px] bg-amber-900/5 blur-[100px] rounded-full z-0"></div>
        
      {/* 상단 타이틀 */}
        <div className="p-8 pt-12 z-10">
          <h1 className={`text-2xl font-bold text-stone-100 mb-3 ${titleFont}`}>성함(姓名) 기록</h1>
          <p className="text-stone-500 text-sm font-light leading-relaxed">
            당신의 명운이 담긴 이름을 기록해 주십시오.<br />
            애칭이나 별칭도 가능합니다.
          </p>
      </div>
      
        {/* 입력 폼 영역 - 플라크 스타일 카드 */}
        <div className="flex-1 overflow-y-auto px-6 pb-40 z-10">
          <div className="bg-stone-900/40 backdrop-blur-xl rounded-sm p-8 border border-amber-900/20 shadow-2xl space-y-8">
          {/* 이름 입력 */}
            <div className="border-b border-amber-900/30 pb-6">
            <input 
              type="text" 
              name="name"
              value={userInfo.name}
              onChange={handleInputChange}
                placeholder="성함 입력"
                className="w-full bg-transparent text-amber-500 text-center text-2xl font-light placeholder:text-stone-800 outline-none tracking-[0.2em]"
              autoFocus 
            />
          </div>
          
          {/* 정보 리스트 */}
            <div className="space-y-6">
            {/* 전화번호 */}
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => setEditingField('phone')}>
                <span className="text-stone-500 text-xs tracking-[0.1em] uppercase">Contact</span>
                <div className="flex items-center gap-3">
                  <span className="text-stone-300 text-sm font-light tracking-widest">{userInfo.phone || '010-0000-0000'}</span>
                  <ChevronRight size={14} className="text-amber-900 group-hover:text-amber-500 transition-colors" />
            </div>
            </div>
            
            {/* 생년월일 */}
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => setEditingField('birthDate')}>
                <span className="text-stone-500 text-xs tracking-[0.1em] uppercase">Birth Date</span>
                <div className="flex items-center gap-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-stone-300 text-sm font-light tracking-widest">{userInfo.birthDate ? formatDate(userInfo.birthDate) : '0000년 00월 00일'}</span>
                    <span className="text-[10px] text-amber-900/80 uppercase tracking-tighter">
                      {userInfo.calendarType === 'solar' ? 'Solar' : `Lunar${userInfo.isLeap ? ' (Leap)' : ''}`}
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-amber-900 group-hover:text-amber-500 transition-colors" />
                </div>
            </div>
            
              {/* 생시 */}
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => setShowTimeModal(true)}>
                <span className="text-stone-500 text-xs tracking-[0.1em] uppercase">Birth Time</span>
              <div className="flex items-center gap-3">
                  <span className="text-stone-300 text-sm font-light tracking-widest">{userInfo.birthTimeLabel || 'Unknown'}</span>
                  <ChevronRight size={14} className="text-amber-900 group-hover:text-amber-500 transition-colors" />
                </div>
              </div>

              {/* 성별 */}
              <div className="flex justify-between items-center">
                <span className="text-stone-500 text-xs tracking-[0.1em] uppercase">Gender</span>
                <div className="flex bg-stone-950/40 p-1 rounded-sm border border-amber-900/10">
                <button 
                    onClick={() => setUserInfo({ ...userInfo, gender: 'male' })}
                    className={`px-4 py-1.5 rounded-sm text-[10px] tracking-[0.2em] transition-all ${userInfo.gender === 'male' ? 'bg-amber-900/30 text-amber-500' : 'text-stone-700'}`}
                >
                    乾命 (남)
                </button>
                <button 
                    onClick={() => setUserInfo({ ...userInfo, gender: 'female' })}
                    className={`px-4 py-1.5 rounded-sm text-[10px] tracking-[0.2em] transition-all ${userInfo.gender === 'female' ? 'bg-amber-900/30 text-amber-500' : 'text-stone-700'}`}
                >
                    坤命 (여)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 하단 버튼 */}
        <div className="fixed bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/90 to-transparent pt-16 z-20">
          <div className="max-w-[400px] mx-auto space-y-4">
          <button 
            onClick={async () => {
              // 사용자 정보 검증
                if (!userInfo.name || !isBirthDateValid(userInfo.birthDate) || !isPhoneValid(userInfo.phone)) {
                return;
              }

              setLoading(true);
              setError(null);

              try {
                  const cleanPhone = userInfo.phone.replace(/-/g, '');
                const userData = {
                  name: userInfo.name,
                    phone: cleanPhone,
                  birthDate: userInfo.birthDate,
                  birthTime: userInfo.timeUnknown ? null : userInfo.birthTime,
                  gender: userInfo.gender,
                    calendarType: userInfo.calendarType,
                    isLeap: userInfo.isLeap
                };

                const response = await createUser(userData);
                
                setUserInfo(prev => ({
                  ...prev,
                  userId: response.userId,
                  accessToken: response.accessToken
                }));

                setStep('payment');
              } catch (err) {
                  setError(err.message || '정보 저장에 실패했습니다.');
                console.error('사용자 생성 오류:', err);
              } finally {
                setLoading(false);
              }
            }}
              disabled={!userInfo.name || !isBirthDateValid(userInfo.birthDate) || !isPhoneValid(userInfo.phone) || loading}
              className={`w-full py-5 rounded-sm text-lg font-medium transition-all tracking-[0.3em] ${!userInfo.name || !isBirthDateValid(userInfo.birthDate) || !isPhoneValid(userInfo.phone) || loading
                  ? 'bg-stone-900 text-stone-700 cursor-not-allowed border border-stone-800'
                  : 'bg-amber-800/80 text-amber-100 hover:bg-amber-700 border border-amber-600/30 shadow-[0_0_20px_rgba(180,83,9,0.2)]'
                }`}
            >
              {loading ? '검증 중...' : '다음으로'}
          </button>
            
          {error && (
              <p className="text-red-900/80 text-[10px] mt-2 text-center uppercase tracking-tighter font-medium">{error}</p>
          )}
        </div>
      </div>
      
        {/* 시간 선택 모달 - 브랜딩 적용 */}
      {showTimeModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in">
            <div className="bg-[#0f0f10] w-full max-w-md h-[70%] sm:h-auto sm:max-h-[80vh] sm:rounded-sm flex flex-col overflow-hidden animate-slide-up shadow-2xl border-t sm:border border-amber-900/20">
            {/* 모달 헤더 */}
              <div className="p-6 border-b border-amber-900/10 flex justify-between items-center sticky top-0 bg-[#0f0f10] z-10 shrink-0">
      <div>
                  <h3 className={`text-stone-100 text-lg font-bold ${titleFont}`}>生時 (태어난 시각)</h3>
                  <p className="text-stone-500 text-xs mt-1 font-light">정확한 시각을 모를 경우 '모름'을 선택하십시오.</p>
              </div>
                <button onClick={() => setShowTimeModal(false)} className="text-amber-900 hover:text-amber-500 p-2 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* 시간대 선택 그리드 */}
              <div className="p-6 overflow-y-auto grid grid-cols-3 gap-3 pb-24 flex-1">
              {SAJU_TIMES.map((time) => (
                <button
                  key={time.id}
                  onClick={() => handleTimeSelect(time)}
                    className={`flex flex-col items-center justify-center p-4 rounded-sm transition-all aspect-[4/3] gap-2 border ${userInfo.birthTimeLabel.includes(time.label)
                        ? 'bg-amber-900/30 text-amber-500 border-amber-500/50 shadow-inner'
                        : 'bg-stone-950/40 text-stone-600 border-amber-900/10 hover:border-amber-500/30 hover:text-stone-400'
                      }`}
                  >
                    <span className="text-[10px] font-bold tracking-[0.1em]">{time.label}</span>
                    <span className="text-[9px] opacity-60 font-mono tracking-tighter">{time.range}</span>
                </button>
              ))}
              
              {/* 모름 버튼 */}
               <button
                  onClick={() => handleTimeSelect(null)}
                  className={`col-span-3 p-5 rounded-sm font-medium text-xs tracking-[0.2em] transition-all mt-4 border ${userInfo.timeUnknown
                      ? 'bg-amber-900/30 text-amber-500 border-amber-500/50'
                      : 'bg-stone-950/40 text-stone-600 border-amber-900/10 hover:border-amber-500/30 hover:text-stone-400'
                    }`}
                >
                  시간을 모름
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };
  
  /**
   * 결제 페이지 렌더링
   * 천명록 브랜딩 적용: 프리미엄 리포트 발간 컨셉
   */
  const renderPaymentPage = () => {
    // 포함 내용 리스트 (천명록 컨셉으로 고도화)
    const includedItems = [
      '天命 2026: 평생의 대운과 올해의 세운 분석',
      '月別 運勢: 12개월의 길흉화복 흐름도',
      '四柱 四大運: 재물·연애·직장·건강 심층 분석',
      '開運法: 당신을 돕는 색상, 방향, 숫자 가이드',
      '守護符: 당신의 기운을 보강할 수호 부적 증정',
    ];

    return (
      <div className="flex flex-col h-full bg-[#0f0f10] text-stone-200 font-sans relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-amber-900/10 blur-[120px] rounded-full z-0"></div>

        {/* 헤더 */}
        <div className="p-6 flex items-center gap-4 z-10">
          <button onClick={() => setStep('input')} className="text-amber-900 hover:text-amber-500 transition-colors">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <span className={`text-stone-500 text-sm tracking-[0.2em] ${titleFont}`}>ISSUANCE</span>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 pb-40 space-y-6 z-10">
          
          {/* 사용자 정보 섹션 */}
          <div className="text-center py-4">
            <h2 className={`text-2xl font-bold text-stone-100 ${titleFont}`}>
              {userInfo.name}님의 天命錄 발간
            </h2>
            <p className="text-stone-500 text-xs mt-2 font-light tracking-widest">
              {formatDate(userInfo.birthDate)} · {userInfo.gender === 'male' ? '乾命' : '坤命'}
            </p>
          </div>

          {/* 리포트 사양 카드 */}
          <div className="bg-stone-900/40 backdrop-blur-xl rounded-sm p-8 border border-amber-900/20 shadow-2xl space-y-8">
            <div className="space-y-4">
              <h3 className={`text-amber-500/80 text-sm font-medium tracking-[0.2em] ${titleFont}`}>REPORT SPECIFICATION</h3>
              <div className="space-y-4">
              {includedItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-stone-300 text-sm font-light">
                    <Sparkles size={14} className="text-amber-700 shrink-0 mt-0.5" />
                    <span className="flex-1 leading-relaxed tracking-tight">{item}</span>
                </div>
              ))}
            </div>
              </div>

            {/* 가격 정보 */}
            <div className="pt-8 border-t border-amber-900/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 text-xs tracking-widest">VALUATION</span>
                <span className="text-stone-500 text-sm line-through decoration-amber-900/50">₩29,000</span>
              </div>
                <div className="flex justify-between items-center">
                <span className="text-amber-700 text-xs tracking-widest font-bold uppercase">Limited Offer</span>
                <div className="text-right">
                  <span className="text-amber-500 text-3xl font-light tracking-tighter">9,900</span>
                  <span className="text-stone-500 text-sm ml-1">KRW</span>
                </div>
              </div>
            </div>
          </div>

          {/* 결제 수단 선택 */}
          <div className="space-y-4 pt-4">
            <h3 className={`text-stone-500 text-xs tracking-[0.2em] text-center ${titleFont}`}>PAYMENT METHOD</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                    onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-sm border transition-all text-[10px] tracking-[0.2em] font-medium ${paymentMethod === 'card' 
                  ? 'bg-amber-900/20 border-amber-500/50 text-amber-500 shadow-inner' 
                  : 'bg-stone-950/40 border-amber-900/10 text-stone-600 hover:border-amber-900/30'}`}
              >
                신용/체크카드
              </button>
              <button
                onClick={() => setPaymentMethod('trans')}
                className={`p-4 rounded-sm border transition-all text-[10px] tracking-[0.2em] font-medium ${paymentMethod === 'trans' 
                  ? 'bg-amber-900/20 border-amber-500/50 text-amber-500 shadow-inner' 
                  : 'bg-stone-950/40 border-amber-900/10 text-stone-600 hover:border-amber-900/30'}`}
              >
                1초 계좌이체
                </button>
                    </div>
                  </div>
                  
          {/* 안심 안내 */}
          <div className="flex items-center justify-center gap-6 py-4 text-stone-700 text-[9px] tracking-widest uppercase font-medium">
            <span className="flex items-center gap-2"><Lock size={10} /> Secure SSL</span>
            <span className="flex items-center gap-2"><CreditCard size={10} /> Safe Payment</span>
                  </div>
                  </div>
                  
        {/* 하단 고정 버튼 */}
        <div className="fixed bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/90 to-transparent pt-16 z-20">
          <div className="max-w-[400px] mx-auto space-y-4">
                <button 
                onClick={() => startAnalysis(paymentMethod)}
              className="w-full bg-amber-800/80 hover:bg-amber-700 text-amber-100 font-medium py-5 rounded-sm text-lg tracking-[0.3em] transition-all border border-amber-600/30 shadow-[0_0_20px_rgba(180,83,9,0.2)]"
                >
              리포트 발간하기
                </button>
            <p className="text-stone-700 text-[9px] text-center leading-relaxed tracking-wider uppercase">
              By proceeding, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  /**
   * 분석 중 페이지 렌더링
   * 천명록 브랜딩 적용: 신비롭고 묵직한 분석 연출
   */
  const renderAnalyzingPage = () => (
    <div className="flex flex-col h-full bg-[#0f0f10] text-stone-200 items-center justify-center p-8 text-center relative overflow-hidden">
      {/* 상단 금빛 조명 */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-amber-900/10 blur-[120px] rounded-full z-0"></div>
      
      {/* 한지 텍스처 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]"></div>

      <div className="z-10 w-full flex flex-col items-center space-y-12">
        {/* 고풍스러운 로딩 애니메이션 */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border border-amber-900/20 rounded-full"></div>
          <div className="absolute inset-0 border-t-2 border-amber-500 rounded-full animate-spin"></div>
          <div className="text-amber-500/50 animate-pulse">
            <Sparkles size={32} strokeWidth={1} />
            </div>
        </div>

        <div className="space-y-6">
          <h2 className={`text-3xl font-bold leading-relaxed text-stone-100 ${titleFont}`}>
            천기(天機)를<br />읽고 있습니다.
            </h2>
          <p className="text-stone-500 text-sm font-light tracking-widest uppercase">
            Consulting the celestial archive...
          </p>
            </div>

        {/* 프로그레스 바 (엠버 컬러 적용) */}
        <div className="w-full max-w-[240px] space-y-4">
          <div className="w-full bg-stone-900 rounded-full h-[2px] overflow-hidden">
            <div className="bg-amber-600 h-full transition-all duration-300 shadow-[0_0_10px_rgba(217,119,6,0.5)]" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-[10px] text-amber-900 font-mono tracking-[0.2em]">{Math.floor(progress)}% ANALYZED</p>
        </div>
        </div>
    </div>
  );
  
  /**
   * 결과 페이지 렌더링
   * 사주 분석 결과 및 PDF 다운로드 기능 (애니메이션 강화)
   */
  const renderResultPage = () => {
    // API에서 받은 실제 데이터 사용, 없으면 기본값 사용
    const result = sajuResult || {
      overallScore: 82,
      overallFortune: '대기만성형 (大器晩成)',
      wealthScore: 78,
      wealthFortune: '2026년 상반기에는 투자를 조심해야 합니다. 하지만 9월 이후 귀인의 도움으로 큰 수익을 기대할 수 있습니다.',
      loveScore: 85,
      loveFortune: '기존의 인연보다는 새로운 모임에서 만나는 사람이 인연일 확률이 높습니다. 5월에 중요한 만남이 예상됩니다.',
      careerScore: 72,
      careerFortune: '상반기에는 현재 위치에서 실력을 쌓는 것이 좋습니다. 하반기에 이직이나 승진의 기회가 찾아올 수 있습니다.',
      healthScore: 65,
      healthFortune: '과로를 피하고 충분한 휴식을 취하세요. 특히 소화기 계통을 주의하고, 규칙적인 운동을 권장합니다.',
      oheng: { 목: 20, 화: 60, 토: 10, 금: 5, 수: 5 }
    };

    // 오행 데이터 변환
    const ohengData = [
      { label: '목(木)', val: result.oheng?.목 || 20, color: 'bg-green-500', delay: 'delay-100' },
      { label: '화(火)', val: result.oheng?.화 || 60, color: 'bg-red-500', delay: 'delay-200' },
      { label: '토(土)', val: result.oheng?.토 || 10, color: 'bg-yellow-500', delay: 'delay-300' },
      { label: '금(金)', val: result.oheng?.금 || 5, color: 'bg-slate-400', delay: 'delay-400' },
      { label: '수(水)', val: result.oheng?.수 || 5, color: 'bg-blue-500', delay: 'delay-500' },
    ];

    // 운세 카드 데이터
    const fortuneCards = [
      { 
        emoji: '💰', 
        title: '재물운', 
        score: result.scores?.wealth || result.wealthScore || 78,
        content: result.wealthFortune || '재물운 정보를 불러오는 중...',
        delay: 'delay-300'
      },
      { 
        emoji: '❤️', 
        title: '애정운', 
        score: result.scores?.love || result.loveScore || 85,
        content: result.loveFortune || '애정운 정보를 불러오는 중...',
        delay: 'delay-400'
      },
      { 
        emoji: '💼', 
        title: '직장운', 
        score: result.scores?.career || result.careerScore || 72,
        content: result.careerFortune || '직장운 정보를 불러오는 중...',
        delay: 'delay-500'
      },
      { 
        emoji: '🏥', 
        title: '건강운', 
        score: result.scores?.health || result.healthScore || 65,
        content: result.healthFortune || '건강운 정보를 불러오는 중...',
        delay: 'delay-600'
      },
    ];

    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-y-auto print:bg-white font-sans">
        {/* 헤더 */}
        <div className="p-4 bg-black/30 backdrop-blur-sm flex justify-between items-center sticky top-0 z-50">
          <div className="font-bold text-lg">사주결과</div>
          <button onClick={() => setStep('landing')} className="text-sm bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
            처음으로
        </button>
        </div>
        
        <div className="p-6 pb-48 space-y-8">
          {/* 기본 정보 요약 - 애니메이션 */}
          <div className="text-center space-y-3 pb-6 border-b border-white/10 animate-fade-in-up">
            <p className="text-slate-400 font-medium text-sm">{formatDate(userInfo.birthDate)}생 · {userInfo.gender === 'male' ? '남성' : '여성'}</p>
            <h1 className={`text-4xl font-bold text-white ${viralFont}`}>{userInfo.name}님의 운명</h1>
            <div className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2 rounded-full text-sm font-bold mt-3 shadow-lg shadow-pink-500/30">
              ✨ 총평: {result.overallFortune || '대기만성형 (大器晩成)'}
            </div>
          </div>
          
          {/* 2026년 종합 점수 */}
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 animate-fade-in-up delay-100 opacity-0-init" style={{ animationFillMode: 'forwards' }}>
            <h3 className="text-center text-slate-400 text-sm mb-3">2026년 종합운세</h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                {result.scores?.overall || result.overallScore || 82}
              </span>
              <span className="text-2xl text-slate-400">/100</span>
            </div>
            <p className="text-center text-slate-400 text-sm mt-2">상위 18%의 좋은 운세입니다</p>
          </div>
          
          {/* 오행 그래프 - 애니메이션 바 */}
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 animate-fade-in-up delay-200 opacity-0-init" style={{ animationFillMode: 'forwards' }}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <RefreshCw size={18} className="text-slate-400" /> 오행 분석
            </h3>
            <div className="space-y-4">
              {ohengData.map((el, idx) => (
                <div key={el.label} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-bold text-slate-300">{el.label}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                    <div 
                      className={`h-full ${el.color} animate-grow-width ${el.delay} rounded-full`} 
                      style={{ width: `${el.val}%`, animationFillMode: 'forwards' }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-400 w-10 text-right font-mono">{el.val}%</span>
                </div>
              ))}
            </div>
            <div className="mt-5 p-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30">
              <p className="text-sm text-slate-200 leading-relaxed">
                🔥 당신은 <strong className="text-red-400">불(火)</strong>의 기운이 강렬합니다. 열정과 추진력이 뛰어나지만, 때로는 성급함으로 인해 실수를 할 수 있습니다.
              </p>
            </div>
          </div>
          
          {/* 상세 운세 카드들 */}
          <div className="space-y-4">
            {fortuneCards.map((card, idx) => (
              <div 
                key={card.title} 
                className={`bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 animate-fade-in-up ${card.delay} opacity-0-init`}
                style={{ animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <span className="text-2xl">{card.emoji}</span> {card.title}
                  </h4>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{card.score}</span>
                    <span className="text-slate-500 text-sm">점</span>
                  </div>
                </div>
                {/* 점수 바 */}
                <div className="w-full bg-white/10 rounded-full h-2 mb-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-grow-width"
                    style={{ width: `${card.score}%`, animationDelay: `${(idx + 3) * 100}ms`, animationFillMode: 'forwards' }}
                  ></div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {card.content}
                </p>
              </div>
            ))}
          </div>

          {/* 주의사항 */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl animate-fade-in-up delay-700 opacity-0-init" style={{ animationFillMode: 'forwards' }}>
            <p className="text-yellow-200 text-sm leading-relaxed">
              ⚠️ <strong>2026년 주의 시기:</strong> 3월, 7월에는 큰 결정을 피하고 신중하게 행동하세요. 특히 금전 관련 계약은 재검토가 필요합니다.
            </p>
          </div>
        </div>
        
        {/* 하단 PDF 다운로드 영역 */}
        <div className="fixed bottom-0 left-0 w-full print:hidden">
          {/* 그라데이션 오버레이 */}
          <div className="bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent h-20 pointer-events-none"></div>
          <div className="bg-slate-900 p-4 pb-6 space-y-3">
            <div className="max-w-[480px] mx-auto space-y-3">
              {/* PDF 프로모션 배너 */}
              <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 p-3 rounded-xl border border-pink-500/30 flex items-center gap-3">
                <div className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded">추천</div>
                <p className="text-slate-200 text-sm flex-1">
                  <strong>평생 소장용 PDF</strong>로 저장하세요
                </p>
                <span className="text-pink-400 font-bold">+3,900원</span>
              </div>
              
              {/* PDF 다운로드 버튼 */}
              <button 
                onClick={handleDownloadPDF}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Download size={20} /> PDF 다운로드 (3,900원)
              </button>
              
              {/* 이미 결제한 것처럼 보이는 무료 버튼 */}
              <button 
                onClick={handleDownloadPDF}
                className="w-full bg-white/10 text-slate-400 font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors text-sm"
              >
                웹에서 계속 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans relative overflow-hidden">
      {/* 고정 배경 요소: 금빛 안개 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* 메인 앱 컨테이너 - 천명록 전용 컨테이너 */}
      <div className="w-full max-w-[480px] h-[100dvh] bg-[#0f0f10] shadow-[0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col border-x border-amber-900/10">
        {step === 'landing' && renderLandingPage()}
        {step === 'input' && renderInputPage()}
        {step === 'payment' && renderPaymentPage()}
        {step === 'analyzing' && renderAnalyzingPage()}
        {step === 'result' && renderResultPage()}
      </div>
    </div>
  );
};

export default SajuApp;
