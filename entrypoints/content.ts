import { STORAGE_KEY } from "@/constants";
import { storage } from "wxt/utils/storage";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  async main() {
    console.log("content.ts");
    // 옵션을 읽어 페이지로 postMessage 전달
    let options = await storage.getItem(`local:${STORAGE_KEY}`);
    if (!options) {
      options = {
        useStreamDesign: true,
        useAutoQuality: true,
        useLiveBar: true,
      };
    }
    // public/injected/* 자산을 페이지에 주입하는 유틸
    function injectPublicScript(
      file: string,
      attrs: Record<string, string> = {}
    ) {
      const url = browser.runtime.getURL(`injected/${file}` as any);
      const s = document.createElement("script");
      s.src = url;
      s.async = false;
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    }
    function injectPublicStyle(file: string) {
      const url = browser.runtime.getURL(`injected/${file}` as any);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      (document.head || document.documentElement).appendChild(link);
    }

    async function sendOptionData(data: any) {
      if (data?.useLiveBar) injectPublicScript("live-bar.js");
      if (data?.useAutoQuality) injectPublicScript("auto-quality.js");
      if (data?.useStreamDesign) {
        injectPublicScript("stream-design.js");
        injectPublicStyle("stream-design.css");
      }

      console.log(data?.useStreamDesign);
    }

    console.log(options);
    sendOptionData(options);

    // 실시간 변경 반영: storage 변경을 페이지로 계속 포워딩
    browser.storage.onChanged.addListener((changes, area) => {
      if (changes[STORAGE_KEY]) {
        const newVal = changes[STORAGE_KEY].newValue ?? {};
        sendOptionData(newVal);
      }
    });

    injectPublicScript("status.js");
  },
});
