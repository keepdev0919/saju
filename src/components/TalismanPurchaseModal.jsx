import React, { useState } from 'react';
import { X, Lock, CheckCircle, CreditCard } from 'lucide-react';

const TalismanPurchaseModal = ({ isOpen, onClose, onUnlock }) => {
    const [step, setStep] = useState(1); // 1: Info, 2: Input, 3: Success
    const [hanjaName, setHanjaName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handlePurchase = () => {
        setIsProcessing(true);
        // 1초 뒤 결제 성공 시뮬레이션
        setTimeout(() => {
            setIsProcessing(false);
            setStep(2);
        }, 1000);
    };

    const handleConfirm = () => {
        if (!hanjaName || hanjaName.length < 2 || hanjaName.length > 4) {
            alert('한자 이름은 2~4글자로 입력해주세요.');
            return;
        }
        onUnlock(hanjaName);
        setStep(3);
        // 1.5초 후 닫기
        setTimeout(() => {
            onClose();
            setStep(1); // Reset
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">

                {/* 닫기 버튼 */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>

                {/* --- Step 1: 한자 입력 (Input First) --- */}
                {step === 1 && (
                    <div className="flex flex-col items-center text-center animate-fade-in">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
                            <span className="text-2xl">✍️</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">수호신에게 알릴 이름</h3>
                        <p className="text-slate-400 text-xs mb-6">
                            부적에 새길 본인의 한자(漢字) 이름을<br />
                            정확히 입력해주세요. (2~4자)
                        </p>

                        <input
                            type="text"
                            value={hanjaName}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Only allow CJK Unified, Ext A, Compatibility Ideographs
                                // Filter out anything that is NOT a Hanja character
                                const validHanja = val.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, '');
                                setHanjaName(validHanja);
                            }}
                            placeholder="한자 입력 (예: 洪吉童)"
                            className="w-full bg-slate-800 border border-slate-600 text-white text-center text-2xl p-4 rounded-xl mb-6 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-slate-600"
                            autoFocus
                        />

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
                            입력 완료
                        </button>
                    </div>
                )}

                {/* --- Step 2: 결제 및 완성 (Payment) --- */}
                {step === 2 && (
                    <div className="flex flex-col items-center text-center animate-fade-in">
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
                            <Lock size={32} className="text-amber-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">나만의 수호 부적 완성하기</h3>
                        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                            <span className="text-amber-400 font-bold text-lg">"{hanjaName}"</span>(으)로<br />
                            부적을 완성하고 소장하시겠습니까?
                        </p>

                        <div className="bg-white/5 w-full p-4 rounded-xl mb-6 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-300">상품명</span>
                                <span className="text-amber-400 font-bold">프리미엄 수호 부적</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">가격</span>
                                <span className="text-xl font-bold text-white">₩1,000</span>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setIsProcessing(true);
                                // 1초 뒤 결제 성공 시뮬레이션
                                setTimeout(() => {
                                    setIsProcessing(false);
                                    onUnlock(hanjaName);
                                    setStep(3);
                                    // 1.5초 후 닫기
                                    setTimeout(() => {
                                        onClose();
                                        setStep(1); // Reset
                                    }, 1500);
                                }, 1000);
                            }}
                            disabled={isProcessing}
                            className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {isProcessing ? '결제 처리 중...' : (
                                <>
                                    <CreditCard size={18} />
                                    <span>지금 바로 소장하기</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setStep(1)}
                            className="mt-3 text-slate-500 text-xs hover:text-slate-300"
                        >
                            이름 수정하기
                        </button>
                    </div>
                )}

                {/* --- Step 3: 완료 --- */}
                {step === 3 && (
                    <div className="flex flex-col items-center text-center py-8 animate-pulse">
                        <CheckCircle size={48} className="text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-white">부적이 완성되었습니다!</h3>
                        <p className="text-slate-400 text-sm mt-2">수호신이 귀하와 함께합니다.</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default TalismanPurchaseModal;
