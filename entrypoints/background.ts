// Windows User-Agent (Opera 브라우저로 위장)
const SPOOFED_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6856.96 Safari/537.36 OPR/114.0.5303.133";

// declarativeNetRequest 규칙 ID
const RULE_ID = 1;

export default defineBackground(() => {
  // User-Agent 스푸핑 규칙 등록
  const setupUserAgentRule = async () => {
    try {
      // 기존 규칙 제거
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1, 2, 3],
      });

      // 새 규칙 추가 (각 도메인별로 별도 규칙)
      await browser.declarativeNetRequest.updateDynamicRules({
        addRules: [
          // chzzk.naver.com
          {
            id: 1,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                {
                  header: "User-Agent",
                  operation: "set",
                  value: SPOOFED_USER_AGENT,
                },
                {
                  header: "sec-ch-ua-platform",
                  operation: "set",
                  value: '"Windows"',
                },
              ],
            },
            condition: {
              urlFilter: "||chzzk.naver.com",
              resourceTypes: [
                "main_frame",
                "sub_frame",
                "xmlhttprequest",
                "other",
              ],
            },
          },
          // api.chzzk.naver.com
          {
            id: 2,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                {
                  header: "User-Agent",
                  operation: "set",
                  value: SPOOFED_USER_AGENT,
                },
                {
                  header: "sec-ch-ua-platform",
                  operation: "set",
                  value: '"Windows"',
                },
              ],
            },
            condition: {
              urlFilter: "||api.chzzk.naver.com",
              resourceTypes: [
                "main_frame",
                "sub_frame",
                "xmlhttprequest",
                "other",
              ],
            },
          },
          // apis.naver.com
          {
            id: 3,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                {
                  header: "User-Agent",
                  operation: "set",
                  value: SPOOFED_USER_AGENT,
                },
                {
                  header: "sec-ch-ua-platform",
                  operation: "set",
                  value: '"Windows"',
                },
              ],
            },
            condition: {
              urlFilter: "||apis.naver.com",
              resourceTypes: [
                "main_frame",
                "sub_frame",
                "xmlhttprequest",
                "other",
              ],
            },
          },
        ],
      });

      console.log("[chzzk-tools] User-Agent spoofing rule registered");
    } catch (error) {
      console.error("[chzzk-tools] Failed to register User-Agent rule:", error);
    }
  };

  // 확장 프로그램 시작 시 규칙 등록
  setupUserAgentRule();
});
