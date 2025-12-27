import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPayment, calculateSaju } from '../utils/api';
import { RefreshCw, Sparkles, Lock } from 'lucide-react';

/**
 * 결제 결과 처리 페이지 (Callback)
 * 모바일/하이브리드 결제 시 리다이렉트되어 이곳에서 검증을 수행합니다.
 * 천명록 브랜드 아이덴티티를 유지하며 결제 상태를 확인하는 로딩 화면을 제공합니다.
 */
const PaymentCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('천계(天界)의 응답을 확인하고 있습니다...');
    const hasProcessed = React.useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;

        const processPayment = async () => {
            if (hasProcessed.current) return;
            hasProcessed.current = true;

            // 1. URL 파라미터 파싱
            const imp_uid = searchParams.get('imp_uid');
            const merchant_uid = searchParams.get('merchant_uid'); // merchant_2026_...
            const imp_success = searchParams.get('imp_success');
            const error_msg = searchParams.get('error_msg');

            // 2. 결제 실패 체크
            if (imp_success === 'false' || (error_msg && error_msg !== 'null')) {
                console.error('결제 실패 리다이렉트:', error_msg);
                setStatus('error');
                setMessage(error_msg || '결제가 취소되었거나 실패했습니다.');

                // 3초 후 이전 페이지로 복귀 (또는 메인)
                setTimeout(() => navigate('/'), 3000);
                return;
            }

            // 3. 결제 검증 (서버 통신)
            try {
                if (!imp_uid || !merchant_uid) {
                    if (!imp_uid && !merchant_uid) {
                        navigate('/');
                        return;
                    }
                    throw new Error('결제 정보가 유효하지 않습니다.');
                }

                setMessage('천명(天命)의 봉인을 해제하는 중입니다...');

                // 서버 검증 요청
                const verifyResponse = await verifyPayment({
                    imp_uid,
                    merchant_uid
                });

                if (!verifyResponse.success) {
                    throw new Error(verifyResponse.error || '결제 검증에 실패했습니다.');
                }

                const { accessToken, isPremium } = verifyResponse;

                // 4. AI 분석 요청 (백그라운드 트리거)
                // [FIX] 1차 결제(basic)인 경우에만 AI 생성을 요청 (프리미엄 결제는 생성 불필요)
                if (!isPremium) {
                    calculateSaju({
                        accessToken,
                    }).catch(err => console.warn('Background calc trigger warning:', err));
                }

                // 5. 성공 리다이렉트
                setStatus('success');
                setMessage('정명이 확인되었습니다. 결과 페이지로 이동합니다.');

                // 잠시 후 이동
                setTimeout(() => {
                    if (accessToken) {
                        navigate(`/result/${accessToken}`, { replace: true, state: { isNewPayment: true } });
                    } else {
                        navigate('/', { replace: true });
                    }
                }, 1500);

            } catch (err) {
                console.error('결제 검증 오류:', err);
                setStatus('error');
                setMessage(err.message || '결제 확인 중 오류가 발생했습니다.');
                setTimeout(() => navigate('/'), 3000);
            }
        };

        processPayment();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-[#0f0f10] text-stone-200 flex flex-col items-center justify-center p-8 relative overflow-hidden font-serif">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[#0f0f10] z-0" />
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-full max-h-lg bg-amber-900/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full text-center">

                {/* Visual Indicator */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {status === 'verifying' && (
                        <>
                            <div className="absolute inset-0 border-t border-amber-600/50 rounded-full animate-spin"></div>
                            <div className="absolute inset-2 border-r border-amber-800/30 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                            <RefreshCw size={32} className="text-amber-500 animate-spin-slow opacity-80" />
                        </>
                    )}

                    {status === 'success' && (
                        <div className="animate-fade-in-up">
                            <Sparkles size={48} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="animate-shake">
                            <Lock size={40} className="text-stone-600" />
                            <div className="absolute top-0 right-0 text-red-500 font-bold text-lg">!</div>
                        </div>
                    )}
                </div>

                {/* Text Messages */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-amber-500/90 tracking-[0.2em] leading-relaxed break-keep">
                        {status === 'success' ? '천명 (天命) 확인 완료' :
                            status === 'error' ? '결제 확인 실패' : '결제 확인 중'}
                    </h2>

                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-800/50 to-transparent mx-auto" />

                    <p className="text-stone-400 text-sm font-light tracking-wider leading-7 break-keep whitespace-pre-line animate-pulse">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <p className="absolute bottom-10 text-[10px] text-stone-700 tracking-[0.4em] uppercase">
                    CheonMyeongRok Secure Payment
                </p>

            </div>
        </div>
    );
};

export default PaymentCallback;
