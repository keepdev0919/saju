/**
 * 천간(Gan)의 색상과 배경 그라데이션 정보를 반환합니다.
 * 오행(五行) 이론에 기반한 색상을 사용합니다.
 */
export const getGanColor = (gan) => {
    if (['갑', '을'].includes(gan)) return { name: '푸른', color: 'text-green-400', bg: 'from-green-500 to-emerald-700' };
    if (['병', '정'].includes(gan)) return { name: '붉은', color: 'text-red-400', bg: 'from-red-500 to-rose-700' };
    if (['무', '기'].includes(gan)) return { name: '황금', color: 'text-yellow-400', bg: 'from-yellow-400 to-amber-600' };
    if (['경', '신'].includes(gan)) return { name: '백색', color: 'text-slate-100', bg: 'from-slate-300 to-slate-500' };
    if (['임', '계'].includes(gan)) return { name: '검은', color: 'text-[#111111]', bg: 'from-black to-zinc-900' };
    return { name: '신비한', color: 'text-purple-400', bg: 'from-purple-500 to-violet-700' };
};

/**
 * 지지(Ji)에 해당하는 십이지신 동물을 반환합니다.
 */
export const getJiAnimal = (ji) => {
    const animals = { '자': '쥐', '축': '소', '인': '호랑이', '묘': '토끼', '진': '용', '사': '뱀', '오': '말', '미': '양', '신': '원숭이', '유': '닭', '술': '개', '해': '돼지' };
    return animals[ji] || '동물';
};

// 천간(Gan) 한자 맵
export const ganHanjaMap = {
    '갑': '甲', '을': '乙', '병': '丙', '정': '丁', '무': '戊',
    '기': '己', '경': '庚', '신': '辛', '임': '壬', '계': '癸'
};

// 지지(Ji) 한자 맵
export const jiHanjaMap = {
    '자': '子', '축': '丑', '인': '寅', '묘': '卯', '진': '辰', '사': '巳',
    '오': '午', '미': '未', '신': '申', '유': '酉', '술': '戌', '해': '亥'
};
