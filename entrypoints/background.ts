import { STORAGE_KEY } from "@/constants";

// Mac User-Agent (Opera 브라우저로 위장)
const SPOOFED_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6937.97 Safari/537.36 OPR/115.0.5231.193";

export default defineBackground(() => {
  // 저장 키 이름 변경(pzzk-tools → chzzk-tools): 업데이트 시 기존 옵션을 새 키로 옮긴다.
  // 옛 chzzk 키에 오래된 값이 남아 있을 수 있으므로 pzzk 값으로 덮어쓴다.
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    // 동적 규칙은 브라우저 재시작·확장 업데이트 후에도 유지되므로 설치·업데이트 때 한 번만 등록
    // (SW는 다른 사이트의 탭 이벤트로도 자주 깨어나므로 깨어날 때마다 다시 쓰지 않음)
    setupUserAgentRule();

    const LEGACY_KEY = "pzzk-tools:options";
    const { [LEGACY_KEY]: legacy } = await browser.storage.local.get(LEGACY_KEY);
    if (legacy) {
      await browser.storage.local.set({ [STORAGE_KEY]: legacy });
      await browser.storage.local.remove(LEGACY_KEY);
    }

    // 광고 차단은 원래 항상 켜져 있던 기능이라, 옵션이 생기기 전부터 쓰던 사용자(업데이트)는 켜 두고 새 설치는 끔.
    // 팝업을 한 번도 안 연 사용자는 저장된 옵션이 없으므로 저장값 대신 설치 사유로 구분함.
    // 한 번 정해 저장한 뒤로는 건드리지 않음 (이후 업데이트에서도 사용자가 바꾼 값 유지)
    if (reason !== "install" && reason !== "update") return;
    const { [STORAGE_KEY]: saved = {} } = await browser.storage.local.get(STORAGE_KEY);
    if ("useAdBlock" in saved) return;
    await browser.storage.local.set({
      [STORAGE_KEY]: { ...saved, useAdBlock: reason === "update" },
    });
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
});
