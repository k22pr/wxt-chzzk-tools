import { STORAGE_KEY } from "@/constants";
import { storage } from "wxt/utils/storage";

let cssLink: HTMLLinkElement | null = null;
let triggerElement: HTMLDivElement | null = null;

// CSS 주입 함수
function injectPublicStyle(file: string) {
  if (cssLink) return; // 중복 방지
  const url = browser.runtime.getURL(`injected/${file}` as any);
  cssLink = document.createElement("link");
  cssLink.id = "pzzk-tools-style";
  cssLink.rel = "stylesheet";
  cssLink.href = url;
  (document.head || document.documentElement).appendChild(cssLink);
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    // CSS 주입
    injectPublicStyle("global.style.css");

    if (document.readyState === "loading") {
      await new Promise((r) =>
        document.addEventListener("DOMContentLoaded", r)
      );
    }

    // 트리거 요소 생성 (테마 색상 등을 위한 데이터 속성 컨테이너)
    triggerElement = document.createElement("div");
    triggerElement.id = "pzzk-tools-trigger";
    triggerElement.style.display = "none";
    document.body.appendChild(triggerElement);

    // 옵션 로드 및 트리거 요소에 데이터 속성 설정
    let options = (await storage.getItem(`local:${STORAGE_KEY}`)) as any;
    if (!options) {
      options = {
        useStreamDesign: false,
        useAutoQuality: true,
        useLiveBar: true,
        useVideoOverlay: true,
        themeName: "primary",
      };
    }

    function updateTriggerAttributes(data: any) {
      if (!triggerElement) return;
      triggerElement.setAttribute(
        "live-bar",
        data?.useLiveBar ? "true" : "false"
      );
      triggerElement.setAttribute(
        "auto-quality",
        data?.useAutoQuality ? "true" : "false"
      );
      triggerElement.setAttribute(
        "video-overlay",
        data?.useVideoOverlay ? "true" : "false"
      );
      triggerElement.setAttribute("stream-design", "false");
      triggerElement.setAttribute("theme-name", data?.themeName || "#00f889");
    }

    updateTriggerAttributes(options);

    // 실시간 변경 반영: storage 변경 시 트리거 요소 속성 업데이트
    browser.storage.onChanged.addListener((changes) => {
      const localKey = `local:${STORAGE_KEY}`;
      if (changes[localKey]) {
        const newVal = changes[localKey].newValue ?? {};
        updateTriggerAttributes(newVal);
      } else if (changes[STORAGE_KEY]) {
        const newVal = changes[STORAGE_KEY].newValue ?? {};
        updateTriggerAttributes(newVal);
      }
    });
  },
});
