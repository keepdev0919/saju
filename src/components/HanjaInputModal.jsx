import React, { useState } from 'react';
import { X, Lock, CheckCircle, CreditCard } from 'lucide-react';

const HanjaInputModal = ({ isOpen, onClose, onSubmit, accessToken }) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Payment Confirm
  const [hanjaName, setHanjaName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!hanjaName || hanjaName.length < 2 || hanjaName.length > 4) {
      alert('한자 이름은 2~4글자로 입력해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      // API URL이 없으면 현재 호스트의 3000 포트로 폴백
      const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;

      // 1. 프리미엄 결제 요청 생성
      const response = await fetch(`${apiUrl}/api/payment/premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: accessToken,
          hanjaName: hanjaName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '결제 요청 생성에 실패했습니다.');
      }

      const data = await response.json();
      const merchantUid = data.merchantUid;

      // 2. 포트원 결제 호출
      const IMP = window.IMP;
      if (!IMP) {
        throw new Error('결제 모듈을 불러올 수 없습니다.');
      }

      const impKey = import.meta.env.VITE_PORTONE_IMP_KEY || 'imp12345678';
      IMP.init(impKey);

      // 결제 데이터 구성
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const paymentData = {
        pg: 'html5_inicis',
        pay_method: 'card',
        merchant_uid: merchantUid,
        name: '천명록 프리미엄 업그레이드',
        amount: 100, // 테스트 금액
      };

      if (isMobile) {
        paymentData.m_redirect_url = `${window.location.origin}/payment/callback`;
      }

      IMP.request_pay(paymentData, async (rsp) => {
        try {
          if (rsp.success) {
            // 3. 결제 검증
            const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imp_uid: rsp.imp_uid,
                merchant_uid: rsp.merchant_uid
              })
            });

            if (!verifyResponse.ok) {
              throw new Error('결제 검증에 실패했습니다.');
            }

            // 4. 성공 처리
            onSubmit(hanjaName);
            setIsProcessing(false);
            onClose();
            setStep(1); // Reset
            setHanjaName('');

            // 페이지 새로고침 대신 부모 컴포넌트(ResultPage)가 데이터를 갱신하도록 처리
            // window.location.reload(); 
          } else {
            // 상세 에러 정보 표시
            alert(`[결제 실패]\nerror_code: ${rsp.error_code}\nerror_msg: ${rsp.error_msg}`);
            throw new Error(rsp.error_msg || '결제에 실패했습니다.');
          }
        } catch (error) {
          console.error('결제 처리 오류:', error);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('결제 요청 오류:', error);
      alert(`[요청 오류] ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setStep(1);
      setHanjaName('');
      onClose();
    }
  };

  // 인장에 새겨질 이름 (TalismanCard 로직과 동일)
  const getSealDisplayName = () => {
    if (!hanjaName) return '天命錄';
    let displayName = hanjaName;
    if (displayName.length === 2) displayName = displayName + '之印';
    else if (displayName.length === 3) displayName = displayName + '印';
    return displayName;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      {/* 전통적인 두루마리 스타일 모달 */}
      <div className="bg-[#0a0a0c] w-full max-w-sm relative overflow-hidden shadow-2xl">

        {/* 장식용 이중 테두리 */}
        <div className="absolute inset-0 border border-amber-900/30 pointer-events-none" />
        <div className="absolute inset-[3px] border border-amber-800/20 pointer-events-none" />

        {/* 코너 장식 */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-600/50 pointer-events-none" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-600/50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-600/50 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-600/50 pointer-events-none" />

        {/* 닫기 버튼 */}
        {!isProcessing && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-stone-600 hover:text-stone-400 transition-colors z-20"
          >
            <X size={18} />
          </button>
        )}

        {/* 컨텐츠 영역 */}
        <div className="relative z-10 p-8">

          {/* --- Step 1: 한자 입력 --- */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center animate-fade-in">

              {/* 타이틀 */}
              <div className="mb-6">
                <span className="text-amber-600/80 font-serif text-2xl tracking-widest">印</span>
                <h3 className="text-amber-500 font-serif font-bold text-lg tracking-[0.2em] mt-2">이름 각인</h3>
                <p className="text-stone-500 text-[11px] mt-2 leading-relaxed">
                  수호신 카드에 새길 한자(漢字) 이름을<br />
                  정확히 입력해주세요
                </p>
              </div>

              {/* 한자 입력창 - 붓글씨 스타일 */}
              <div className="w-full mb-6">
                <input
                  type="text"
                  value={hanjaName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const validHanja = val.replace(/[^\u4E00-\u9FFF]/g, '');
                    if (validHanja.length <= 4) {
                      setHanjaName(validHanja);
                    }
                  }}
                  placeholder="李敏浩"
                  className="w-full bg-transparent border-b-2 border-amber-900/40 text-amber-100 text-center text-3xl py-4 font-serif tracking-[0.3em] focus:border-amber-600 outline-none placeholder:text-stone-700 placeholder:tracking-[0.3em]"
                  autoFocus
                  maxLength={4}
                />
                <p className="text-stone-600 text-[10px] mt-2">2~4글자</p>
              </div>

              {/* 다음 버튼 */}
              <button
                onClick={() => {
                  if (!hanjaName || hanjaName.length < 2 || hanjaName.length > 4) {
                    alert('한자 이름은 2~4글자로 입력해주세요.');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full relative group overflow-hidden py-3 border border-amber-700/50 bg-gradient-to-r from-amber-950/30 to-transparent transition-all duration-500 hover:border-amber-600 active:scale-[0.98]"
              >
                <div className="relative flex items-center justify-center gap-3">
                  <div className="w-8 h-px bg-amber-700/50 group-hover:w-12 transition-all duration-500" />
                  <span className="text-amber-500 font-serif tracking-[0.2em] text-sm">다음 단계</span>
                  <div className="w-8 h-px bg-amber-700/50 group-hover:w-12 transition-all duration-500" />
                </div>
              </button>
            </div>
          )}

          {/* --- Step 2: 결제 확인 --- */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center animate-fade-in">


              {/* 최종 확인 인장 - TalismanCard와 동일한 2x2 그리드 */}
              <div className="mb-6">
                <div className="w-20 h-20 border-double border-4 border-red-700/80 bg-red-950/10 mx-auto flex items-center justify-center" style={{ borderRadius: '4px' }}>
                  <div className="w-full h-full flex flex-col items-center justify-center text-red-700/90 font-serif font-black leading-none p-1 text-2xl" style={{ fontFamily: '"Gungsuh", "Batang", serif' }}>
                    {(() => {
                      const displayName = getSealDisplayName();
                      if (displayName.length === 4) {
                        return (
                          <div className="grid grid-cols-2 gap-0 w-full h-full text-center items-center justify-center leading-none">
                            <span className="flex items-center justify-center w-full h-full">{displayName[0]}</span>
                            <span className="flex items-center justify-center w-full h-full">{displayName[1]}</span>
                            <span className="flex items-center justify-center w-full h-full">{displayName[2]}</span>
                            <span className="flex items-center justify-center w-full h-full">{displayName[3]}</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-lg" style={{ writingMode: 'vertical-rl' }}>
                            {displayName.slice(0, 4)}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
                <p className="text-stone-500 text-[11px] mt-3">
                  위와 같이 각인됩니다
                </p>
              </div>

              {/* 결제 정보 */}
              <div className="w-full border border-stone-800/50 p-4 mb-6 bg-stone-900/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-stone-500 text-xs">상품</span>
                  <span className="text-amber-500 font-serif text-sm">천명록 프리미엄</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 text-xs">결제 금액</span>
                  <span className="text-white font-bold text-lg">₩100</span>
                </div>
              </div>

              {/* 결제 버튼 */}
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full relative group overflow-hidden py-3.5 border-2 border-amber-600/70 bg-gradient-to-r from-amber-900/40 to-amber-950/20 transition-all duration-500 hover:border-amber-500 hover:from-amber-800/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative flex items-center justify-center gap-3">
                  {isProcessing ? (
                    <span className="text-amber-400 font-serif tracking-widest text-sm animate-pulse">결제 처리 중...</span>
                  ) : (
                    <>
                      <CreditCard size={16} className="text-amber-500" />
                      <span className="text-amber-400 font-serif font-bold tracking-[0.15em] text-sm">결제하기</span>
                    </>
                  )}
                </div>
              </button>

              {/* 뒤로가기 */}
              {!isProcessing && (
                <button
                  onClick={() => setStep(1)}
                  className="mt-4 text-stone-600 text-[11px] hover:text-stone-400 transition-colors"
                >
                  ← 이름 수정하기
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HanjaInputModal;
