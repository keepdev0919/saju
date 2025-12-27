
import dotenv from 'dotenv';
import { calculateSaju } from './src/services/sajuService.js';
import { interpretSajuWithAI } from './src/services/aiService.js';

dotenv.config();

console.log("🔥 AI 로직 테스트 시작...");

async function runTest() {
    try {
        // 1. 가상의 사용자 데이터 (임의의 생년월일)
        const testUser = {
            name: "테스트유저",
            gender: "male",
            birthDate: "1990-05-15", // 임오일주 (or similar)
            birthTime: "14:30",
            calendarType: "solar"
        };

        console.log(`\n📅 사주 계산 중... (${testUser.birthDate})`);

        // 2. 사주 데이터 계산 (sajuService)
        // [FIXED] Pass as a single object
        const sajuData = await calculateSaju({
            birthDate: testUser.birthDate,
            birthTime: testUser.birthTime,
            gender: testUser.gender,
            calendarType: testUser.calendarType
        });

        console.log("✅ 사주 데이터 계산 완료");
        console.log(`- 일간: ${sajuData.dayMaster}`);
        console.log(`- 월지: ${sajuData.month.ji}`);
        // [FIXED] Typos
        console.log(`- 십신/대운/신살 데이터 포함 여부: ${sajuData.sipsin ? 'O' : 'X'}, ${sajuData.dayun ? 'O' : 'X'}, ${sajuData.sinsal ? 'O' : 'X'}`);

        console.log("\n🤖 AI 해석 요청 중... (약 10-20초 소요)");

        // 3. AI 해석 요청 (aiService)
        const aiResult = await interpretSajuWithAI(sajuData, testUser);

        console.log("\n✅ AI 해석 완료!");
        console.log("--------------------------------------------------");
        console.log("1. 용신(Yongshen) 데이터:");
        console.log(JSON.stringify(aiResult.yongshen, null, 2));

        console.log("\n2. 수호신(Talisman) 데이터:");
        console.log(JSON.stringify(aiResult.talisman, null, 2));

        console.log("\n3. 상세 데이터(Detailed Data) 일부:");
        console.log("Personality:", aiResult.detailedData?.personality?.description?.substring(0, 50) + "...");

        console.log("--------------------------------------------------");

        // 검증
        if (aiResult.yongshen && aiResult.yongshen.element && aiResult.yongshen.reason) {
            console.log("🎉 성공! AI가 용신을 정상적으로 반환했습니다.");
        } else {
            console.error("❌ 실패! AI가 용신을 반환하지 않았습니다 (Fallback 사용됨).");
        }

        if (aiResult.talisman.name !== '갑자' || aiResult.yongshen.element === '목') {
            // 갑자가 나올 수도 있지만(우연히), 이유가 AI 기반이면 성공
            console.log("🎉 수호신 로직이 정상 작동하는 것으로 보입니다.");
        } else {
            console.warn("⚠️ 수호신이 '갑자'입니다. 폴백일 가능성이 있습니다.");
        }

    } catch (error) {
        console.error("❌ 테스트 중 에러 발생:", error);
    }
}

runTest();
