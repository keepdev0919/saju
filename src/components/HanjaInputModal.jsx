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
      // 1. 프리미엄 결제 요청 생성
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/premium`, {
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

      const { paymentData } = await response.json();

      // 2. 포트원 결제 호출
      const IMP = window.IMP;
      if (!IMP) {
        throw new Error('결제 모듈을 불러올 수 없습니다.');
      }

      IMP.init(import.meta.env.VITE_PORTONE_IMP);

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

            // 페이지 새로고침 (프리미엄 데이터 반영)
            window.location.reload();
          } else {
            throw new Error(rsp.error_msg || '결제에 실패했습니다.');
          }
        } catch (error) {
          console.error('결제 처리 오류:', error);
          alert(error.message);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('결제 요청 오류:', error);
      alert(error.message);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">

        {/* 닫기 버튼 */}
        {!isProcessing && (
          <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}

        {/* --- Step 1: 한자 입력 --- */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">이름 새기기</h3>
            <p className="text-slate-400 text-xs mb-6">
              수호신 카드에 새길 본인의 한자(漢字) 이름을<br />
              정확히 입력해주세요. (2~4자)
            </p>

            <input
              type="text"
              value={hanjaName}
              onChange={(e) => {
                const val = e.target.value;
                // 한자만 허용 (CJK Unified Ideographs)
                const validHanja = val.replace(/[^\u4E00-\u9FFF]/g, '');
                if (validHanja.length <= 4) {
                  setHanjaName(validHanja);
                }
              }}
              placeholder="한자 입력 (예: 李敏浩)"
              className="w-full bg-slate-800 border border-slate-600 text-white text-center text-2xl p-4 rounded-xl mb-6 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-slate-600"
              autoFocus
              maxLength={4}
            />

            <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 mb-6 w-full text-left">
              <p className="text-xs text-slate-400 mb-2">프리미엄 업그레이드 포함 내용:</p>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• 수호신 카드에 한자 이름 각인</li>
                <li>• 전체 결과 PDF 다운로드</li>
                <li>• 고화질 이미지 다운로드</li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (!hanjaName || hanjaName.length < 2 || hanjaName.length > 4) {
                  alert('한자 이름은 2~4글자로 입력해주세요.');
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors"
            >
              다음 단계
            </button>
          </div>
        )}

        {/* --- Step 2: 결제 확인 --- */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
              <Lock size={32} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">프리미엄 업그레이드</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              <span className="text-amber-400 font-bold text-lg">"{hanjaName}"</span>(으)로<br />
              수호신 카드를 완성하시겠습니까?
            </p>

            <div className="bg-white/5 w-full p-4 rounded-xl mb-6 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">상품명</span>
                <span className="text-amber-400 font-bold">천명록 프리미엄</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">가격</span>
                <span className="text-xl font-bold text-white">₩100</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {isProcessing ? '결제 처리 중...' : (
                <>
                  <CreditCard size={18} />
                  <span>결제하기</span>
                </>
              )}
            </button>
            {!isProcessing && (
              <button
                onClick={() => setStep(1)}
                className="mt-3 text-slate-500 text-xs hover:text-slate-300"
              >
                이름 수정하기
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default HanjaInputModal;
