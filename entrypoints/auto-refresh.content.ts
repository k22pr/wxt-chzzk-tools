import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

// 새로고침 주기: 30초 고정
const REFRESH_INTERVAL = 30;

// aria-label로만 검색 (클래스명은 빌드마다 변경될 수 있음)
const REFRESH_BTN_SELECTOR = 'button[aria-label="새로고침"]';

let intervalId: number | null = null;

function clickRefreshButton() {
  const refreshBtn =
    document.querySelector<HTMLButtonElement>(REFRESH_BTN_SELECTOR);
  console.log("[chzzk-tools] Auto-refresh tick, button found:", !!refreshBtn);
  if (refreshBtn) {
    refreshBtn.click();
    console.log("[chzzk-tools] Refresh button clicked");
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  intervalId = window.setInterval(clickRefreshButton, REFRESH_INTERVAL * 1000);
}

function stopAutoRefresh() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function loadOptionsAndStart() {
  try {
    const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
      useAutoRefresh?: boolean;
    } | null;

    if (saved?.useAutoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  } catch {
    stopAutoRefresh();
  }
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    await loadOptionsAndStart();

    // storage 변경 감지하여 실시간 반영
    browser.storage.onChanged.addListener((changes) => {
      const localKey = `local:${STORAGE_KEY}`;
      const change = changes[localKey] || changes[STORAGE_KEY];
      if (change) {
        const newVal = change.newValue ?? {};
        if (newVal.useAutoRefresh) {
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      }
    });
  },
});
