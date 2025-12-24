import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();

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
          <span className="text-amber-700/80 text-sm tracking-[0.2em] font-serif">個人情報</span>
          <div className="border-b border-amber-800/30 w-8 mt-1" />
        </div>

        <div className="w-10" />
      </div>

      {/* 본문 */}
      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-16">

        {/* 제목 */}
        <div className="text-center mb-12 reveal-item">
          <h1 className="text-2xl font-serif text-amber-100 tracking-widest mb-2">개인정보처리방침</h1>
          <p className="text-xs text-stone-500 tracking-wider">Privacy Policy</p>
          <div className="mt-4 w-24 h-px bg-gradient-to-r from-transparent via-amber-800/50 to-transparent mx-auto" />
          <p className="text-xs text-stone-600 mt-4 font-serif">시행일: 2026년 1월 1일</p>
        </div>

        {/* 서문 */}
        <div className="reveal-item mb-8 text-sm text-stone-400 leading-relaxed">
          <p>
            테넥션(Tenaction, 이하 "회사")은 「개인정보보호법」 등 관련 법령을 준수하며,
            이용자의 개인정보 보호를 위해 최선을 다하고 있습니다.
            본 개인정보처리방침을 통해 수집하는 개인정보의 항목, 수집 목적, 보유 기간 등을 안내드립니다.
          </p>
        </div>

        <div className="space-y-8">

          {/* 제1조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第一條</span>
              <span>개인정보의 수집 항목 및 이용 목적</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 text-sm text-stone-300 mb-4">
              <p>회사는 서비스 제공을 위해 필요한 최소한의 개인정보만 수집합니다.</p>
            </div>

            {/* 수집 항목 표 */}
            <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-amber-300/80 font-normal">구분</th>
                    <th className="px-3 py-2 text-left text-amber-300/80 font-normal">수집 항목</th>
                    <th className="px-3 py-2 text-left text-amber-300/80 font-normal">이용 목적</th>
                  </tr>
                </thead>
                <tbody className="text-stone-300">
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2 text-amber-400/80">사주 분석<br /><span className="text-xs text-stone-500">(필수)</span></td>
                    <td className="px-3 py-2">이름, 생년월일, 생시, 성별</td>
                    <td className="px-3 py-2">AI 사주 분석 서비스 제공</td>
                  </tr>
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2 text-amber-400/80">유료 결제<br /><span className="text-xs text-stone-500">(필수)</span></td>
                    <td className="px-3 py-2">전화번호, 결제정보</td>
                    <td className="px-3 py-2">결제 처리, 본인 확인, 결과 조회</td>
                  </tr>
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2 text-amber-400/80">서비스 이용 시<br /><span className="text-xs text-stone-500">(자동)</span></td>
                    <td className="px-3 py-2">결제 이력, 결과 조회 기록</td>
                    <td className="px-3 py-2">서비스 제공, 고객 지원</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제2조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第二條</span>
              <span>개인정보의 보유 및 이용 기간</span>
            </h2>
            <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-amber-300/80 font-normal">구분</th>
                    <th className="px-3 py-2 text-left text-amber-300/80 font-normal">보유 기간</th>
                    <th className="px-3 py-2 text-left text-amber-300/80 font-normal">근거</th>
                  </tr>
                </thead>
                <tbody className="text-stone-300">
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2">무료 서비스 이용 정보</td>
                    <td className="px-3 py-2 text-amber-400">회원 탈퇴 시까지</td>
                    <td className="px-3 py-2">서비스 정책</td>
                  </tr>
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2">유료 서비스 이용 정보</td>
                    <td className="px-3 py-2">회원 탈퇴 시까지</td>
                    <td className="px-3 py-2">서비스 정책</td>
                  </tr>
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2">결제 기록</td>
                    <td className="px-3 py-2">5년</td>
                    <td className="px-3 py-2">전자상거래법</td>
                  </tr>
                  <tr className="border-t border-stone-700/50">
                    <td className="px-3 py-2">분쟁/민원 기록</td>
                    <td className="px-3 py-2">3년</td>
                    <td className="px-3 py-2">전자상거래법</td>
                  </tr>

                </tbody>
              </table>
            </div>
          </section>

          {/* 제3조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第三條</span>
              <span>개인정보의 제3자 제공</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
              <p>다만, 다음의 경우는 예외로 합니다:</p>
              <ul className="mt-2 space-y-1 text-stone-400">
                <li>• 이용자가 사전에 동의한 경우</li>
                <li>• 법령에 따른 수사기관의 요청이 있는 경우</li>
                <li>• 통계 작성 등 목적으로 특정 개인 식별 불가 형태 제공 시</li>
              </ul>
            </div>
          </section>

          {/* 제4조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第四條</span>
              <span>개인정보 처리 위탁</span>
            </h2>
            <div className="space-y-3">
              <p className="text-sm text-stone-300 pl-4 border-l border-amber-900/30">
                회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.
              </p>

              {/* 국내 위탁 */}
              <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm p-4">
                <p className="text-amber-300/80 text-sm font-serif mb-2">국내 위탁</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-stone-300">PortOne (포트원)</p>
                    <p className="text-xs text-stone-500">위탁업무: 결제 처리 | 항목: 결제정보 | 보유: 5년</p>
                  </div>
                </div>
              </div>

              {/* 국외 위탁 (AI) */}
              <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm p-4">
                <p className="text-amber-300/80 text-sm font-serif mb-2">국외 위탁 (AI 해석 엔진)</p>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-stone-300 mb-2">OpenAI LLC (미국)</p>

                    {/* 위탁 업무 */}
                    <p className="text-xs text-stone-500 mb-2">
                      <span className="text-amber-400">위탁업무:</span> 명리학 데이터 기반 사주 해석문 생성 보조
                    </p>

                    {/* 전송 항목 - 구체적으로 나열 */}
                    <div className="text-xs text-stone-500 mb-3">
                      <p className="text-amber-400 mb-1.5">전송 항목 (회사 서버에서 변환 후 전송):</p>
                      <ul className="ml-3 space-y-0.5 text-stone-600 leading-relaxed">
                        <li>• 사주팔자 (年柱·月柱·日柱·時柱의 천간·지지)</li>
                        <li>• 일간 (Day Master, 예: 갑목·병화·무토 등)</li>
                        <li>• 오행 분포 (목·화·토·금·수 점수)</li>
                        <li>• 십신 구성 (비견·식신·재성·관성·인성 등 10가지 관계)</li>
                        <li>• 대운·세운 정보 (10년/연간 운세 주기)</li>
                        <li>• 12운성 (장생·제왕·쇠·병 등 에너지 상태)</li>
                        <li>• 신살 정보 (도화살·역마살·귀인 등 특수 별)</li>
                        <li>• 성별 (남/여)</li>
                      </ul>
                      <p className="mt-2 text-stone-500 italic text-[11px]">
                        ※ 생년월일·생시는 <strong className="text-amber-400">회사 서버의 만세력 엔진</strong>에서
                        위 사주 데이터로 변환 후 전송됩니다.
                      </p>
                    </div>

                    {/* 전송 방법 및 보유 */}
                    <p className="text-xs text-stone-500">
                      <span className="text-amber-400">전송 방법:</span> HTTPS 암호화 네트워크 전송
                    </p>
                    <p className="text-xs text-stone-500">
                      <span className="text-amber-400">보유 기간:</span> 처리 시점에만 이용 (미저장)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 제5조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第五條</span>
              <span>개인정보의 파기</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 보유 기간 경과 또는 처리 목적 달성 시 지체 없이 파기합니다.</p>
              <p>② <span className="text-amber-300/80">파기 방법</span></p>
              <ul className="ml-4 space-y-1 text-stone-400">
                <li>• 전자적 파일: 복구 불가능한 기술적 방법으로 삭제</li>
                <li>• 종이 문서: 분쇄 또는 소각</li>
              </ul>
            </div>
          </section>

          {/* 제6조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第六條</span>
              <span>이용자의 권리와 행사 방법</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 text-sm text-stone-300">
              <p className="mb-2">이용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
              <ul className="space-y-1 text-stone-400">
                <li>• 개인정보 열람 요구</li>
                <li>• 개인정보 정정·삭제 요구</li>
                <li>• 개인정보 처리정지 요구</li>
              </ul>
              <p className="mt-3 text-stone-500">
                권리 행사: cheonmyeongrok@gmail.com 또는 070-8983-2807
              </p>
            </div>
          </section>

          {/* 제7조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第七條</span>
              <span>아동의 개인정보 보호</span>
            </h2>
            <div className="bg-amber-950/30 border border-amber-900/30 rounded-sm p-4">
              <p className="text-sm font-serif text-center text-amber-400/80 tracking-widest mb-2">◆ 案內 ◆</p>
              <div className="text-amber-300/90 text-sm leading-relaxed space-y-2">
                <p>① 본 서비스는 <strong>만 14세 이상</strong>만 이용 가능합니다.</p>
                <p>② 만 14세 미만 아동의 사주 정보가 입력되는 경우, 이는 <strong>법정대리인(보호자)이 직접 입력하고 동의한 것</strong>으로 간주합니다.</p>
              </div>
            </div>
          </section>

          {/* 제8조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第八條</span>
              <span>개인정보의 안전성 확보 조치</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 text-sm text-stone-400 space-y-1">
              <p>• 개인정보 암호화 전송 및 저장</p>
              <p>• 해킹 등 침해 방지를 위한 보안 시스템 운영</p>
              <p>• 개인정보 취급 직원 최소화 및 교육</p>
              <p>• 접근 권한 관리 및 접근 기록 보관</p>
            </div>
          </section>

          {/* 제9조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第九條</span>
              <span>쿠키의 운용</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 회사는 서비스 제공을 위해 쿠키를 사용할 수 있습니다.</p>
              <p>② 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</p>
              <p className="text-stone-500">단, 쿠키 거부 시 일부 서비스 이용이 제한될 수 있습니다.</p>
            </div>
          </section>

          {/* 제10조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十條</span>
              <span>개인정보 보호책임자</span>
            </h2>
            <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm p-4">
              <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
                <span className="text-stone-500">성명</span><span className="text-stone-300">조익준</span>
                <span className="text-stone-500">직위</span><span className="text-stone-300">대표</span>
                <span className="text-stone-500">연락처</span><span className="text-stone-300">070-8983-2807</span>
                <span className="text-stone-500">이메일</span><span className="text-stone-300">cheonmyeongrok@gmail.com</span>
              </div>
            </div>
          </section>

          {/* 제11조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十一條</span>
              <span>권익침해 구제</span>
            </h2>
            <div className="bg-stone-900/30 border border-amber-900/20 rounded-sm p-4 space-y-1 text-sm text-stone-400">
              <p>• 개인정보분쟁조정위원회: 1833-6972 (kopico.go.kr)</p>
              <p>• 개인정보침해신고센터: 118 (privacy.kisa.or.kr)</p>
              <p>• 대검찰청 사이버수사과: 1301 (spo.go.kr)</p>
              <p>• 경찰청 사이버수사국: 182 (ecrm.cyber.go.kr)</p>
            </div>
          </section>

          {/* 제12조 */}
          <section className="reveal-item">
            <h2 className="text-lg font-serif text-amber-400/90 mb-3 flex items-center gap-2">
              <span className="text-amber-600/60 text-sm">第十二條</span>
              <span>개인정보처리방침 변경</span>
            </h2>
            <div className="pl-4 border-l border-amber-900/30 space-y-2 text-sm text-stone-300">
              <p>① 본 방침 변경 시 최소 7일 전 공지사항을 통해 고지합니다.</p>
              <p>② 이용자 권리에 중대한 변경이 있는 경우 30일 전 고지합니다.</p>
            </div>
          </section>

          {/* 부칙 */}
          <div className="reveal-item mt-12 pt-8 border-t border-amber-900/20">
            <p className="text-xs text-stone-500 text-center font-serif">
              본 개인정보처리방침은 2026년 1월 1일부터 시행됩니다.
            </p>
          </div>

        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-12 flex gap-6 justify-center">
          <Link to="/terms" className="text-sm text-amber-600/80 hover:text-amber-500 transition-colors font-serif">
            利用約款 · 이용약관
          </Link>
        </div>

      </main>
    </div>
  );
};

export default Privacy;
