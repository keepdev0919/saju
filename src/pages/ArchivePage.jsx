import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Scroll, ChevronLeft } from 'lucide-react';
import { getGanColor, ganHanjaMap, jiHanjaMap } from '../utils/sajuHelpers';
import { talismanNames } from '../data/talismanData';
import TalismanCard from '../components/TalismanCard';

/**
 * 천상의 아카이브 (Celestial Archive) 페이지
 * 60甲子 수호신들을 격자 형태로 보여주는 독립 페이지
 */
const ArchivePage = () => {
    const navigate = useNavigate();
    const [selectedTalismanKey, setSelectedTalismanKey] = useState(null);
    const [showTalismanDetail, setShowTalismanDetail] = useState(false);
    const [talismanViewMode, setTalismanViewMode] = useState('image');
    const [isTalismanFlipped, setIsTalismanFlipped] = useState(false);
    const [isTalismanPurchased, setIsTalismanPurchased] = useState(false);

    const talismanCardRef = useRef(null);
    const libraryScrollRef = useRef(null);
    const indicatorRef = useRef(null);

    // 도감 스크롤 프로그레스 인디케이터 로직
    useEffect(() => {
        const scrollContainer = libraryScrollRef.current;
        const indicator = indicatorRef.current;
        if (!scrollContainer || !indicator) return;

        let ticking = false;

        const updateIndicator = () => {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
            const maxScroll = scrollWidth - clientWidth;
            if (maxScroll > 0) {
                const ratio = scrollLeft / maxScroll;
                const translatePercent = ratio * (100 / 0.3 - 100);
                indicator.style.transform = `translate3d(${translatePercent}%, 0, 0)`;
                indicator.style.transition = "none";
            }
            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateIndicator);
                ticking = true;
            }
        };

        scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
        updateIndicator();

        return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }, []);

    // ESC 키로 상세 모달 닫기
    useEffect(() => {
        if (showTalismanDetail) {
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    setShowTalismanDetail(false);
                    setIsTalismanFlipped(false);
                    setTalismanViewMode('image');
                }
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [showTalismanDetail]);

    const renderTalismanPreviewModal = () => {
        if (!selectedTalismanKey) return null;

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
                <div className="relative w-full max-w-[480px] flex flex-col items-center animate-modal-entrance">

                    <div className="w-full flex justify-between items-center mb-8 px-6">
                        <div className="flex flex-col">
                            <h3 className="text-amber-500 font-serif text-lg tracking-widest">
                                열람용 사본 (閱覽用 寫本)
                            </h3>
                            <p className="text-stone-600 text-[10px] tracking-tight mt-1 leading-relaxed">
                                인연 확인 시 중앙 인장이 해제되며, 우측 하단에 천명록의 공식 낙인이 깃듭니다.<br />
                                <span className="text-amber-700/80 font-medium">(추가 각인 시 개인 성함 포함 소장 가능)</span>
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setShowTalismanDetail(false);
                                setIsTalismanFlipped(false);
                                setTalismanViewMode('image');
                            }}
                            className="p-2 text-stone-500 hover:text-amber-500 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                            <TalismanCard
                                ref={talismanCardRef}
                                type={selectedTalismanKey}
                                userName="[ 因緣之主人 ]"
                                talismanData={talismanNames[selectedTalismanKey]}
                                reason={null}
                                activeTab={talismanViewMode}
                                onFlip={(flipped) => setIsTalismanFlipped(flipped)}
                                isPurchased={false}
                                setIsPurchased={setIsTalismanPurchased}
                                isArchiveMode={true}
                            />

                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                <div className="sacred-seal-large flex flex-col items-center justify-center gap-2">
                                    <span className="text-6xl font-bold tracking-tighter leading-none">天命錄</span>
                                    <span className="text-xs tracking-[0.3em] opacity-80 uppercase">Sacred Archive</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0c0c0e] text-stone-200 flex flex-col relative overflow-hidden">
            {/* 장식적 배경 - 정교한 한지 질감 */}
            <div className="absolute inset-0 bg-hanji-refined opacity-15 pointer-events-none z-0"></div>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-700/30 to-transparent"></div>

            {/* 헤더 */}
            <div className="px-6 pt-10 pb-4 flex justify-between items-center bg-[#0c0c0e]/80 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 text-stone-500 hover:text-amber-500 transition-colors"
                    >
                        <ChevronLeft size={28} strokeWidth={1.5} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-amber-600/90 font-serif text-xl tracking-[0.3em] flex items-center gap-3">
                            <Sparkles size={18} className="text-amber-700/60" />
                            천상의 기록 보관소
                        </h1>
                        <p className="text-stone-500 text-[10px] tracking-wider mt-1">
                            천기(天機)의 흐름 속에 나열된 <span className="text-amber-600/80 font-bold">60甲子 수호신</span>들의 자태를 관조하십시오.
                        </p>
                    </div>
                </div>
            </div>

            {/* 도감 그리드 영역 */}
            <div className="flex-1 flex flex-col min-h-0 relative z-10">
                {/* 배경 텍스처 레이어 */}
                <div className="absolute inset-0 bg-hanji-refined opacity-10 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>

                {/* 상단 조명 */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-transparent pointer-events-none z-10"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-amber-800/10 blur-[80px] pointer-events-none z-10"></div>

                <div
                    ref={libraryScrollRef}
                    className="flex-1 overflow-x-auto overflow-y-auto px-6 pt-4 pb-12 no-scrollbar relative z-20 overscroll-x-contain"
                >
                    <div className="grid grid-flow-col grid-rows-5 gap-4 h-fit min-h-full px-2">
                        {['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'].flatMap(animal =>
                            Object.keys(talismanNames).filter(k => k.endsWith(animal))
                        ).map((key) => {
                            const { color } = getGanColor(key[0]);
                            return (
                                <div
                                    key={key}
                                    onClick={() => {
                                        setSelectedTalismanKey(key);
                                        setShowTalismanDetail(true);
                                    }}
                                    className="relative p-3 rounded-sm border border-orange-950/40 bg-wood-refined flex flex-col items-center justify-center group min-w-[85px] aspect-[4/5] flex-shrink-0 
                             md:hover:border-amber-600/40 md:hover:scale-105 md:hover:shadow-[0_0_40px_rgba(0,0,0,1)] 
                             active:scale-95 transition-all duration-700 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_0_30px_rgba(0,0,0,0.7),0_10px_20px_rgba(0,0,0,0.6)]"
                                >
                                    <div className="absolute inset-0 bg-hanji-refined opacity-[0.05] pointer-events-none z-10"></div>

                                    <div className="absolute inset-0 z-0 opacity-[0.05] md:group-hover:opacity-20 transition-all duration-1000">
                                        <img
                                            src="/images/talisman/placeholder.png"
                                            alt=""
                                            className="w-full h-full object-cover scale-150 md:group-hover:scale-100 transition-transform duration-1000"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/100/101012/101012'; }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80" />
                                    </div>

                                    <div className="relative z-10 flex flex-col items-center justify-center gap-2 mt-1">
                                        <div className="flex flex-col items-center leading-[1.2] select-none">
                                            <span className={`font-serif font-black ${color} md:group-hover:scale-110 transition-all duration-700 text-[26px]`}>
                                                {ganHanjaMap[key[0]]}
                                            </span>
                                            <span className={`font-serif font-black ${color} md:group-hover:scale-110 transition-all duration-700 text-[26px]`}>
                                                {jiHanjaMap[key[1]]}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-col items-center gap-1">
                                            <span className={`text-[8px] font-sans font-black tracking-[0.2em] ${color}`}>
                                                {key}
                                            </span>
                                            <div className={`w-[3px] h-[3px] rounded-full ${color.replace('text-', 'bg-')}/40 md:group-hover:bg-amber-500 shadow-[0_0_5px_rgba(0,0,0,0.5)] transition-all`} />
                                        </div>
                                    </div>

                                    <div className="absolute inset-[2px] border border-orange-950/40 rounded-sm pointer-events-none md:group-hover:border-amber-700/30 transition-all duration-700 shadow-[inset_0_0_5px_rgba(0,0,0,0.6)]" />

                                    <div className="absolute inset-0 bg-[#08080a]/98 opacity-0 md:group-hover:opacity-100 transition-all duration-700 md:flex hidden flex-col items-center justify-center p-2 text-center pointer-events-none z-30 scale-110 group-hover:scale-100">
                                        <div className="w-8 h-px bg-amber-800/30 mb-2"></div>
                                        <p className="text-amber-700/80 text-[10px] font-serif leading-tight mb-1 tracking-[0.2em] font-medium">
                                            {talismanNames[key].name}
                                        </p>
                                        <div className="w-6 h-px bg-amber-800/10 mt-2"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 인디케이터 */}
                <div className="px-10 py-6 z-20 relative bg-[#0c0c0e]">
                    <div className="max-w-md mx-auto">
                        <div className="h-[1.5px] w-full bg-stone-900/60 rounded-full relative overflow-hidden">
                            <div
                                ref={indicatorRef}
                                className="absolute h-full w-[30%] bg-gradient-to-r from-amber-900/40 via-amber-600/60 to-amber-900/40 shadow-[0_0_15px_rgba(217,119,6,0.3)]"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-8 text-center relative z-10 bg-[#0c0c0e]">
                    <p className="text-amber-500/80 text-[16px] tracking-[0.2em] font-serif italic">
                        "나열된 만상(萬象) 중, 당신을 기다리는 단 하나의 인연을 찾으십시오."
                    </p>
                </div>
            </div>

            {showTalismanDetail && renderTalismanPreviewModal()}
        </div>
    );
};

export default ArchivePage;
