import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Scroll, ChevronLeft } from 'lucide-react';
import { getGanColor, ganHanjaMap, jiHanjaMap } from '../utils/sajuHelpers';
import { talismanNames } from '../data/talismanData';
import TalismanCard from '../components/TalismanCard';

/**
 * 천상의 아카이브 (Celestial Archive) 페이지
 * 60甲子 수호신들을 5개의 장(Chapter)으로 나누어 보여주는 독립 페이지
 * 5행(목화토금수) 고증 컬러 및 현색(玄色) 배경 적용
 */
const ArchivePage = () => {
    const navigate = useNavigate();
    const [selectedTalismanKey, setSelectedTalismanKey] = useState(null);
    const [showTalismanDetail, setShowTalismanDetail] = useState(false);
    const [talismanViewMode, setTalismanViewMode] = useState('image');
    const [isTalismanFlipped, setIsTalismanFlipped] = useState(false);
    const [isTalismanPurchased, setIsTalismanPurchased] = useState(false);
    const [activeChapter, setActiveChapter] = useState(null);
    const touchStartY = useRef(null);

    const talismanCardRef = useRef(null);

    const closeModal = () => {
        setShowTalismanDetail(false);
        setIsTalismanFlipped(false);
        setTalismanViewMode('image');
    };

    // 오행별 챕터 정보 (고증 컬러 명시 및 테두리/라인 컬러 고정)
    // 테일윈드 JIT 컴파일러 이슈 해결을 위해 클래스 풀네임 사용
    const CHAPTERS = [
        {
            id: 'wood',
            title: '제 1장: 만물을 깨우는 나무의 기운',
            subtitle: 'Birth and Growth',
            element: '木',
            color: 'text-emerald-600',
            glow: 'bg-emerald-500/5',
            circleClass: 'border-stone-100',
            lineClass: 'bg-gradient-to-b from-emerald-500/60 to-transparent',
            description: '동방의 청색(靑), 생명의 시작을 상징합니다.'
        },
        {
            id: 'fire',
            title: '제 2장: 찬란하게 타오르는 불의 기운',
            subtitle: 'Passion and Brilliance',
            element: '火',
            color: 'text-rose-600',
            glow: 'bg-rose-500/5',
            circleClass: 'border-stone-100',
            lineClass: 'bg-gradient-to-b from-rose-500/60 to-transparent',
            description: '남방의 적색(赤), 만개의 절정을 상징합니다.'
        },
        {
            id: 'earth',
            title: '제 3장: 모든 것을 품는 흙의 기운',
            subtitle: 'Balance and Foundation',
            element: '土',
            color: 'text-amber-600',
            glow: 'bg-amber-500/5',
            circleClass: 'border-stone-100',
            lineClass: 'bg-gradient-to-b from-amber-600/60 to-transparent',
            description: '중앙의 황색(黃), 조화와 포용을 상징합니다.'
        },
        {
            id: 'metal',
            title: '제 4장: 강인하게 단련된 쇠의 기운',
            subtitle: 'Strength and Harvest',
            element: '金',
            color: 'text-stone-300',
            glow: 'bg-stone-300/5',
            circleClass: 'border-stone-100',
            lineClass: 'bg-gradient-to-b from-stone-400/60 to-transparent',
            description: '서방의 백색(白), 결실과 단단함을 상징합니다.'
        },
        {
            id: 'water',
            title: '제 5장: 깊이 있게 흐르는 물의 기운',
            subtitle: 'Wisdom and Flow',
            element: '水',
            color: 'text-slate-400', // Cool Gray (푸른 빛이 도는 차가운 회색)으로 보정
            glow: 'bg-slate-500/5',
            circleClass: 'border-stone-100',
            lineClass: 'bg-gradient-to-b from-slate-500/50 to-transparent',
            description: '북방의 흑색(黑), 깊은 지혜와 저장을 상징합니다.',
            isDarkElement: true
        },
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
    // Intersection Observer for scroll animations and active chapter tracking
    useEffect(() => {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal-item-active');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const chapterObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // 섹션이 화면의 일정 부분(상단 30% ~ 하단 70% 사이)에 들어오면 활성화
                    if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
                        setActiveChapter(entry.target.getAttribute('data-chapter-id'));
                    }
                });
            },
            {
                threshold: [0.1, 0.5],
                rootMargin: '-15% 0px -45% 0px' // 화면 중심부 근처에서 전환되도록 조정
            }
        );

        const items = document.querySelectorAll('.reveal-item');
        items.forEach((item) => revealObserver.observe(item));

        const elements = document.querySelectorAll('[data-chapter-id]');
        elements.forEach((el) => chapterObserver.observe(el));

        return () => {
            revealObserver.disconnect();
            chapterObserver.disconnect();
        };
    }, []);

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

        const handleTouchStart = (e) => {
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = (e) => {
            if (touchStartY.current === null) return;
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchEndY - touchStartY.current;

            // 50px 이상 아래로 스와이프하면 닫기
            if (diff > 50) {
                closeModal();
            }
            touchStartY.current = null;
        };

        return (
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in cursor-pointer"
                onClick={closeModal}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className="relative w-full max-w-[480px] flex flex-col items-center animate-modal-entrance pointer-events-none">
                    <div className="w-full flex flex-col items-center mb-10 px-6 text-center">
                        <h3 className="text-amber-500 font-serif text-lg tracking-widest mb-2">
                            열람용 사본 (閱覽用 寫本)
                        </h3>
                        <p className="text-stone-500 text-[10px] tracking-tight leading-relaxed opacity-60">
                            화면 어디든 터치하거나 아래로 밀어서 닫으십시오.
                        </p>
                    </div>

                    <div className="flex items-center justify-center mb-4 pointer-events-auto">
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
                                <div className="sacred-seal-large opacity-20 scale-75 border-amber-900/40 text-amber-900/40">閱覽用</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#111113] text-stone-200 flex flex-col relative overflow-y-auto overflow-x-hidden transition-all duration-700">
            {/* 장식적 배경 - 현색(Deep Charcoal) 텍스처 */}
            <div className="fixed inset-0 bg-hanji-refined opacity-[0.03] pointer-events-none z-0"></div>

            {/* 상단 내비게이션 바 (뒤로가기 기능 전용) */}
            <div className="sticky top-0 w-full z-50 flex items-center px-4 py-6 pointer-events-none">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 text-stone-600/50 hover:text-amber-600 transition-all pointer-events-auto group"
                >
                    <ChevronLeft size={24} strokeWidth={2} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            </div>

            {/* [전략 1] 몰입형 히어로 게이트 (완전한 시선 분리: 100vh) */}
            <div
                id="hero"
                data-chapter-id="hero"
                className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 text-center -mt-20 overflow-hidden"
            >
                <div className="animate-fade-in-up w-full max-w-[90vw] mx-auto">
                    <span className="text-amber-700/50 text-[max(11px,3vw)] sm:text-[13px] tracking-[0.5em] sm:tracking-[0.8em] font-serif uppercase mb-6 block transition-all duration-1000">Celestial Records</span>
                    <h1 className="text-amber-600/70 font-serif italic text-[7.5vw] sm:text-4xl md:text-5xl lg:text-6xl tracking-[0.15em] mb-8 whitespace-nowrap">
                        천상의 기록 보관소
                    </h1>
                    <div className="w-20 h-px bg-gradient-to-r from-transparent via-amber-900/40 to-transparent mx-auto mb-8"></div>
                    <p className="text-stone-400/80 text-[max(13px,3.5vw)] sm:text-sm md:text-base tracking-[0.15em] font-serif leading-relaxed break-keep max-w-[320px] sm:max-w-md mx-auto transition-all duration-1000">
                        천기(天機)의 흐름 속에 나열된<br className="sm:hidden" />
                        <span className="text-amber-800/60 font-bold">60甲子 수호신</span>들을 관조하십시오.
                    </p>
                </div>

                {/* 하단 스크롤 안내 (정적이면서 은은한 디자인) */}
                <div className="absolute bottom-12 flex flex-col items-center gap-5 opacity-40">
                    <span className="text-[max(9px,2.5vw)] sm:text-[11px] tracking-[0.4em] text-amber-600 uppercase font-serif">Scroll to Unfold</span>
                    <div className="w-px h-16 bg-gradient-to-b from-amber-600/60 to-transparent"></div>
                </div>
            </div>

            {/* 메인 전시실 (5개의 장) */}
            <div className="flex-1 relative z-10 pb-8">
                {CHAPTERS.map((chapter, chapterIdx) => (
                    <section
                        key={chapter.id}
                        id={chapter.id}
                        data-chapter-id={chapter.id}
                        className={`relative ${chapterIdx === CHAPTERS.length - 1 ? 'mb-12' : 'mb-32'} px-6 pt-16 scroll-mt-20`}
                    >
                        {/* 챕터 가이드 타이틀 */}
                        <div className="flex flex-col items-center mb-16 px-4">
                            <span className={`${chapter.isDarkElement ? 'text-slate-400' : chapter.color} text-[10px] tracking-[0.6em] uppercase font-bold mb-3 opacity-60`}>
                                {chapter.subtitle}
                            </span>
                            <h2 className={`font-serif italic text-2xl md:text-3xl tracking-[0.1em] text-center mb-4 text-stone-100 ${chapter.isDarkElement ? 'drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]' : ''}`}>
                                {chapter.title}
                            </h2>
                            <p className="text-stone-600 text-[10px] font-serif mb-8 opacity-60 italic">{chapter.description}</p>

                            {/* 챕터 기운 인디케이터 (수기운은 먹색+은색 연출) */}
                            <div className={`w-12 h-12 rounded-full ${chapter.glow} border-2 ${chapter.circleClass} flex items-center justify-center bg-black/40 backdrop-blur-sm z-10 shadow-[0_0_12px_rgba(255,255,255,0.15)]`}>
                                <span className={`${chapter.color} text-lg font-serif font-bold`}>
                                    {chapter.element}
                                </span>
                            </div>

                            {/* 수직 구분선 - 가시성 대폭 강화 */}
                            <div className={`w-[2px] h-20 -mt-1 ${chapter.lineClass}`}></div>
                        </div>

                        {/* 카드 격자 (한 줄에 3개) */}
                        <div className="max-w-md mx-auto grid grid-cols-3 gap-3 md:gap-4 px-2">
                            {['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'].flatMap(animal =>
                                Object.keys(talismanNames).filter(k => k.endsWith(animal) && elementGans[chapter.id].includes(k[0]))
                            ).map((key, idx) => {
                                // 카드 내부 컬러 결정: 챕터의 대표 컬러를 상속받아 통일성 강화
                                const cardFontColor = chapter.isDarkElement ? 'text-slate-400' : chapter.color;
                                const cardBgColor = chapter.isDarkElement ? 'bg-stone-800/30' : 'bg-stone-900/40';
                                const cardBorderColor = chapter.isDarkElement ? 'border-stone-400/20' : 'border-orange-950/20';

                                return (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setSelectedTalismanKey(key);
                                            setShowTalismanDetail(true);
                                        }}
                                        className={`reveal-item relative p-2 rounded-sm border ${cardBorderColor} ${cardBgColor} flex flex-col items-center justify-center group aspect-[3/4] active:scale-95 transition-all duration-700 cursor-pointer overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.02),0_10px_20px_rgba(0,0,0,0.4)]`}
                                        style={{ transitionDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="absolute inset-0 bg-hanji-refined opacity-[0.02] pointer-events-none z-10"></div>

                                        {/* 수기운 특별 효과: 은은한 은빛 광채 */}
                                        {chapter.isDarkElement && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 to-transparent z-0 opacity-50"></div>
                                        )}

                                        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                                            <div className="flex flex-col items-center leading-[1.1] select-none scale-90">
                                                <span className={`font-serif font-black ${cardFontColor} text-[30px] ${chapter.isDarkElement ? 'drop-shadow-[0_0_1px_rgba(255,255,255,0.1)]' : ''} transition-all duration-700`}>
                                                    {ganHanjaMap[key[0]]}
                                                </span>
                                                <span className={`font-serif font-black ${cardFontColor} text-[30px] ${chapter.isDarkElement ? 'drop-shadow-[0_0_1px_rgba(255,255,255,0.1)]' : ''} transition-all duration-700`}>
                                                    {jiHanjaMap[key[1]]}
                                                </span>
                                            </div>
                                            <span className={`font-sans font-black tracking-[0.1em] ${cardFontColor} text-[10px] ${chapter.isDarkElement ? 'opacity-100' : 'opacity-80'}`}>
                                                {key}
                                            </span>
                                        </div>
                                        <div className={`absolute inset-[1px] border ${chapter.isDarkElement ? 'border-stone-400/10' : 'border-orange-950/10'} rounded-sm pointer-events-none`} />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>

            {/* 천명(天命) 내비게이션 - 플로팅 엘리먼트 바 (모바일 가시성 고려) */}
            <div className={`fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-5 md:gap-7 transition-all duration-700 ${activeChapter && activeChapter !== 'hero' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'
                }`}>
                {/* 수직 라인 */}
                <div className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-stone-100/10 to-transparent"></div>

                {CHAPTERS.map((chapter) => {
                    // 오행별 광채 색상 매핑 (더욱 선명하게 보정)
                    const glowColors = {
                        wood: 'rgba(16, 185, 129, 0.8)',   // emerald-500
                        fire: 'rgba(225, 29, 72, 0.8)',    // rose-600
                        earth: 'rgba(217, 119, 6, 0.8)',   // amber-600
                        metal: 'rgba(255, 255, 255, 0.6)', // stone-300 + white
                        water: 'rgba(100, 116, 139, 0.8)'  // slate-400
                    };

                    const isActive = activeChapter === chapter.id;

                    return (
                        <button
                            key={chapter.id}
                            onClick={() => {
                                const el = document.getElementById(chapter.id);
                                if (el) {
                                    const offset = 80;
                                    const bodyRect = document.body.getBoundingClientRect().top;
                                    const elementRect = el.getBoundingClientRect().top;
                                    const elementPosition = elementRect - bodyRect;
                                    const offsetPosition = elementPosition - offset;

                                    window.scrollTo({
                                        top: offsetPosition,
                                        behavior: 'smooth'
                                    });
                                }
                            }}
                            className="relative group/dot focus:outline-none pointer-events-auto p-2"
                        >
                            {/* 점 (활성화 시 검정색 중심 + 은은한 광채) */}
                            <div
                                className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-700 border ${isActive ? 'bg-stone-900 scale-[2.2]' : 'bg-stone-100/20 group-hover/dot:bg-stone-100/40 border-transparent'
                                    }`}
                                style={{
                                    boxShadow: isActive ? `0 0 15px 3px ${glowColors[chapter.id]}` : 'none',
                                    borderColor: isActive ? glowColors[chapter.id].replace('0.8)', '0.5)') : 'transparent'
                                }}
                            ></div>
                        </button>
                    );
                })}
            </div>

            {/* 하단 푸터 가이드 (간격 및 가독성 개선) */}
            <div className="pb-40 pt-10 px-6 text-center relative z-10 bg-gradient-to-t from-black via-[#111113] to-transparent">
                <p className="text-amber-600/80 text-xl md:text-3xl tracking-[0.15em] font-serif italic mb-6 break-keep">
                    "나열된 만상(萬象) 중,"
                </p>
                <p className="text-amber-700/60 text-base md:text-xl tracking-[0.1em] font-serif italic leading-relaxed break-keep">
                    당신을 기다리는 단 하나의<br className="md:hidden" /> 인연은 무엇입니까
                </p>
                <div className="w-12 h-px bg-amber-900/40 mx-auto mt-12"></div>
            </div>

            {showTalismanDetail && renderTalismanPreviewModal()}
        </div>
    );
};

export default ArchivePage;
