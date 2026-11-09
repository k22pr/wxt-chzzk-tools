import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

// Mac User-Agent (Opera 브라우저로 위장)
const SPOOFED_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6937.97 Safari/537.36 OPR/115.0.5231.193";

export default defineBackground(() => {
  // 저장 키 이름 변경(pzzk-tools → chzzk-tools): 업데이트 시 기존 옵션을 새 키로 옮긴다.
  // 옛 chzzk 키에 오래된 값이 남아 있을 수 있으므로 pzzk 값으로 덮어쓴다.
  browser.runtime.onInstalled.addListener(async () => {
    const legacy = await storage.getItem("local:pzzk-tools:options");
    if (!legacy) return;
    await storage.setItem(`local:${STORAGE_KEY}`, legacy);
    await storage.removeItem("local:pzzk-tools:options");
  });

  // User-Agent 스푸핑 규칙 등록
  const setupUserAgentRule = async () => {
    try {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1, 2, 3], // 이전 버전의 도메인별 규칙까지 정리
        addRules: [
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
              // 하위 도메인 포함 (api.chzzk.naver.com 등)
              requestDomains: ["chzzk.naver.com", "apis.naver.com"],
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

  // 아이콘 업데이트 함수
  // tabs 권한이 없어 치지직 외 탭은 url이 undefined로 오므로, url이 없으면 회색 아이콘
  const updateIcon = async (tabId: number, url: string | undefined) => {
    const isChzzk = url?.startsWith("https://chzzk.naver.com/") ?? false;

    try {
      // Firefox(MV2)에는 action이 없고 browserAction만 있음
      await (browser.action ?? browser.browserAction).setIcon({
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
    if (changeInfo.status === "complete") {
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
