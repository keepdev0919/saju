/**
 * 결과 조회 페이지
 * URL 파라미터로 받은 토큰으로 사주 결과를 조회하는 페이지
 * 결과가 없으면 간편 인증 페이지로 이동
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSajuResult, verifyUser, createPayment, verifyPayment, generatePDF, getPdfDownloadUrl, checkPdfPayment } from '../utils/api';
import { RefreshCw, Download, X, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정
// jsDelivr CDN 사용 (CORS 지원, 안정적)
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// PDF.js 옵션 설정
const pdfjsOptions = {
  cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const ResultPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sajuResult, setSajuResult] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authData, setAuthData] = useState({
    phone: '',
    birthDate: ''
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [pdfPaymentStatus, setPdfPaymentStatus] = useState(null); // 'none', 'paid', 'pending'
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  /**
   * 토큰으로 사주 결과 조회
   */
  useEffect(() => {
    const fetchResult = async () => {
      if (!token) {
        setError('토큰이 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const response = await getSajuResult(token);
        setSajuResult(response.result);
        setUserInfo(response.user || null);
        
        // PDF 결제 여부 확인
        if (response.user && response.user.id) {
          checkPdfPaymentStatus(response.user.id);
        }
        
        setLoading(false);
      } catch (err) {
        // 결과가 없으면 간편 인증 페이지 표시
        if (err.status === 404) {
          setShowAuth(true);
          setLoading(false);
        } else {
          setError(err.message || '결과를 불러오는데 실패했습니다.');
          setLoading(false);
        }
      }
    };

    fetchResult();
  }, [token]);

  /**
   * 간편 인증 처리
   */
  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (!authData.phone || !authData.birthDate) {
      setAuthError('휴대폰 번호와 생년월일을 입력해주세요.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await verifyUser({
        phone: authData.phone,
        birthDate: authData.birthDate
      });

      // 인증 성공 시 토큰으로 다시 결과 조회
      if (response.user && response.user.accessToken) {
        const resultResponse = await getSajuResult(response.user.accessToken);
        setSajuResult(resultResponse.result);
        setUserInfo(response.user);
        setShowAuth(false);
      }
    } catch (err) {
      setAuthError(err.message || '인증에 실패했습니다. 정보를 확인해주세요.');
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * 날짜 포맷팅
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  };

  /**
   * PDF 결제 여부 확인
   */
  const checkPdfPaymentStatus = async (userId) => {
    if (!token) return;
    
    try {
      const response = await checkPdfPayment(token);
      if (response.success && response.hasPaid) {
        setPdfPaymentStatus('paid');
      } else {
        setPdfPaymentStatus('none');
      }
    } catch (err) {
      console.error('PDF 결제 상태 확인 실패:', err);
      setPdfPaymentStatus('none');
    }
  };

  /**
   * PDF 미리보기 (워터마크 포함)
   */
  const handlePdfPreview = async () => {
    if (!userInfo || !userInfo.id || !sajuResult || !sajuResult.id) {
      setPdfError('필수 정보가 없습니다.');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      console.log('🔍 PDF 미리보기 요청:', {
        userId: userInfo.id,
        resultId: sajuResult.id
      });

      // 미리보기 PDF 생성 (워터마크 포함)
      const pdfBlob = await generatePDF({
        userId: userInfo.id,
        resultId: sajuResult.id,
        preview: true
      });

      console.log('✅ PDF Blob 받음:', {
        type: pdfBlob?.constructor?.name,
        size: pdfBlob?.size,
        blob: pdfBlob
      });

      // Blob이 제대로 받아졌는지 확인
      if (!pdfBlob || !(pdfBlob instanceof Blob)) {
        throw new Error('PDF 데이터를 받을 수 없습니다.');
      }

      // PDF.js가 Blob을 직접 사용할 수 있도록 Blob URL 생성
      const url = URL.createObjectURL(pdfBlob);
      console.log('📄 Blob URL 생성:', url);
      
      setPdfPreviewUrl(url);
      setPageNumber(1); // 페이지 초기화
      setScale(1.0); // 줌 초기화
      setShowPdfPreview(true);
      setPdfLoading(false);

    } catch (err) {
      console.error('❌ PDF 미리보기 오류:', err);
      setPdfError(err.message || 'PDF 미리보기를 불러올 수 없습니다.');
      setPdfLoading(false);
    }
  };

  /**
   * PDF 미리보기 모달 닫기
   */
  const handleClosePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setShowPdfPreview(false);
    setPageNumber(1);
    setScale(1.0);
    setNumPages(null);
  };

  /**
   * PDF 결제 프로세스 시작
   */
  const handlePdfPayment = async () => {
    if (!userInfo || !userInfo.id) {
      setPdfError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      // 포트원 스크립트 확인
      if (typeof window.IMP === 'undefined') {
        setPdfError('결제 시스템을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
        setPdfLoading(false);
        return;
      }

      // PDF 결제 금액 (환경 변수 또는 기본값)
      const pdfAmount = parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_PDF || '100', 10);

      // 1. 결제 요청 생성
      const paymentResponse = await createPayment({
        userId: userInfo.id,
        amount: pdfAmount,
        productType: 'pdf'
      });

      const { merchantUid } = paymentResponse;

      // 2. 포트원 초기화
      const IMP = window.IMP;
      const IMP_KEY = import.meta.env.VITE_PORTONE_IMP_KEY || 'imp12345678';
      IMP.init(IMP_KEY);

      // 3. 결제 요청
      IMP.request_pay({
        pg: 'html5_inicis',
        pay_method: 'card',
        merchant_uid: merchantUid,
        name: '사주 PDF 다운로드',
        amount: pdfAmount,
        buyer_name: userInfo.name,
        buyer_tel: userInfo.phone || '',
        m_redirect_url: `${window.location.origin}/payment/callback`
      }, async (rsp) => {
        if (rsp.success) {
          // 결제 성공 시 검증 및 PDF 생성
          await processPdfPaymentSuccess(rsp.imp_uid, merchantUid);
        } else {
          setPdfError(rsp.error_msg || '결제에 실패했습니다.');
          setPdfLoading(false);
        }
      });

    } catch (err) {
      console.error('PDF 결제 요청 오류:', err);
      setPdfError(err.message || '결제 요청에 실패했습니다.');
      setPdfLoading(false);
    }
  };

  /**
   * PDF 결제 성공 후 처리
   */
  const processPdfPaymentSuccess = async (impUid, merchantUid) => {
    try {
      // 1. 결제 검증
      const verifyResponse = await verifyPayment({
        imp_uid: impUid,
        merchant_uid: merchantUid
      });

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.error || '결제 검증에 실패했습니다.');
      }

      // 2. PDF 생성
      if (!sajuResult || !sajuResult.id) {
        throw new Error('사주 결과를 찾을 수 없습니다.');
      }

      const pdfResponse = await generatePDF({
        userId: userInfo.id,
        resultId: sajuResult.id
      });

      if (pdfResponse.success) {
        // PDF 다운로드
        const pdfUrl = getPdfDownloadUrl(token);
        window.open(pdfUrl, '_blank');
        setPdfPaymentStatus('paid');
      } else {
        throw new Error('PDF 생성에 실패했습니다.');
      }

    } catch (err) {
      console.error('PDF 결제 후 처리 오류:', err);
      setPdfError(err.message || 'PDF 생성에 실패했습니다.');
    } finally {
      setPdfLoading(false);
    }
  };

  /**
   * PDF 다운로드 (이미 결제한 경우)
   */
  const handlePdfDownload = async () => {
    if (!token) {
      setPdfError('토큰이 없습니다.');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      // PDF 생성 (결제 여부는 백엔드에서 확인)
      if (!sajuResult || !sajuResult.id || !userInfo || !userInfo.id) {
        throw new Error('필수 정보가 없습니다.');
      }

      const pdfResponse = await generatePDF({
        userId: userInfo.id,
        resultId: sajuResult.id
      });

      if (pdfResponse.success) {
        const pdfUrl = getPdfDownloadUrl(token);
        window.open(pdfUrl, '_blank');
      } else {
        throw new Error('PDF 생성에 실패했습니다.');
      }

    } catch (err) {
      console.error('PDF 다운로드 오류:', err);
      setPdfError(err.message || 'PDF 다운로드에 실패했습니다.');
    } finally {
      setPdfLoading(false);
    }
  };

  /**
   * 로딩 화면
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mb-8 mx-auto">
            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-400">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  /**
   * 간편 인증 화면
   */
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-2">본인 확인</h2>
            <p className="text-slate-400 text-sm mb-6">
              사주 결과를 조회하기 위해 본인 확인이 필요합니다.
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">휴대폰 번호</label>
                <input
                  type="tel"
                  value={authData.phone}
                  onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">생년월일</label>
                <input
                  type="date"
                  value={authData.birthDate}
                  onChange={(e) => setAuthData({ ...authData, birthDate: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {authError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-300 text-sm">{authError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !authData.phone || !authData.birthDate}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  authLoading || !authData.phone || !authData.birthDate
                    ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 hover:opacity-90'
                }`}
              >
                {authLoading ? '확인 중...' : '확인하기'}
              </button>
            </form>

            <button
              onClick={() => navigate('/')}
              className="w-full mt-4 text-slate-400 text-sm hover:text-white transition-colors"
            >
              처음으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 에러 화면
   */
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-pink-500 text-white px-6 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            처음으로
          </button>
        </div>
      </div>
    );
  }

  /**
   * 결과 표시 화면
   */
  if (!sajuResult) {
    return null;
  }

  // 오행 데이터 변환
  const ohengData = [
    { label: '목(木)', val: sajuResult.oheng?.목 || 20, color: 'bg-green-500' },
    { label: '화(火)', val: sajuResult.oheng?.화 || 60, color: 'bg-red-500' },
    { label: '토(土)', val: sajuResult.oheng?.토 || 10, color: 'bg-yellow-500' },
    { label: '금(金)', val: sajuResult.oheng?.금 || 5, color: 'bg-slate-400' },
    { label: '수(水)', val: sajuResult.oheng?.수 || 5, color: 'bg-blue-500' },
  ];

  // 운세 카드 데이터
  const fortuneCards = [
    { 
      emoji: '💰', 
      title: '재물운', 
      score: sajuResult.scores?.wealth || 78,
      content: sajuResult.wealthFortune || '재물운 정보를 불러오는 중...'
    },
    { 
      emoji: '❤️', 
      title: '애정운', 
      score: sajuResult.scores?.love || 85,
      content: sajuResult.loveFortune || '애정운 정보를 불러오는 중...'
    },
    { 
      emoji: '💼', 
      title: '직장운', 
      score: sajuResult.scores?.career || 72,
      content: sajuResult.careerFortune || '직장운 정보를 불러오는 중...'
    },
    { 
      emoji: '🏥', 
      title: '건강운', 
      score: sajuResult.scores?.health || 65,
      content: sajuResult.healthFortune || '건강운 정보를 불러오는 중...'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-y-auto print:bg-white font-sans">
      {/* 헤더 */}
      <div className="p-4 bg-black/30 backdrop-blur-sm flex justify-between items-center sticky top-0 z-50">
        <div className="font-bold text-lg">사주결과</div>
        <button 
          onClick={() => navigate('/')} 
          className="text-sm bg-white/10 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-colors"
        >
          처음으로
        </button>
      </div>
      
      <div className="p-6 pb-48 space-y-8">
        {/* 기본 정보 요약 */}
        <div className="text-center space-y-3 pb-6 border-b border-white/10">
          {userInfo && (
            <>
              <p className="text-slate-400 font-medium text-sm">
                {formatDate(userInfo.birthDate)}생 · {userInfo.gender === 'male' ? '남성' : '여성'}
              </p>
              <h1 className="text-4xl font-bold text-white font-serif">
                {userInfo.name}님의 운명
              </h1>
            </>
          )}
          <div className="inline-block bg-gradient-to-r from-pink-500 to-rose-500 text-white px-5 py-2 rounded-full text-sm font-bold mt-3 shadow-lg shadow-pink-500/30">
            ✨ 총평: {sajuResult.overallFortune || '대기만성형 (大器晩成)'}
          </div>
        </div>
        
        {/* 2026년 종합 점수 */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
          <h3 className="text-center text-slate-400 text-sm mb-3">2026년 종합운세</h3>
          <div className="flex items-center justify-center gap-2">
            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              {sajuResult.scores?.overall || 82}
            </span>
            <span className="text-2xl text-slate-400">/100</span>
          </div>
          <p className="text-center text-slate-400 text-sm mt-2">상위 18%의 좋은 운세입니다</p>
        </div>
        
        {/* 오행 그래프 */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
            <RefreshCw size={18} className="text-slate-400"/> 오행 분석
          </h3>
          <div className="space-y-4">
            {ohengData.map((el) => (
              <div key={el.label} className="flex items-center gap-3">
                <span className="w-12 text-sm font-bold text-slate-300">{el.label}</span>
                <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                  <div 
                    className={`h-full ${el.color} rounded-full`} 
                    style={{ width: `${el.val}%` }}
                  ></div>
                </div>
                <span className="text-sm text-slate-400 w-10 text-right font-mono">{el.val}%</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 상세 운세 카드들 */}
        <div className="space-y-4">
          {fortuneCards.map((card) => (
            <div 
              key={card.title} 
              className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10"
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
              <div className="w-full bg-white/10 rounded-full h-2 mb-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                  style={{ width: `${card.score}%` }}
                ></div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                {card.content}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* 하단 PDF 다운로드 영역 */}
      <div className="fixed bottom-0 left-0 w-full print:hidden">
        <div className="bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent h-20 pointer-events-none"></div>
        <div className="bg-slate-900 p-4 pb-6">
          <div className="max-w-[480px] mx-auto space-y-3">
            {pdfError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-300 text-sm">{pdfError}</p>
              </div>
            )}
            
            {pdfPaymentStatus === 'paid' ? (
              // 이미 결제한 경우: 바로 다운로드
              <button 
                onClick={handlePdfDownload}
                disabled={pdfLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={20} /> 
                {pdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드'}
              </button>
            ) : (
              // 결제 전: 미리보기 + 결제 버튼
              <div className="space-y-2">
                <button 
                  onClick={handlePdfPreview}
                  disabled={pdfLoading}
                  className="w-full bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye size={18} /> 
                  {pdfLoading ? '로딩 중...' : 'PDF 미리보기'}
                </button>
                <button 
                  onClick={handlePdfPayment}
                  disabled={pdfLoading}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={20} /> 
                  {pdfLoading ? '결제 진행 중...' : `전체 PDF 구매하기 (${parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_PDF || '100', 10).toLocaleString()}원)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF 미리보기 모달 */}
      {showPdfPreview && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-white font-bold text-lg">PDF 미리보기</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = pdfPreviewUrl;
                    link.download = '사주결과_미리보기.pdf';
                    link.click();
                  }}
                  className="text-white hover:text-pink-400 transition-colors text-sm"
                >
                  다운로드
                </button>
                <button
                  onClick={handleClosePdfPreview}
                  className="text-white hover:text-red-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* PDF 뷰어 */}
            <div className="flex-1 overflow-auto bg-gray-100 flex flex-col">
              {/* PDF 컨트롤 바 */}
              <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                    disabled={pageNumber <= 1}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="이전 페이지"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-700 px-2">
                    {pageNumber} / {numPages || '-'}
                  </span>
                  <button
                    onClick={() => setPageNumber(prev => Math.min(numPages || 1, prev + 1))}
                    disabled={pageNumber >= (numPages || 1)}
                    className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="다음 페이지"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                    title="줌 아웃"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="text-sm text-gray-700 px-2 min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale(prev => Math.min(2.0, prev + 0.25))}
                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                    title="줌 인"
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>
              </div>

              {/* PDF 문서 */}
              <div className="flex-1 flex items-center justify-center p-4">
                {pdfLoading ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">PDF 로딩 중...</p>
                  </div>
                ) : (
                  <Document
                    file={pdfPreviewUrl}
                    options={pdfjsOptions}
                    onLoadSuccess={({ numPages }) => {
                      console.log('✅ PDF 로드 성공:', numPages, '페이지');
                      setNumPages(numPages);
                    }}
                    onLoadError={(error) => {
                      console.error('❌ PDF 로드 실패:', error);
                      console.error('상세 오류:', {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                      });
                      setPdfError(`PDF를 불러올 수 없습니다: ${error.message}`);
                    }}
                    loading={
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">PDF 로딩 중...</p>
                      </div>
                    }
                    className="flex justify-center"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="shadow-lg"
                    />
                  </Document>
                )}
              </div>
            </div>
            
            {/* 하단 안내 */}
            <div className="p-4 border-t border-white/10 bg-slate-800/50">
              <p className="text-slate-400 text-sm text-center mb-2">
                💡 워터마크 없는 전체 PDF를 다운로드하려면 결제가 필요합니다.
              </p>
              <button
                onClick={() => {
                  handleClosePdfPreview();
                  handlePdfPayment();
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                전체 PDF 구매하기 ({parseInt(import.meta.env.VITE_PAYMENT_AMOUNT_PDF || '100', 10).toLocaleString()}원)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultPage;

