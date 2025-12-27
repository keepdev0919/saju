import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, Lock, Sun, ShieldCheck, Info } from 'lucide-react';
import TalismanPurchaseModal from './TalismanPurchaseModal';

// Helper function: 보관소 가리기 효과 (모든 카드 동일 적용)
const getBlurEffectClass = () => {
    return 'blur-effect-mosaic';
};

const TalismanCard = forwardRef(({
    type = 'water',
    userName = '사용자',
    initialStampName = null, // [NEW] DB에서 가져온 한자 이름 (프리미엄 유저)
    talismanData,
    reason,
    activeTab = 'image',
    onFlip,
    isPurchased = false,
    setIsPurchased,
    isArchiveMode = false,
    isFlipped: controlledFlipped, // [NEW] 외부 제어용 prop
    onClick: customOnClick       // [NEW] 외부 클릭 핸들러
}, ref) => {
    const [internalFlipped, setInternalFlipped] = useState(false); // 로컬 상태
    const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;
    // [NEW] initialStampName이 있으면 그걸 사용, 없으면 userName 사용
    const [stampName, setStampName] = useState(initialStampName || userName);

    // [FIX] initialStampName이 변경되면(예: 결제 후) state도 업데이트
    useEffect(() => {
        if (initialStampName) {
            setStampName(initialStampName);
        }
    }, [initialStampName]);

    const [showModal, setShowModal] = useState(false);
    const cardRef = useRef(null);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        handleDownload
    }));

    // 이미지 매핑
    const images = {
        water: '/images/talisman/water.png',
        fire: '/images/talisman/fire.png',
        gapja: '/images/talisman/gapja.png',
        gapsul: '/images/talisman/gapsul.png',
        gapsin: '/images/talisman/gapsin.png',
        gapo: '/images/talisman/gapo.png',
        gapjin: '/images/talisman/gapjin.png',
        gapin: '/images/talisman/gapin.png',
        // Korean Mappings for Test Mode
        '갑자': '/images/talisman/gapja.png',
        '갑술': '/images/talisman/gapsul.png',
        '갑신': '/images/talisman/gapsin.png',
        '갑오': '/images/talisman/gapo.png',
        '갑진': '/images/talisman/gapjin.png',
        '갑인': '/images/talisman/gapin.png',

        // 2. Eul (Wood) Series
        eulchuk: '/images/talisman/eulchuk.png',
        eulhae: '/images/talisman/eulhae.png',
        eulyu: '/images/talisman/eulyu.png',
        eulmi: '/images/talisman/eulmi.png',
        eulsa: '/images/talisman/eulsa.png',
        eulmyo: '/images/talisman/eulmyo.png',
        // Korean Mappings (Eul)
        '을축': '/images/talisman/eulchuk.png',
        '을해': '/images/talisman/eulhae.png',
        '을유': '/images/talisman/eulyu.png',
        '을미': '/images/talisman/eulmi.png',
        '을사': '/images/talisman/eulsa.png',
        '을묘': '/images/talisman/eulmyo.png',

        // 3. Byeong (Fire) Series
        byeongin: '/images/talisman/byeongin.png',
        byeongja: '/images/talisman/byeongja.png',
        byeongsul: '/images/talisman/byeongsul.png',
        byeongshin: '/images/talisman/byeongshin.png',
        byeongo: '/images/talisman/byeongo.png',
        byeongjin: '/images/talisman/byeongjin.png',
        // Korean Mappings (Byeong)
        '병인': '/images/talisman/byeongin.png',
        '병자': '/images/talisman/byeongja.png',
        '병술': '/images/talisman/byeongsul.png',
        '병신': '/images/talisman/byeongshin.png',
        '병오': '/images/talisman/byeongo.png',
        '병진': '/images/talisman/byeongjin.png',

        // 4. Jeong (Fire) Series
        jeongmyo: '/images/talisman/jeongmyo.png',
        jeongchuk: '/images/talisman/jeongchuk.png',
        jeonghae: '/images/talisman/jeonghae.png',
        jeongyu: '/images/talisman/jeongyu.png',
        jeongmi: '/images/talisman/jeongmi.png',
        jeongsa: '/images/talisman/jeongsa.png',
        // Korean Mappings (Jeong)
        '정묘': '/images/talisman/jeongmyo.png',
        '정축': '/images/talisman/jeongchuk.png',
        '정해': '/images/talisman/jeonghae.png',
        '정유': '/images/talisman/jeongyu.png',
        '정미': '/images/talisman/jeongmi.png',
        '정사': '/images/talisman/jeongsa.png',

        // 5. Mu (Earth) Series
        muin: '/images/talisman/muin.png',
        muja: '/images/talisman/muja.png',
        musul: '/images/talisman/musul.png',
        mushin: '/images/talisman/mushin.png',
        muo: '/images/talisman/muo.png',
        mujin: '/images/talisman/mujin.png',
        // Korean Mappings (Mu)
        '무인': '/images/talisman/muin.png',
        '무자': '/images/talisman/muja.png',
        '무술': '/images/talisman/musul.png',
        '무신': '/images/talisman/mushin.png',
        '무오': '/images/talisman/muo.png',
        '무진': '/images/talisman/mujin.png',

        // 6. Gi (Earth) Series
        gimyo: '/images/talisman/gimyo.png',
        gichuk: '/images/talisman/gichuk.png',
        gihae: '/images/talisman/gihae.png',
        giyu: '/images/talisman/giyu.png',
        gimi: '/images/talisman/gimi.png',
        gisa: '/images/talisman/gisa.png',
        // Korean Mappings (Gi)
        '기묘': '/images/talisman/gimyo.png',
        '기축': '/images/talisman/gichuk.png',
        '기해': '/images/talisman/gihae.png',
        '기유': '/images/talisman/giyu.png',
        '기미': '/images/talisman/gimi.png',
        '기사': '/images/talisman/gisa.png',

        // 7. Gyeong (Metal) Series
        gyeongo: '/images/talisman/gyeongo.png',
        gyeongjin: '/images/talisman/gyeongjin.png',
        gyeongin: '/images/talisman/gyeongin.png',
        gyeongja: '/images/talisman/gyeongja.png',
        gyeongsul: '/images/talisman/gyeongsul.png',
        gyeongshin: '/images/talisman/gyeongshin.png',
        // Korean Mappings (Gyeong)
        '경오': '/images/talisman/gyeongo.png',
        '경진': '/images/talisman/gyeongjin.png',
        '경인': '/images/talisman/gyeongin.png',
        '경자': '/images/talisman/gyeongja.png',
        '경술': '/images/talisman/gyeongsul.png',
        '경신': '/images/talisman/gyeongshin.png',

        // 8. Shin (Metal) Series
        shinmi: '/images/talisman/shinmi.png',
        shinsa: '/images/talisman/shinsa.png',
        shinmyo: '/images/talisman/shinmyo.png',
        shinchuk: '/images/talisman/shinchuk.png',
        shinhae: '/images/talisman/shinhae.png',
        shinyu: '/images/talisman/shinyu.png',
        // Korean Mappings (Shin)
        '신미': '/images/talisman/shinmi.png',
        '신사': '/images/talisman/shinsa.png',
        '신묘': '/images/talisman/shinmyo.png',
        '신축': '/images/talisman/shinchuk.png',
        '신해': '/images/talisman/shinhae.png',
        '신유': '/images/talisman/shinyu.png',

        // 9. Im (Water) Series
        imin: '/images/talisman/imin.png',
        imja: '/images/talisman/imja.png',
        imsul: '/images/talisman/imsul.png',
        imshin: '/images/talisman/imshin.png',
        imo: '/images/talisman/imo.png',
        imjin: '/images/talisman/imjin.png',
        // Korean Mappings (Im)
        '임인': '/images/talisman/imin.png',
        '임자': '/images/talisman/imja.png',
        '임술': '/images/talisman/imsul.png',
        '임신': '/images/talisman/imshin.png',
        '임오': '/images/talisman/imo.png',
        '임진': '/images/talisman/imjin.png',

        // 10. Gye (Water) Series
        gyemyo: '/images/talisman/gyemyo.png',
        gyechuk: '/images/talisman/gyechuk.png',
        gyehae: '/images/talisman/gyehae.png',
        gyeyu: '/images/talisman/gyeyu.png',
        gyemi: '/images/talisman/gyemi.png',
        gyesa: '/images/talisman/gyesa.png',
        // Korean Mappings (Gye)
        '계묘': '/images/talisman/gyemyo.png',
        '계축': '/images/talisman/gyechuk.png',
        '계해': '/images/talisman/gyehae.png',
        '계유': '/images/talisman/gyeyu.png',
        '계미': '/images/talisman/gyemi.png',
        '계사': '/images/talisman/gyesa.png',
    };

    const descriptions = {
        water: {
            title: '청룡 승천 부적',
            desc: '부족한 물의 기운을 채워주며, 흐르는 물처럼 유연한 지혜와 재물운을 불러옵니다.',
            keyword: '지혜 & 유연성'
        },
        fire: {
            title: '태양 솟대 부적',
            desc: '부족한 화의 기운을 보완하며, 타오르는 태양처럼 강력한 열정과 추진력을 상징합니다.',
            keyword: '열정 & 추진력'
        }
    };

    const bgImage = images[type] || images.water;

    // [Modified] Use passed talismanData if available, otherwise fallback to defaults
    const info = talismanData ? {
        title: talismanData.name.split(' (')[0], // "청송의 현자"
        hanja: talismanData.name.match(/\(([^)]+)\)/)?.[1] || '天命守護', // Extract "靑松賢者" or default to 'Heavens Protection'
        desc: talismanData.desc,
        keyword: '천명 수호'
    } : (descriptions[type] || descriptions.water);

    // 카드 제목 스타일 공통화
    const titleTextClass = 'text-3xl font-bold text-[#f5efe0] tracking-[0.15em] drop-shadow-2xl mb-1';

    // 부적 저장하기 (html2canvas)
    const handleDownload = async () => {
        console.log('🔍 handleDownload 호출됨');
        console.log('isPurchased:', isPurchased);
        console.log('cardRef.current:', cardRef.current);

        if (!isPurchased) {
            console.log('⚠️ 구매 안됨 - 모달 띄우기');
            alert('구매 확인 안됨: isPurchased = ' + isPurchased);
            setShowModal(true); // 잠겨있으면 구매 모달 띄우기
            return;
        }

        if (!cardRef.current) {
            console.log('❌ cardRef가 없음');
            alert('카드 참조가 없습니다');
            return;
        }

        console.log('✅ 다운로드 시작');
        alert('다운로드를 시작합니다...');

        try {
            console.log('📸 html2canvas 시작...');
            const canvas = await html2canvas(cardRef.current, {
                scale: 2, // 고해상도
                backgroundColor: null, // 투명 배경 유지
                logging: true, // 에러 확인을 위해 로깅 활성화
                useCORS: true, // 이미지 로딩 문제 방지
                allowTaint: true, // 크로스 오리진 이미지 허용
                foreignObjectRendering: false // SVG/외부 객체 렌더링 비활성화
            });

            console.log('✅ canvas 생성 완료');
            const dataUrl = canvas.toDataURL('image/png');
            console.log('✅ dataUrl 생성 완료');

            // 모바일 환경 체크
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            console.log('📱 모바일 여부:', isMobile);
            alert('모바일: ' + isMobile);

            if (isMobile) {
                console.log('📱 모바일 다운로드 시작...');
                // 모바일: 새 창에서 이미지 열기 (길게 눌러서 저장 가능)
                const newWindow = window.open();
                console.log('새 창 열림:', !!newWindow);
                if (newWindow) {
                    newWindow.document.write(`
                        <html>
                            <head>
                                <title>수호신 카드 다운로드</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                    body { margin: 0; padding: 20px; background: #000; text-align: center; }
                                    img { max-width: 100%; height: auto; }
                                    p { color: #fff; font-family: sans-serif; margin: 20px 0; }
                                </style>
                            </head>
                            <body>
                                <p>이미지를 길게 눌러서 저장하세요</p>
                                <img src="${dataUrl}" alt="수호신 카드">
                            </body>
                        </html>
                    `);
                    console.log('✅ 새 창에 이미지 작성 완료');
                    alert('새 창이 열렸습니다');
                } else {
                    console.log('❌ 팝업이 차단되었습니다');
                    alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                }
            } else {
                console.log('💻 PC 다운로드 시작...');
                // PC: 기존 방식
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `saju_talisman_${type}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.log('✅ PC 다운로드 완료');
                alert('PC 다운로드 완료');
            }
        } catch (err) {
            console.error('❌ 부적 저장 실패:', err);
            alert('이미지 저장 중 오류가 발생했습니다: ' + err.message);
        }
    };

    // 한자 이름 입력 완료 시
    const handleUnlock = (hanja) => {
        setStampName(hanja);
        setIsPurchased(true); // 구매 완료 처리
        setShowModal(false); // 모달 닫기
    };

    // 도감 모드: 3D 플립 없이 이미지 카드만 표시
    if (isArchiveMode) {
        return (
            <div className="flex flex-col items-center animate-fade-in-up">
                <div ref={cardRef} className="relative w-[320px] h-[480px] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d0d12]">
                    {/* 이미지 배경 */}
                    <img
                        src={bgImage}
                        alt={info.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* 그라데이션 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* 텍스트 정보 (상단 중앙) */}
                    <div className="absolute top-10 left-0 w-full text-center z-10 flex flex-col items-center pointer-events-none">
                        <h3 className={titleTextClass}
                            style={{
                                fontFamily: '"Nanum Myeongjo", serif',
                                textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)'
                            }}>
                            {info.title}
                        </h3>
                        <p className="text-[14px] font-serif font-bold tracking-[0.4em] bg-clip-text text-transparent bg-gradient-to-b from-[#fbf8cc] via-[#f59e0b] to-[#b45309]"
                            style={{
                                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))'
                            }}>
                            {info.hanja}
                        </p>
                    </div>

                    {/* [Archive Mode Only] 중앙 거대 천명록(天命錄) 공식 인장 (Sacred Seal) */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none mix-blend-difference opacity-80">
                        <div className="relative transform rotate-[-15deg] scale-125">
                            {/* Outer Border */}
                            <div className="w-56 h-32 border-[4px] border-red-600 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.4)]">
                                {/* Inner Border */}
                                <div className="w-[94%] h-[90%] border-[1px] border-red-600 rounded-md flex flex-col items-center justify-center gap-0.5">
                                    {/* Main Hanja Text */}
                                    <span className="text-5xl text-red-600 font-serif font-black tracking-[0.1em] leading-none ml-2"
                                        style={{ fontFamily: '"Song Myung", serif' }}>
                                        天命錄
                                    </span>
                                    {/* English Subtitle */}
                                    <span className="text-[10px] text-red-600 font-serif font-bold tracking-[0.6em] uppercase mt-1">
                                        Sacred Archive
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 설명 텍스트 (하단) */}
                    {/* 설명 텍스트 (하단) */}
                    <div className="absolute bottom-6 left-6 right-6 text-center z-20 h-16 flex items-center justify-center">
                        <div className="relative w-full">
                            {/* [분기] 구매 여부에 따라 텍스트 vs 모자이크 가림막 렌더링 */}
                            {isPurchased ? (
                                // 1. 구매 완료: 선명한 원본 텍스트 표시
                                <p className="text-slate-100 text-xs font-light leading-relaxed break-keep whitespace-pre-wrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] opacity-95 animate-fade-in" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                    {info.desc}
                                </p>
                            ) : (
                                // 2. 미구매: 원래의 모자이크(Blur Mosaic) 효과 복구
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {/* 모자이크 처리된 배경 텍스트 (형태만 남김) */}
                                    <p className={`text-slate-100 text-xs font-light leading-relaxed break-keep whitespace-pre-wrap opacity-50 select-none ${getBlurEffectClass()}`}>
                                        {info.desc}
                                    </p>

                                    {/* 자물쇠 및 안내 문구 오버레이 */}
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center -mt-1 gap-1.5 animate-pulse-slow pointer-events-none">
                                        <Lock size={14} className="text-amber-500/80 drop-shadow-md" />
                                        <span className="text-[10px] text-amber-500/90 font-serif tracking-tight whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,1)] bg-black/30 px-2 py-0.5 rounded-full">
                                            수호신의 신묘한 효험(效驗)은 인연 확인 시 열람 가능합니다
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 테두리 장식 */}
                    <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none" />
                </div>
            </div>
        );
    }

    // 결과 페이지 모드: 기존 3D 플립 전체
    return (
        <div className="flex flex-col items-center animate-fade-in-up">
            {/* 3D Flip Container */}
            <div
                className="relative w-[320px] h-[480px] group perspective-1000 cursor-pointer"
                onClick={(e) => {
                    if (customOnClick) {
                        customOnClick(e);
                        return;
                    }
                    const nextFlipped = !isFlipped;
                    if (controlledFlipped === undefined) {
                        setInternalFlipped(nextFlipped);
                    }
                    if (onFlip) onFlip(nextFlipped);
                }} // Toggle flip
            >
                {/* Rotating Inner Container */}
                <div
                    className="relative w-full h-full transition-all duration-700"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >

                    {/* [FRONT FACE] Initial Cover State */}
                    <div
                        className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-2xl border border-amber-900/30 bg-[#1a1a1c] flex flex-col items-center justify-center"
                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', zIndex: 2 }}
                    >
                        {/* Background Texture */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] bg-repeat" />
                        <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-amber-950/40 pointer-events-none" />

                        {/* Central Seal / Icon */}
                        {/* Central Seal / Icon - Modern Orientalism Redesign */}
                        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

                            {/* Main Symbol: Containerless, Glowing */}
                            <div className="relative mb-8 transform hover:scale-105 transition-transform duration-700 ease-out">
                                <div className="absolute inset-0 bg-amber-600/20 blur-[30px] rounded-full animate-pulse-slow" />
                                <span className="relative text-[5rem] text-amber-500/90 font-serif font-black tracking-widest leading-none drop-shadow-[0_0_15px_rgba(217,119,6,0.5)] select-none"
                                    style={{ fontFamily: '"Song Myung", "Noto Serif KR", "Nanum Myeongjo", serif' }}>
                                    天命
                                </span>

                                {/* Red Stamp - Top Right (Diamond Shape) */}
                                <div className="absolute -top-4 -right-4 opacity-80 mix-blend-screen">
                                    <div className="w-8 h-8 border-2 border-red-700/65 bg-red-700/18 flex items-center justify-center transform rotate-45 shadow-[0_0_12px_rgba(185,28,28,0.4)] backdrop-blur-[1px]">
                                        <span className="text-[12px] text-red-700/85 font-bold transform -rotate-45 block drop-shadow-[0_0_6px_rgba(185,28,28,0.7)]">
                                            運
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Poetic Interaction */}
                            <div className="absolute bottom-20 text-center space-y-3">
                                <div className="w-1 h-8 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent mx-auto animate-pulse" />
                                <p className="text-amber-700/50 text-[10px] tracking-[0.3em] uppercase font-light animate-pulse">
                                    Touch to Unseal
                                </p>
                            </div>

                            {/* Premium Edition Branding (Integrated) */}
                            <div className="absolute bottom-8">
                                <p className="text-[10px] tracking-[0.4em] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-600 to-amber-900 opacity-80"
                                    style={{ fontFamily: '"Cinzel", "Playfair Display", serif' }}>
                                    PREMIUM EDITION
                                </p>
                            </div>
                        </div>

                        {/* Decorative Borders */}
                        <div className="absolute inset-4 border border-amber-900/10 rounded-lg pointer-events-none" />
                        <div className="absolute inset-5 border border-amber-900/5 rounded-lg pointer-events-none" />
                    </div>

                    {/* [BACK FACE] Revealed State */}
                    <div
                        ref={cardRef}
                        className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d0d12]"
                        style={{
                            transform: 'rotateY(180deg)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden'
                        }}
                    >
                        {/* [Tab 1] Image View */}
                        <div className={`relative w-full h-full transition-opacity duration-500 ${activeTab === 'image' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <img
                                src={bgImage}
                                alt={info.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {/* 2. 그라데이션 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                            {/* 3. 텍스트 정보 (상단 중앙) - Premium Typography Upgrade */}
                            <div className="absolute top-10 left-0 w-full text-center z-10 flex flex-col items-center pointer-events-none">
                                {/* Main Title - Nanum Myeongjo, Larger, Tighter Tracking */}
                                <h3 className={titleTextClass}
                                    style={{
                                        fontFamily: '"Nanum Myeongjo", serif',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 15px rgba(0,0,0,0.6)'
                                    }}>
                                    {info.title}
                                </h3>

                                {/* Hanja Subtitle - Metallic Gold Gradient */}
                                <p className="text-[14px] font-serif font-bold tracking-[0.4em] bg-clip-text text-transparent bg-gradient-to-b from-[#fbf8cc] via-[#f59e0b] to-[#b45309]"
                                    style={{
                                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.8))'
                                    }}>
                                    {info.hanja}
                                </p>
                            </div>

                            {/* 4. 도장 (핵심) - Real Analog Ink Stamp Style */}
                            <div className="absolute bottom-5 right-5 z-10 transform rotate-[-3deg] opacity-85 mix-blend-hard-light blur-[0.5px]">
                                <div className="relative w-24 h-24 flex items-center justify-center border-double border-4 border-red-700/90 rounded-sm">
                                    <div className="w-full h-full flex flex-col items-center justify-center text-red-700/90 font-serif font-black leading-none p-1 text-4xl tracking-tighter" style={{ fontFamily: '"Gungsuh", "Batang", serif' }}>
                                        {(() => {
                                            const rawName = isPurchased ? stampName : '天命錄';
                                            const isHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawName);
                                            let displayName = isHangul ? '天命錄' : rawName;

                                            // Handle suffixes for Hanja names
                                            if (displayName.length === 2) displayName = displayName + '之印';
                                            else if (displayName.length === 3) displayName = displayName + '印';

                                            if (displayName.length === 4) {
                                                return (
                                                    <div className="grid grid-cols-2 gap-0 w-full h-full text-center items-center justify-center leading-none">
                                                        <span className="flex items-center justify-center w-full h-full pt-1 transform scale-y-110">{displayName[0]}</span>
                                                        <span className="flex items-center justify-center w-full h-full pt-1 transform scale-y-110">{displayName[1]}</span>
                                                        <span className="flex items-center justify-center w-full h-full pb-1 transform scale-y-110">{displayName[2]}</span>
                                                        <span className="flex items-center justify-center w-full h-full pb-1 transform scale-y-110">{displayName[3]}</span>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="text-xl writing-vertical-rl flex items-center justify-center h-full">
                                                        {displayName.slice(0, 4)}
                                                    </div>
                                                )
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* 5. 설명 텍스트 */}
                            <div className="absolute bottom-8 left-6 right-6 text-center z-20">
                                <p className="text-slate-100 text-xs font-light leading-relaxed opacity-95 break-keep whitespace-pre-wrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                    {info.desc}
                                </p>
                            </div>

                            {/* 테두리 장식 */}
                            <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none" />
                        </div>

                        {/* [Tab 2] Reason View */}
                        {reason && (
                            <div className={`absolute inset-0 w-full h-full p-8 flex flex-col justify-center bg-[#0d0d12] transition-opacity duration-500 ${activeTab === 'reason' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                {/* Background Decorative Element - Deep Inkstone Texture */}
                                <div className="absolute inset-0 bg-[#0a0a0c]" />
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] bg-repeat" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,119,6,0.15),transparent_70%)]" />

                                {/* Professional Vignette & Depth Layer */}
                                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,1)] z-10" />
                                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.8)_100%)] z-10" />

                                <div className="relative z-20 space-y-10 h-full flex flex-col justify-center py-4 px-2">
                                    {/* Animation Wrapper for Title */}
                                    <div className={`transition-all duration-1000 transform ${activeTab === 'reason' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                        <h4 className="text-center text-amber-600/70 text-[11px] font-serif tracking-[1em] mb-2 flex items-center justify-center gap-4"
                                            style={{ textShadow: '0 0 15px rgba(217,119,6,0.4)' }}>
                                            <span className="w-12 h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent"></span>
                                            選定 秘策
                                            <span className="w-12 h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent"></span>
                                        </h4>
                                    </div>

                                    <div className="space-y-10">
                                        {/* Step 1: Element Balance - Animation delay 200ms */}
                                        <div className={`flex gap-5 items-start transition-all duration-1000 delay-200 transform ${activeTab === 'reason' ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                                            {/* Traditional Seal Icon Container */}
                                            <div className="flex-shrink-0 w-14 h-14 relative group-hover:scale-110 transition-transform duration-700">
                                                {/* Seal Base (Octagonal / Aged Square) */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 to-black border border-amber-600/30 rotate-3 transform shadow-[0_0_15px_rgba(217,119,6,0.2)]" style={{ borderRadius: '4px' }}></div>
                                                <div className="absolute inset-1 border border-amber-900/20 rotate-[-2deg] rounded-sm"></div>

                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <Sun size={24} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse-slow" />
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-1 font-serif">
                                                <p className="text-[11px] text-amber-600 font-bold uppercase tracking-[0.3em] text-shadow-sm flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                                                    기운 보강 (補强)
                                                </p>
                                                <p className="text-[14px] text-stone-200 leading-[1.8] break-keep text-shadow-sm opacity-90">
                                                    {reason.yongshenReason ? (
                                                        reason.yongshenReason
                                                    ) : (
                                                        <>
                                                            귀하의 사주에 부족하거나 치우친 <span className="text-amber-500 font-bold drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]">{reason.element}</span>의 기운을 다루기 위해, 이를 보강하는 <span className="text-amber-400 font-bold">{reason.stem}</span>의 기운을 수신하여 생명력 넘치는 에너지를 부여하였습니다.
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 2: Harmony (Samhap) - Animation delay 400ms */}
                                        <div className={`flex gap-5 items-start transition-all duration-1000 delay-400 transform ${activeTab === 'reason' ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                                            {/* Traditional Seal Icon Container */}
                                            <div className="flex-shrink-0 w-14 h-14 relative group-hover:scale-110 transition-transform duration-700">
                                                {/* Seal Base (Aged Ink Stamp look) */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-rose-950/40 to-black border border-rose-800/30 rotate-[-5deg] transform shadow-[0_0_15px_rgba(225,29,72,0.15)]" style={{ borderRadius: '6px' }}></div>
                                                <div className="absolute inset-1 border border-rose-900/20 rotate-[3deg] rounded-sm"></div>

                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <ShieldCheck size={24} className="text-rose-500 drop-shadow-[0_0_10px_rgba(225,29,72,0.6)]" />
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-1 font-serif">
                                                <p className="text-[11px] text-rose-600 font-bold uppercase tracking-[0.3em] text-shadow-sm flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600/50"></span>
                                                    영혼의 단짝 (合)
                                                </p>
                                                <p className="text-[14px] text-stone-200 leading-[1.8] break-keep text-shadow-sm opacity-90">
                                                    천지에 흩어진 기운 중 귀하의 본연인 <span className="text-rose-500 font-bold drop-shadow-[0_0_5px_rgba(225,29,72,0.3)]">{reason.userYearJi}띠</span>와 천상의 공명을 이루는 <span className="text-rose-400 font-bold">{reason.branchAnimal}</span>의 영기를 결합하여, 결코 무너지지 않을 수호의 성벽을 쌓았습니다.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Stamp - Animation delay 600ms */}
                                    <div className={`pt-8 flex justify-center transition-all duration-1000 delay-600 transform ${activeTab === 'reason' ? 'translate-y-0 opacity-60' : 'translate-y-4 opacity-0'}`}>
                                        <div className="text-[12px] border-2 border-amber-900/60 px-4 py-1 text-amber-900/80 font-bold rotate-12 font-serif tracking-[0.3em] shadow-sm">
                                            天命錄 秘傳
                                        </div>
                                    </div>
                                </div>

                                {/* Inner Border Overlay */}
                                <div className="absolute inset-4 border border-amber-900/5 rounded-lg pointer-events-none z-30" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Purchase Modal */}
            <TalismanPurchaseModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onUnlock={(hanja) => { setStampName(hanja); setIsPurchased(true); setShowModal(false); }}
            />
        </div>
    );
});

export default TalismanCard;
