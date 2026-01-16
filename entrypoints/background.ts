// Mac User-Agent (Opera 브라우저로 위장)
const SPOOFED_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6937.97 Safari/537.36 OPR/115.0.5231.193";

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
                  value: '"macOS"',
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
                  value: '"macOS"',
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
                  value: '"macOS"',
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

      console.log("[pzzk-tools] User-Agent spoofing rule registered");
    } catch (error) {
      console.error("[pzzk-tools] Failed to register User-Agent rule:", error);
    }
  };

  // 아이콘 업데이트 함수
  const updateIcon = async (tabId: number, url: string | undefined) => {
    // chrome://, edge://, about: 등의 시스템 페이지에서는 아이콘 설정 불가
    if (
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:")
    ) {
      return;
    }

    const isChzzk = url.startsWith("https://chzzk.naver.com/");

    try {
      await browser.action.setIcon({
        tabId,
        path: isChzzk
          ? {
              16: "/icon/16.png",
              48: "/icon/48.png",
              128: "/icon/128.png",
            }
          : {
              16: "/icon/icon-16-gray.png",
              48: "/icon/icon-48-gray.png",
              128: "/icon/icon-128-gray.png",
            },
      });
    } catch {
      // 아이콘 설정 실패 시 무시 (제한된 페이지에서 발생 가능)
    }
  };

  // 탭 업데이트 시 아이콘 변경
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      updateIcon(tabId, tab.url);
    }
  });

  // 탭 활성화 시 아이콘 변경
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      updateIcon(activeInfo.tabId, tab.url);
    } catch {
      // 탭 정보 가져오기 실패 시 무시
    }
  });

  // 확장 프로그램 시작 시 규칙 등록
  setupUserAgentRule();
});
