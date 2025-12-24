import React from 'react';
import { Link } from 'react-router';

const Footer = () => {
  return (
    <footer className="w-full py-10 bg-[#0a0a0a] text-stone-500 border-t border-stone-800/50">
      <div className="max-w-6xl mx-auto px-4 text-xs leading-relaxed">

        {/* 1. 상호명 및 서비스 이름 */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-stone-400 mb-2 font-serif">천명록 (天命錄)</h2>
          <p className="mb-1 text-stone-600">본 서비스는 사주 및 운세 정보를 제공하는 비실물 콘텐츠 서비스입니다.</p>
        </div>

        {/* 2. 필수 사업자 정보 (PG사 심사 핵심 항목) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 mb-4 text-stone-500">
          <p><strong className="text-stone-400">상호명:</strong> 테넥션(Tenaction)</p>
          <p><strong className="text-stone-400">대표자명:</strong> 조익준</p>
          <p><strong className="text-stone-400">사업자등록번호:</strong> 760-02-03520</p>
          <p><strong className="text-stone-400">통신판매업신고번호:</strong> 2025-수원영통-1170</p>
          <p><strong className="text-stone-400">주소:</strong> 경기도 수원시 영통구 영통동 영일로 16-5</p>
          <p><strong className="text-stone-400">고객센터:</strong> 070-8983-2807</p>
          <p><strong className="text-stone-400">이메일:</strong> cheonmyeongrok@gmail.com</p>
        </div>

        {/* 3. 법적 필수 링크 & 카피라이트 (2단 구조) */}
        <div className="mt-8 pt-6 border-t border-stone-800/50">
          <div className="flex flex-col gap-3">
            {/* 윗줄: 법적 링크 */}
            <div className="flex gap-6 font-semibold text-stone-400">
              <Link to="/terms" className="hover:text-amber-500 transition-colors">
                이용약관
              </Link>
              <Link to="/privacy" className="hover:text-amber-500 transition-colors font-bold">
                개인정보처리방침
              </Link>
            </div>

            {/* 아랫줄: 저작권 (2026년 적용) */}
            <div className="text-stone-600/60 text-[11px] font-sans">
              Copyright © 2026 CheonMyeongRok. All rights reserved.
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
