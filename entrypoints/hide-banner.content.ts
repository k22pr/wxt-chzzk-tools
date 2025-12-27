/**
 * hide-banner.content.ts
 * 메인 페이지의 상단 배너 및 추천 라이브 숨김 처리
 */

import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

const NAME = "[chzzk-tools][hide-banner]";

// 상단 배너 숨김 CSS
const CSS_BANNER = `
  [class*="home_list_container__"][class*="top_banner_container__"] {
    display: none !important;
  }
`;

// 추천 라이브 숨김 CSS
const CSS_RECOMMEND = `
  [class*="home_list_container__"][class*="home_recommend_live_container__"] {
    display: none !important;
  }
`;

const STYLE_ID_BANNER = "chzzk-tools-hide-banner";
const STYLE_ID_RECOMMEND = "chzzk-tools-hide-recommend";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    const injectStyle = (id: string, css: string) => {
      if (document.getElementById(id)) return;
      const style = document.createElement("style");
      style.id = id;
      style.textContent = css;
      const target = document.head || document.documentElement;
      target.appendChild(style);
    };

    const removeStyle = (id: string) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };

    // 현재 설정 상태 캐시
    let cachedBanner: boolean | null = null;
    let cachedRecommend: boolean | null = null;

    const applyStyles = (useBanner: boolean, useRecommend: boolean) => {
      // 상단 배너
      if (useBanner) {
        injectStyle(STYLE_ID_BANNER, CSS_BANNER);
      } else {
        removeStyle(STYLE_ID_BANNER);
      }

      // 추천 라이브
      if (useRecommend) {
        injectStyle(STYLE_ID_RECOMMEND, CSS_RECOMMEND);
      } else {
        removeStyle(STYLE_ID_RECOMMEND);
      }
    };

    const checkAndApply = async () => {
      try {
        const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
          useHideBanner?: boolean;
          useHideRecommend?: boolean;
        } | null;

        const useBanner = saved?.useHideBanner !== false;
        const useRecommend = saved?.useHideRecommend !== false;

        // 상태가 변경되었을 때만 적용
        if (cachedBanner !== useBanner || cachedRecommend !== useRecommend) {
          cachedBanner = useBanner;
          cachedRecommend = useRecommend;
          applyStyles(useBanner, useRecommend);
          console.log(NAME, `Banner: ${useBanner}, Recommend: ${useRecommend}`);
        }
      } catch {
        if (cachedBanner === null) {
          cachedBanner = true;
          cachedRecommend = true;
          applyStyles(true, true);
        }
      }
    };

    // 초기 실행
    await checkAndApply();

    // head가 늦게 생성될 경우를 대비
    if (!document.head) {
      const observer = new MutationObserver(() => {
        if (document.head) {
          applyStyles(cachedBanner ?? true, cachedRecommend ?? true);
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }

    // 설정 변경 감지
    browser.storage.onChanged.addListener((changes) => {
      const localKey = `local:${STORAGE_KEY}`;
      const key = STORAGE_KEY;
      if (changes[localKey] || changes[key]) {
        // 캐시 초기화하여 강제 재적용
        cachedBanner = null;
        cachedRecommend = null;
        checkAndApply();
      }
    });

    console.log(NAME, "Initialized");
  },
});
