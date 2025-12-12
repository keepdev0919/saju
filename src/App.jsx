import React, { useState, useEffect } from 'react';
import { CreditCard, Download, ChevronRight, CheckCircle, Smartphone, User, Star, RefreshCw, Sparkles, Moon, Scroll, Hand, ArrowRight, Timer, Eye, X } from 'lucide-react';
import { createUser, createPayment, verifyPayment, calculateSaju, getSajuResult } from './utils/api';

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
  // 현재 화면 단계 상태 (landing, input, payment, analyzing, result)
  const [step, setStep] = useState('landing');
  
  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    name: '',
    gender: 'male',
    birthDate: '',
    birthTime: '', // HH:MM 형식 (내부 로직용)
    birthTimeLabel: '', // UI 표시용 (예: 축시 01:30~03:29)
    calendarType: 'solar',
    timeUnknown: false,
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
  
  // 시간 선택 모달 표시 여부
  const [showTimeModal, setShowTimeModal] = useState(false);
  
  // 결제 수단 선택 상태
  const [paymentMethod, setPaymentMethod] = useState('naverpay');
  
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
   * 입력 필드 변경 핸들러
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name]: value }));
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
   * 분석 시작 함수
   * 결제 처리 및 사주 계산을 수행
   */
  const startAnalysis = async () => {
    if (!userInfo.userId) {
      setError('사용자 정보가 없습니다. 다시 시도해주세요.');
      return;
    }

    setStep('analyzing');
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // 1. 결제 요청 생성
      const paymentResponse = await createPayment({
        userId: userInfo.userId,
        amount: 9900,
        productType: 'basic'
      });

      // 프로그레스 바 애니메이션 (결제 처리 중)
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 10;
        if (currentProgress > 50) {
          currentProgress = 50;
          clearInterval(progressInterval);
        }
        setProgress(currentProgress);
      }, 200);

      // 2. 결제 검증 (실제로는 포트원 콜백에서 처리하지만, 여기서는 시뮬레이션)
      // 실제 환경에서는 포트원 결제 완료 후 콜백으로 처리해야 함
      await new Promise(resolve => setTimeout(resolve, 2000)); // 결제 처리 시뮬레이션

      // 결제 검증 (테스트용 - 실제로는 포트원 콜백에서 처리)
      const verifyResponse = await verifyPayment({
        imp_uid: paymentResponse.impUid || 'test_imp_uid',
        merchant_uid: paymentResponse.merchantUid
      });

      // 프로그레스 바 계속 진행 (사주 계산 중)
      currentProgress = 50;
      const calcInterval = setInterval(() => {
        currentProgress += Math.random() * 15;
        if (currentProgress > 90) {
          currentProgress = 90;
          clearInterval(calcInterval);
        }
        setProgress(currentProgress);
      }, 300);

      // 3. 사주 계산
      const sajuResponse = await calculateSaju({
        userId: userInfo.userId,
        birthDate: userInfo.birthDate,
        birthTime: userInfo.timeUnknown ? null : userInfo.birthTime,
        calendarType: userInfo.calendarType
      });

      // 프로그레스 바 완료
      setProgress(100);

      // 4. 사주 결과 저장
      setSajuResult(sajuResponse.result);

      // 결과 페이지로 이동
      setTimeout(() => {
        setStep('result');
        setLoading(false);
      }, 800);

    } catch (err) {
      console.error('분석 오류:', err);
      setError(err.message || '사주 분석에 실패했습니다.');
      setLoading(false);
      // 에러 발생 시 결제 페이지로 돌아가기
      setTimeout(() => {
        setStep('payment');
      }, 2000);
    }
  };
  
  /**
   * PDF 다운로드 핸들러 (브라우저 프린트 기능 사용)
   */
  const handleDownloadPDF = () => {
    window.print();
  };
  
  // 바이럴 마케팅 스타일 폰트 클래스
  const viralFont = "font-serif tracking-tight"; 
  
  /**
   * 랜딩 페이지 렌더링
   * 첫 화면으로 마케팅 문구와 CTA 버튼 표시
   */
  const renderLandingPage = () => (
    <div className={`flex flex-col h-full relative overflow-hidden bg-white text-slate-900`}>
      {/* 배경 이미지 */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-90 z-0"></div>
      {/* 그라데이션 오버레이 */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/40 via-white/20 to-white/95 z-0"></div>
      
      {/* 메인 콘텐츠 */}
      <div className="z-10 flex flex-col items-center justify-center h-full p-8 text-center relative pb-32">
        <div className="animate-fade-in-up space-y-6">
            <p className="text-red-600 text-base font-black tracking-widest mb-4 animate-pulse drop-shadow-sm">※ 소름 주의 ※</p>
            <h1 className={`text-4xl font-bold leading-snug text-slate-900 ${viralFont} drop-shadow-md`}>
                당신의 미래를<br/>
                미리 훔쳐보고<br/>
                피하시겠습니까?
            </h1>
            <p className="text-slate-900 text-xl mt-6 font-extrabold leading-relaxed drop-shadow-sm">
                2026년, 당신에게 닥칠 변화<br/>
                지금 확인하지 않으면 늦습니다.
            </p>
            <div className="mt-8 animate-bounce">
                <Eye className="w-12 h-12 text-slate-900 mx-auto" strokeWidth={1.5} />
            </div>
        </div>
      </div>
      
      {/* 하단 CTA 영역 */}
      <div className="absolute bottom-0 left-0 w-full z-20">
        <div className="relative flex justify-center -mb-4 z-30">
             <div className="bg-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg animate-pulse flex items-center gap-1">
                <Timer size={12} /> 선착순 무료 감정 종료 임박!
             </div>
        </div>
        <div className="bg-slate-900/10 backdrop-blur-sm p-4 pb-8 pt-6">
            <button 
                onClick={() => setStep('input')}
                className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold py-5 rounded-xl text-xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
                내 운명 엿보기 <ArrowRight strokeWidth={3} size={20}/>
            </button>
            <div className="bg-slate-800 text-slate-200 text-xs py-1 px-3 mt-3 rounded w-fit mx-auto opacity-90">
                할인혜택 종료까지 <span className="text-yellow-400 font-mono font-bold tabular-nums tracking-widest">{formatTime(timeLeft)}</span>
            </div>
        </div>
      </div>
    </div>
  );
  
  /**
   * 정보 입력 페이지 렌더링
   * 어두운 테마 + 글래스모피즘 카드 UI
   */
  const renderInputPage = () => (
    <div className="flex flex-col h-full bg-transparent text-white font-sans relative">
      {/* 상단 타이틀 */}
      <div className="p-6 pt-8">
        <h1 className="text-3xl font-bold text-white mb-2">이름을 알려주세요</h1>
        <p className="text-slate-400 text-sm">애칭을 입력하셔도 괜찮아요</p>
      </div>
      
      {/* 입력 폼 영역 - 글래스모피즘 카드 */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-1">
          {/* 이름 입력 */}
          <div className="border-b border-white/10 pb-4">
            <input 
              type="text" 
              name="name"
              value={userInfo.name}
              onChange={handleInputChange}
              placeholder="이름"
              className="w-full bg-transparent text-white text-center text-xl font-medium placeholder:text-slate-500 outline-none py-2"
              autoFocus 
            />
          </div>
          
          {/* 정보 리스트 */}
          <div className="divide-y divide-white/10">
            {/* 전화번호 */}
            <div className="flex justify-between items-center py-4">
              <span className="text-slate-400">전화번호</span>
              <div className="flex items-center gap-2">
                <input 
                  type="tel" 
                  name="phone"
                  value={userInfo.phone}
                  onChange={handleInputChange}
                  placeholder="010-0000-0000"
                  className="bg-transparent text-white text-right outline-none placeholder:text-slate-600 w-36"
                />
                <span className="text-slate-500">✏️</span>
              </div>
            </div>
            
            {/* 생시 */}
            <div className="flex justify-between items-center py-4">
              <span className="text-slate-400">생시</span>
              <button 
                onClick={() => setShowTimeModal(true)}
                className="flex items-center gap-2 text-white"
              >
                <span>{userInfo.birthTimeLabel || '모름'}</span>
                <span className="text-slate-500">✏️</span>
              </button>
            </div>
            
            {/* 생년월일 */}
            <div className="flex justify-between items-center py-4">
              <span className="text-slate-400">생년월일</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  name="birthDate"
                  value={userInfo.birthDate}
                  onChange={handleInputChange}
                  className="bg-transparent text-white outline-none [color-scheme:dark]"
                />
                <span className="text-slate-500">✏️</span>
              </div>
            </div>
            
            {/* 성별 */}
            <div className="flex justify-between items-center py-4">
              <span className="text-slate-400">성별</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setUserInfo({...userInfo, gender: 'male'})}
                  className={`px-3 py-1 rounded-lg transition-all ${userInfo.gender === 'male' ? 'text-white font-bold' : 'text-slate-500'}`}
                >
                  남자
                </button>
                <span className="text-slate-600">/</span>
                <button 
                  onClick={() => setUserInfo({...userInfo, gender: 'female'})}
                  className={`px-3 py-1 rounded-lg transition-all ${userInfo.gender === 'female' ? 'text-white font-bold' : 'text-slate-500'}`}
                >
                  여자
                </button>
                <span className="text-slate-500">✏️</span>
              </div>
            </div>
            
            {/* 양력/음력 */}
            <div className="flex justify-between items-center py-4">
              <span className="text-slate-400">달력</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setUserInfo({...userInfo, calendarType: 'solar'})}
                  className={`px-3 py-1 rounded-lg transition-all ${userInfo.calendarType === 'solar' ? 'text-white font-bold' : 'text-slate-500'}`}
                >
                  양력
                </button>
                <span className="text-slate-600">/</span>
                <button 
                  onClick={() => setUserInfo({...userInfo, calendarType: 'lunar'})}
                  className={`px-3 py-1 rounded-lg transition-all ${userInfo.calendarType === 'lunar' ? 'text-white font-bold' : 'text-slate-500'}`}
                >
                  음력
                </button>
                <span className="text-slate-500">✏️</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
      
      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-10">
        <div className="max-w-[480px] mx-auto">
          <button 
            onClick={async () => {
              // 사용자 정보 검증
              if (!userInfo.name || !userInfo.birthDate || !userInfo.phone) {
                return;
              }

              setLoading(true);
              setError(null);

              try {
                // 사용자 생성 API 호출
                const userData = {
                  name: userInfo.name,
                  phone: userInfo.phone,
                  birthDate: userInfo.birthDate,
                  birthTime: userInfo.timeUnknown ? null : userInfo.birthTime,
                  gender: userInfo.gender,
                  calendarType: userInfo.calendarType
                };

                const response = await createUser(userData);
                
                // 사용자 정보 업데이트
                setUserInfo(prev => ({
                  ...prev,
                  userId: response.userId,
                  accessToken: response.accessToken
                }));

                // 결제 페이지로 이동
                setStep('payment');
              } catch (err) {
                setError(err.message || '사용자 정보 저장에 실패했습니다.');
                console.error('사용자 생성 오류:', err);
              } finally {
                setLoading(false);
              }
            }}
            disabled={!userInfo.name || !userInfo.birthDate || !userInfo.phone || loading}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              !userInfo.name || !userInfo.birthDate || !userInfo.phone || loading
              ? 'bg-white/10 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 hover:opacity-90'
            }`}
          >
            {loading ? '처리 중...' : '다음으로'}
          </button>
          {error && (
            <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
          )}
        </div>
      </div>
      
      {/* 시간 선택 모달 */}
      {showTimeModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-[#1a1a1a] w-full max-w-md h-[60%] sm:h-auto sm:max-h-[80vh] sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden animate-slide-up shadow-2xl">
            {/* 모달 헤더 */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#1a1a1a] z-10 shrink-0">
      <div>
                <h3 className="text-white text-lg font-bold">태어난 시간을 알려주세요</h3>
                <p className="text-gray-400 text-xs mt-1">시간을 몰라도 사주는 볼 수 있어요!</p>
              </div>
              <button onClick={() => setShowTimeModal(false)} className="text-gray-400 hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            {/* 시간대 선택 그리드 */}
            <div className="p-4 overflow-y-auto grid grid-cols-3 gap-2 pb-20 flex-1">
              {SAJU_TIMES.map((time) => (
                <button
                  key={time.id}
                  onClick={() => handleTimeSelect(time)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all aspect-[4/3] gap-1 ${
                    userInfo.birthTimeLabel.includes(time.label) 
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/50 border border-pink-400' 
                      : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333] border border-white/5'
                  }`}
                >
                  <span className="text-sm font-bold">{time.label}</span>
                  <span className="text-[10px] opacity-70 font-mono tracking-tighter">{time.range}</span>
                </button>
              ))}
              
              {/* 모름 버튼 */}
               <button
                  onClick={() => handleTimeSelect(null)}
                  className={`col-span-3 p-4 rounded-xl font-bold text-center transition-all mt-2 ${
                    userInfo.timeUnknown
                      ? 'bg-gray-200 text-black' 
                      : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333] border border-white/5'
                  }`}
                >
                  모름
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  /**
   * 결제 페이지 렌더링
   * 차별화된 디자인: 보라색 테마, 상품 정보 카드, 포함 내용 리스트
   */
  const renderPaymentPage = () => {
    // 포함 내용 리스트
    const includedItems = [
      '2026년 전체 운세 총평',
      '월별 상세 운세 분석',
      '재물·애정·건강·직장 4대 운세',
      '올해의 행운 키워드 & 주의사항',
      '카카오톡으로 결과 링크 발송',
    ];

    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white font-sans">
        {/* 헤더 */}
        <div className="p-4 flex items-center gap-2">
          <button onClick={() => setStep('input')} className="text-slate-400 hover:text-white">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <span className="text-slate-400 text-sm">결제</span>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-4 pb-52 space-y-4">
          
          {/* 사용자 정보 카드 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-violet-500/30">
                {userInfo.gender === 'male' ? '👨' : '👩'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{userInfo.name}님</h3>
                <p className="text-slate-400 text-sm">
                  {formatDate(userInfo.birthDate)} · {userInfo.calendarType === 'solar' ? '양력' : '음력'}
                </p>
              </div>
            </div>
          </div>

          {/* 상품 카드 */}
          <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-5 border border-violet-500/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-violet-500 text-white text-xs font-bold px-2 py-1 rounded">BEST</span>
              <span className="text-violet-300 text-sm">가장 많이 선택한 상품</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              2026 프리미엄 운세 리포트
            </h2>
            
            {/* 포함 내용 */}
            <div className="space-y-2 mb-5">
              {includedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle size={16} className="text-violet-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* 가격 */}
            <div className="bg-black/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-sm">
                <span>정가</span>
                <span className="line-through">29,000원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-violet-400 font-bold text-sm">첫 구매 특별 할인</span>
                <span className="text-violet-400 font-bold">-19,100원</span>
              </div>
              <div className="border-t border-white/10 pt-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">결제 금액</span>
                  <div className="flex items-baseline gap-2">
                    <span className="bg-violet-500 text-white text-xs font-bold px-2 py-0.5 rounded">66%↓</span>
                    <span className="text-white font-bold text-2xl">9,900원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 리뷰 섹션 */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">실제 이용 후기</h3>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★★★★★</span>
                <span className="text-white font-bold">4.9</span>
                <span className="text-slate-500 text-sm">(2,847)</span>
              </div>
            </div>
            
            {/* 후기 카드 */}
            <div className="space-y-3">
              <div className="bg-black/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 text-xs">★★★★★</span>
                  <span className="text-slate-500 text-xs">김*현 · 2일 전</span>
                </div>
                <p className="text-slate-300 text-sm">"진짜 소름돋았어요... 작년에 일어난 일이랑 너무 맞아서 올해 운세도 믿고 봅니다"</p>
              </div>
              <div className="bg-black/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 text-xs">★★★★★</span>
                  <span className="text-slate-500 text-xs">박*수 · 5일 전</span>
                </div>
                <p className="text-slate-300 text-sm">"만원도 안되는 가격에 이정도 퀄리티면 완전 가성비... PDF로 저장해서 틈틈이 보고 있어요"</p>
              </div>
            </div>
          </div>

          {/* 안심 결제 안내 */}
          <div className="flex items-center justify-center gap-4 py-2 text-slate-500 text-xs">
            <span className="flex items-center gap-1">🔒 SSL 보안결제</span>
            <span className="flex items-center gap-1">💳 안전한 PG결제</span>
          </div>
        </div>

        {/* 하단 고정 영역 */}
        <div className="fixed bottom-0 left-0 w-full">
          <div className="bg-gradient-to-t from-slate-950 via-slate-950 to-transparent h-8 pointer-events-none"></div>
          <div className="bg-slate-950 p-4 pb-6 space-y-3">
            <div className="max-w-[480px] mx-auto space-y-3">
              {/* 결제 버튼들 */}
              <button 
                onClick={startAnalysis}
                className="w-full bg-[#FEE500] text-[#191919] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#FDD835] transition-colors shadow-lg text-lg"
              >
                <span className="font-black">kakao</span>pay로 결제하기
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={startAnalysis}
                  className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors text-sm"
                >
                  <CreditCard size={18} /> 카드결제
                </button>
                <button 
                  onClick={startAnalysis}
                  className="flex-1 bg-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors text-sm"
                >
                  💳 계좌이체
                </button>
              </div>
              
              {/* 약관 동의 */}
              <p className="text-slate-600 text-xs text-center">
                결제 시 <span className="underline">이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 동의합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  /**
   * 분석 중 페이지 렌더링
   * 로딩 애니메이션과 진행률 표시
   */
  const renderAnalyzingPage = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white items-center justify-center p-8 text-center relative overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop')] bg-cover opacity-20"></div>
        
        <div className="z-10 w-full flex flex-col items-center">
            {/* 로딩 스피너 */}
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className={`text-3xl font-bold mb-4 ${viralFont} leading-relaxed`}>
                천기(天機)를<br/>읽고 있습니다.
            </h2>
            {/* 프로그레스 바 */}
            <div className="w-full bg-slate-800 rounded-full h-1 mt-8 overflow-hidden max-w-[200px]">
                <div className="bg-pink-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="mt-4 text-slate-400 text-sm font-mono">{Math.floor(progress)}% 분석 완료</p>
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
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 animate-fade-in-up delay-100 opacity-0-init" style={{animationFillMode: 'forwards'}}>
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
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 animate-fade-in-up delay-200 opacity-0-init" style={{animationFillMode: 'forwards'}}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <RefreshCw size={18} className="text-slate-400"/> 오행 분석
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
                style={{animationFillMode: 'forwards'}}
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
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl animate-fade-in-up delay-700 opacity-0-init" style={{animationFillMode: 'forwards'}}>
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
  
  /**
   * 몽환적인 배경 컴포넌트
   * 떠다니는 빛 오브와 반짝이는 별 효과
   */
  const MysticalBackground = () => (
    <div className="mystical-bg">
      {/* 떠다니는 빛 오브 */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="orb orb-4"></div>
      
      {/* 반짝이는 별들 */}
      <div className="stars">
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
        <div className="star"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center font-sans relative">
      {/* 몽환적인 배경 */}
      <MysticalBackground />
      
      {/* 메인 앱 컨테이너 */}
      <div className="w-full max-w-[480px] h-[100dvh] bg-black/40 backdrop-blur-sm shadow-2xl relative overflow-hidden flex flex-col border-x border-white/5">
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
