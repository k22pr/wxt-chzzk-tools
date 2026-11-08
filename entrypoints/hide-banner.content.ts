/**
 * hide-banner.content.ts
 * 메인 페이지의 상단 배너 및 추천 라이브 숨김 처리
 */

import { SELECTOR, type Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

const STYLE_ID = "pzzk-tools-hide-banner";

function apply({ useHideBanner, useHideRecommend }: Options) {
  const selectors = [
    useHideBanner && SELECTOR.topBanner,
    useHideRecommend && SELECTOR.recommendLive,
  ].filter(Boolean);

  let style = document.getElementById(STYLE_ID);
  if (!selectors.length) {
    style?.remove();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  style.textContent = `${selectors.join(",\n")} { display: none !important; }`;
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    apply(await getOptions());
    watchOptions(apply);
  },
});
