import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();

  // reveal-item 애니메이션 감시자
  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-item-active');
          }
        });
      },
      { threshold: 0.05 }
    );

    const items = document.querySelectorAll('.reveal-item');
    items.forEach((item) => revealObserver.observe(item));

    return () => revealObserver.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-stone-200 relative">
      {/* 배경 레이어 */}
      <div className="fixed inset-0 bg-[#0f0f10] z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(60,40,20,0.18),transparent_80%)] z-[1] pointer-events-none" />
      <div
        className="fixed inset-0 opacity-20 z-[2] pointer-events-none"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/rice-paper-2.png")' }}
      />

      {/* 헤더 */}
      <div className="fixed top-0 left-0 w-full z-50 pt-6 pb-4 flex justify-between items-center px-6 bg-gradient-to-b from-[#0f0f10] via-[#0f0f10]/90 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="text-stone-500 hover:text-amber-600 transition-colors p-2"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex flex-col items-center">
          <div className="border-t border-amber-800/30 w-8 mb-1" />
          <span className="text-amber-700/80 text-sm tracking-[0.2em] font-serif">利用約款</span>
          <div className="border-b border-amber-800/30 w-8 mt-1" />
        </div>

        <div className="w-10" />
      </div>

      {/* 본문 */}
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-16">

        {/* 제목 섹션 */}
        <div className="text-center mb-12 reveal-item">
          <h1 className="text-2xl font-serif text-amber-100 tracking-widest mb-2">이용약관</h1>
          <p className="text-xs text-stone-500 tracking-wider">Terms of Service</p>
          <div className="mt-4 w-24 h-px bg-gradient-to-r from-transparent via-amber-800/50 to-transparent mx-auto" />
          <p className="text-xs text-stone-600 mt-4 font-serif">시행일: 2026년 1월 1일</p>
        </div>

        {/* 약관 내용 */}
        <div className="space-y-8">

          {/* 제1조 목적 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第一條</span>
              <span>목적</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30">
              <p className="text-sm leading-relaxed text-stone-300">
                이 약관은 테넥션(Tenaction, 이하 "회사")이 제공하는 천명록 서비스(이하 "서비스")의
                이용조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </div>
          </section>

          {/* 제2조 정의 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第二條</span>
              <span>용어의 정의</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2">
              <p className="text-sm text-stone-300"><span className="text-amber-300/80">"서비스"</span>란 AI 기반 사주 분석, 천명록 발간, 수호신 카드 제공 등 운세 관련 콘텐츠 서비스 일체를 의미합니다.</p>
              <p className="text-sm text-stone-300"><span className="text-amber-300/80">"이용자"</span>란 이 약관에 동의하고 서비스를 이용하는 자를 말합니다.</p>
              <p className="text-sm text-stone-300"><span className="text-amber-300/80">"콘텐츠"</span>란 사주 분석 결과, 천명록, 수호신 카드 등 디지털 결과물을 말합니다.</p>
              <p className="text-sm text-stone-300"><span className="text-amber-300/80">"유료 콘텐츠"</span>란 결제를 통해 구매하는 콘텐츠를 의미합니다.</p>
            </div>
          </section>

          {/* 제3조 회사 정보 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第三條</span>
              <span>회사 정보</span>
            </h2>
            <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm p-4">
              <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                <span className="text-stone-500">상호</span><span className="text-stone-300">테넥션 (Tenaction)</span>
                <span className="text-stone-500">대표자</span><span className="text-stone-300">조익준</span>
                <span className="text-stone-500">사업자번호</span><span className="text-stone-300">760-02-03520</span>
                <span className="text-stone-500">통신판매업</span><span className="text-stone-300">2025-수원영통-1170</span>
                <span className="text-stone-500">소재지</span><span className="text-stone-300">경기도 수원시 영통구 영일로 16-5</span>
                <span className="text-stone-500">고객센터</span><span className="text-stone-300">070-8983-2807</span>
                <span className="text-stone-500">이메일</span><span className="text-stone-300">cheonmyeongrok@gmail.com</span>
              </div>
            </div>
          </section>

          {/* 제4조 약관 효력 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第四條</span>
              <span>약관의 효력 및 변경</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 이 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</p>
              <p>② 회사는 관련 법령 범위 내에서 약관을 변경할 수 있으며, 변경 시 7일 전 공지합니다.</p>
              <p>③ 이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.</p>
            </div>
          </section>

          {/* 제5조 서비스 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第五條</span>
              <span>서비스의 제공</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 text-sm text-stone-300">
              <p className="mb-2">회사는 다음 서비스를 제공합니다:</p>
              <ul className="space-y-1 text-stone-400">
                <li>• AI 기반 사주팔자 분석</li>
                <li>• 천명록 발간 (유료)</li>
                <li>• 수호신 카드 제공 (유료)</li>
                <li>• 한자 이름 각인 및 PDF 제공 (유료)</li>
              </ul>
            </div>
          </section>

          {/* 제6조 유료 콘텐츠 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第六條</span>
              <span>유료 콘텐츠</span>
            </h2>
            <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-amber-300/80 font-normal">상품명</th>
                    <th className="px-4 py-2 text-left text-amber-300/80 font-normal">가격</th>
                    <th className="px-4 py-2 text-left text-amber-300/80 font-normal">내용</th>
                  </tr>
                </thead>
                <tbody className="text-stone-300">
                  <tr className="border-t border-stone-700/50">
                    <td className="px-4 py-3">천명록 발간</td>
                    <td className="px-4 py-3 text-amber-400">49,000원</td>
                    <td className="px-4 py-3">천명록 + 수호신 카드</td>
                  </tr>
                  <tr className="border-t border-stone-700/50">
                    <td className="px-4 py-3">프리미엄 각인</td>
                    <td className="px-4 py-3 text-amber-400">29,000원</td>
                    <td className="px-4 py-3">한자 각인 + PDF<br /><span className="text-xs text-stone-500">(천명록 구매자 전용)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-stone-500 mt-2">※ 모든 상품은 디지털 콘텐츠로 제공되며, 실물 배송은 없습니다.</p>
          </section>

          {/* 구분선 */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-800/30 to-transparent my-8" />

          {/* 제7조 청약철회 - 중요 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第七條</span>
              <span>청약철회 및 환불</span>
            </h2>

            {/* 경고 박스 */}
            <div className="bg-red-950/30 border border-red-900/30 rounded-sm p-4 mb-4">
              <p className="text-sm font-serif text-center text-red-400/80 tracking-widest mb-2">◆ 注意 ◆</p>
              <p className="text-red-300/90 text-sm leading-relaxed">
                본 서비스의 유료 콘텐츠는 구매 즉시 제공되는 디지털 콘텐츠로, <strong>구매 후 환불이 불가능</strong>합니다.
              </p>
            </div>

            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 디지털 콘텐츠 특성상 즉시 제공되는 서비스는 청약철회가 제한됩니다.</p>
              <p>② 환불 불가 사유:</p>
              <ul className="ml-4 space-y-1 text-stone-400">
                <li>• 구매 즉시 사용이 시작된 콘텐츠</li>
                <li>• 사주 분석 결과를 확인한 경우</li>
                <li>• 이용자 귀책사유로 이용하지 못한 경우</li>
              </ul>
              <p>③ 회사 귀책사유(시스템 오류)로 미제공 시 전액 환불됩니다.</p>
            </div>
          </section>

          {/* 제8조 AI 면책 - 중요 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第八條</span>
              <span>AI 서비스의 특성</span>
            </h2>

            {/* 안내 박스 */}
            <div className="bg-amber-950/30 border border-amber-900/30 rounded-sm p-4 mb-4">
              <p className="text-sm font-serif text-center text-amber-400/80 tracking-widest mb-2">
                ◆ AI 기술 활용 안내 ◆
              </p>
              <p className="text-amber-300/90 text-sm leading-relaxed">
                천명록은 <strong>전통 명리학 이론</strong>을 기반으로 사주팔자를 계산·분석하며,
                AI는 방대한 명리 고전 데이터를 참조하여 <strong>해석문 생성을 보조</strong>합니다.
              </p>
            </div>

            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① <strong>사주팔자 자동 계산</strong></p>
              <p className="ml-4 text-stone-400">
                회사 시스템이 생년월일·생시를 기반으로 사주팔자(천간지지), 오행 분포,
                십신 구성, 신강/신약, 용신·희신 등을 자동으로 계산합니다.
              </p>

              <p>② <strong>AI 해석문 생성</strong></p>
              <p className="ml-4 text-stone-400">
                계산된 사주 데이터를 AI(OpenAI GPT)에 전달하여 명리학 고전
                (자평진전, 적천수 등) 기반 해석문을 생성합니다.
              </p>

              <p>③ <strong>참고 사항</strong></p>
              <p className="ml-4 text-stone-400">
                단순히 "생년월일을 AI에 입력"하는 방식이 아닌,
                전문 명리 시스템 분석 후 AI 해석을 진행합니다.
              </p>

              <p>④ AI 결과는 참고용이며, 전문 명리학자의 상담을 대체하지 않습니다.</p>
            </div>
          </section>

          {/* 제9조 이용자 의무 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第九條</span>
              <span>이용자의 의무</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 text-sm text-stone-300">
              <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다:</p>
              <ul className="space-y-1 text-stone-400">
                <li>• 타인의 개인정보 도용 또는 허위 정보 입력</li>
                <li>• 서비스 콘텐츠 무단 복제, 배포, 상업적 이용</li>
                <li>• 자동화 도구(봇, 크롤러)를 이용한 접근</li>
                <li>• 역공학, 소스코드/알고리즘 추출 시도</li>
                <li>• AI 시스템 조작(프롬프트 해킹 등)</li>
              </ul>
            </div>
          </section>

          {/* 제10조 저작권 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十條</span>
              <span>저작권</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 서비스의 모든 콘텐츠에 대한 저작권은 회사에 귀속됩니다.</p>
              <p>② 회사 동의 없이 콘텐츠를 복제, 배포, 2차 저작물 작성에 이용할 수 없습니다.</p>
              <p>③ 구매한 콘텐츠는 개인적 용도로만 이용 가능합니다.</p>
            </div>
          </section>

          {/* 제11조 개인정보 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十一條</span>
              <span>개인정보 보호</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 회사는 서비스 제공을 위해 필요한 최소한의 개인정보만을 수집합니다.</p>
              <p>② 수집 정보: 이름, 생년월일, 생시, 성별, 결제정보</p>
              <p>③ 상세 사항은 <Link to="/privacy" className="text-amber-400 underline underline-offset-2">개인정보처리방침</Link>을 참조해 주세요.</p>
            </div>
          </section>

          {/* 제12조 면책 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十二條</span>
              <span>면책</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 천재지변, 기술적 결함 등 불가항력적 사유로 서비스 제공 불가 시 책임이 면제됩니다.</p>
              <p>② 이용자 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</p>
              <p>③ 이용자가 기대하는 결과를 얻지 못한 것에 대해 책임을 지지 않습니다.</p>
            </div>
          </section>

          {/* 제13조 분쟁 해결 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十三條</span>
              <span>분쟁 해결</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 서비스 이용 관련 분쟁 발생 시 양 당사자는 성실히 협의합니다.</p>
              <p>② 소송은 관련 법령에서 정한 법원을 관할법원으로 합니다.</p>
              <p>③ 대한민국 법을 적용합니다.</p>
            </div>
          </section>

          {/* 부칙 */}
          <div className="reveal-item mt-12 pt-8 border-t border-amber-900/20">
            <p className="text-xs text-stone-500 text-center font-serif">
              본 약관은 2026년 1월 1일부터 시행됩니다.
            </p>
            <p className="text-xs text-stone-600 text-center mt-2">
              이 약관에 명시되지 않은 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령에 따릅니다.
            </p>
          </div>

        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-12 flex gap-6 justify-center">
          <Link
            to="/privacy"
            className="text-sm text-amber-600/80 hover:text-amber-500 transition-colors font-serif"
          >
            個人情報 · 개인정보처리방침
          </Link>
        </div>

      </main>
    </div>
  );
};

export default Terms;
