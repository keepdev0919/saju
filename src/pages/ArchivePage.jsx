import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Scroll, ChevronLeft } from 'lucide-react';
import { getGanColor, ganHanjaMap, jiHanjaMap } from '../utils/sajuHelpers';
import { talismanNames } from '../data/talismanData';
import TalismanCard from '../components/TalismanCard';

/**
 * 천상의 아카이브 (Celestial Archive) 페이지
 * 60甲子 수호신들을 5개의 장(Chapter)으로 나누어 보여주는 독립 페이지
 */
const ArchivePage = () => {
    const navigate = useNavigate();
    const [selectedTalismanKey, setSelectedTalismanKey] = useState(null);
    const [showTalismanDetail, setShowTalismanDetail] = useState(false);
    const [talismanViewMode, setTalismanViewMode] = useState('image');
    const [isTalismanFlipped, setIsTalismanFlipped] = useState(false);
    const [isTalismanPurchased, setIsTalismanPurchased] = useState(false);

    const talismanCardRef = useRef(null);

    // 오행별 챕터 정보
    const CHAPTERS = [
        { id: 'wood', title: '제 1장: 만물을 깨우는 나무의 기운', subtitle: 'Birth and Growth', element: '木', color: 'text-emerald-500', glow: 'bg-emerald-500/10' },
        { id: 'fire', title: '제 2장: 찬란하게 타오르는 불의 기운', subtitle: 'Passion and Brilliance', element: '火', color: 'text-rose-500', glow: 'bg-rose-500/10' },
        { id: 'earth', title: '제 3장: 모든 것을 품는 흙의 기운', subtitle: 'Balance and Foundation', element: '土', color: 'text-amber-500', glow: 'bg-amber-500/10' },
        { id: 'metal', title: '제 4장: 강인하게 단련된 쇠의 기운', subtitle: 'Strength and Harvest', element: '金', color: 'text-stone-300', glow: 'bg-stone-300/10' },
        { id: 'water', title: '제 5장: 깊이 있게 흐르는 물의 기운', subtitle: 'Wisdom and Flow', element: '水', color: 'text-blue-500', glow: 'bg-blue-500/10' },
    ];

    // 각 오행에 해당하는 천간들
    const elementGans = {
        wood: ['갑', '을'],
        fire: ['병', '정'],
        earth: ['무', '기'],
        metal: ['경', '신'],
        water: ['임', '계']
    };

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
        <div className="min-h-screen bg-[#0c0c0e] text-stone-200 flex flex-col relative overflow-y-auto overflow-x-hidden transition-all duration-700">
            {/* 장식적 배경 */}
            <div className="fixed inset-0 bg-hanji-refined opacity-15 pointer-events-none z-0"></div>

            {/* 고정 헤더 영역 (스크롤 시 투명도 변화 등 연출 가능) */}
            <div className="sticky top-0 px-6 pt-12 pb-8 flex flex-col items-center bg-[#0c0c0e]/90 backdrop-blur-md relative z-30 border-b border-amber-900/10">
                <button
                    onClick={() => navigate('/')}
                    className="absolute left-6 top-10 p-2 text-stone-600 hover:text-amber-500 transition-colors z-20"
                >
                    <ChevronLeft size={28} strokeWidth={1.5} />
                </button>

                <div className="relative flex flex-col items-center">
                    <h1 className="text-amber-500/80 font-serif italic text-3xl md:text-4xl tracking-[0.2em] mb-4">
                        천상의 기록 보관소
                    </h1>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent mb-5"></div>
                    <p className="text-stone-500 text-[11px] md:text-xs tracking-[0.15em] font-serif leading-relaxed text-center break-keep max-w-[80%] opacity-80">
                        천기(天機)의 흐름 속에 나열된 <span className="text-amber-700/60 font-bold border-b border-amber-900/20 pb-0.5">60甲子 수호신</span>들을 관조하십시오.
                    </p>
                </div>
            </div>

            {/* 메인 전시실 (5개의 장) */}
            <div className="flex-1 relative z-10 pb-32">
                {CHAPTERS.map((chapter) => (
                    <section key={chapter.id} className="relative mb-24 px-6 pt-16">
                        {/* 챕터 가이드 타이틀 */}
                        <div className="flex flex-col items-center mb-16 animate-fade-in-up">
                            <span className={`${chapter.color} text-[10px] tracking-[0.6em] uppercase font-bold mb-3 opacity-60`}>
                                {chapter.subtitle}
                            </span>
                            <h2 className="text-stone-100 font-serif italic text-2xl md:text-3xl tracking-[0.1em] text-center mb-6">
                                {chapter.title}
                            </h2>
                            <div className={`w-8 h-8 rounded-full ${chapter.glow} border border-${chapter.color.split('-')[1]}-500/20 flex items-center justify-center`}>
                                <span className={`${chapter.color} text-sm font-serif`}>{chapter.element}</span>
                            </div>
                            <div className="w-px h-16 bg-gradient-to-b from-amber-700/20 to-transparent mt-8"></div>
                        </div>

                        {/* 카드 격자 (한 줄에 3개) */}
                        <div className="max-w-md mx-auto grid grid-cols-3 gap-3 md:gap-4 px-2">
                            {['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'].flatMap(animal =>
                                Object.keys(talismanNames).filter(k => k.endsWith(animal) && elementGans[chapter.id].includes(k[0]))
                            ).map((key, index) => {
                                const { color } = getGanColor(key[0]);
                                return (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setSelectedTalismanKey(key);
                                            setShowTalismanDetail(true);
                                        }}
                                        className="relative p-2 rounded-sm border border-orange-950/40 bg-wood-refined flex flex-col items-center justify-center group aspect-[3/4] active:scale-95 transition-all duration-700 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_0_20px_rgba(0,0,0,0.7),0_5px_10px_rgba(0,0,0,0.6)]"
                                    >
                                        <div className="absolute inset-0 bg-hanji-refined opacity-[0.05] pointer-events-none z-10"></div>
                                        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                                            <div className="flex flex-col items-center leading-[1.1] select-none scale-90">
                                                <span className={`font-serif font-black ${color} text-[24px]`}>
                                                    {ganHanjaMap[key[0]]}
                                                </span>
                                                <span className={`font-serif font-black ${color} text-[24px]`}>
                                                    {jiHanjaMap[key[1]]}
                                                </span>
                                            </div>
                                            <span className={`text-[7px] font-sans font-black tracking-[0.1em] ${color} opacity-70`}>
                                                {key}
                                            </span>
                                        </div>
                                        <div className="absolute inset-[1px] border border-orange-950/30 rounded-sm pointer-events-none shadow-[inset_0_0_3px_rgba(0,0,0,0.5)]" />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>

            {/* 하단 푸터 가이드 */}
            <div className="p-12 text-center relative z-10 bg-gradient-to-t from-black to-transparent">
                <p className="text-amber-500/80 text-[16px] tracking-[0.2em] font-serif italic mb-2">
                    "나열된 만상(萬象) 중,"
                </p>
                <p className="text-amber-500/60 text-[14px] tracking-[0.1em] font-serif italic">
                    당신을 기다리는 단 하나의 인연을 찾으십시오.
                </p>
            </div>

            {showTalismanDetail && renderTalismanPreviewModal()}
        </div>
    );
};

export default ArchivePage;
