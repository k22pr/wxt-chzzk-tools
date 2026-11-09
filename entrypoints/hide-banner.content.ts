/**
 * hide-banner.content.ts
 * 메인 페이지의 상단 배너, 추천 라이브, 추천 콘텐츠 숨김 처리
 */

import { SELECTOR, type Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

const STYLE_ID = "pzzk-tools-hide-banner";
const PREVIEW_VIDEO = `${SELECTOR.recommendLive} video`;

let hideRecommend = false;

// CSS로 가려도 추천 라이브 미리보기는 계속 재생되며 영상을 받으므로 재생을 멈춘다
// (media 'play' 이벤트는 버블링되지 않지만 캡처 단계에서는 document까지 전달됨)
function pauseHiddenPreview(e: Event) {
  const video = e.target;
  if (hideRecommend && video instanceof HTMLVideoElement && video.matches(PREVIEW_VIDEO)) {
    video.pause();
  }
}

function apply({ useHideBanner, useHideRecommend, useHideRecommendContent }: Options) {
  const selectors = [
    useHideBanner && SELECTOR.topBanner,
    useHideRecommend && SELECTOR.recommendLive,
    useHideRecommendContent && SELECTOR.recommendContent,
  ].filter(Boolean);

  let style = document.getElementById(STYLE_ID);
  if (!selectors.length) {
    style?.remove();
  } else {
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = `${selectors.join(",\n")} { display: none !important; }`;
  }

  // 숨김을 켜면 이미 재생 중인 미리보기도 멈추고, 끄면 다시 재생 (음소거 자동재생이라 허용됨)
  // 단, 치지직이 아직 플레이어를 드러내지 않은 상태(_is_hidden_, opacity 0)면 직접 play 시
  // 안 보이는 채로 받기만 하므로 치지직의 다음 재생 시도(리사이즈/재진입)에 맡긴다
  if (useHideRecommend !== hideRecommend) {
    document.querySelectorAll<HTMLVideoElement>(PREVIEW_VIDEO).forEach((video) => {
      if (useHideRecommend) video.pause();
      else if (!video.closest('[class*="_is_hidden_"]')) video.play().catch(() => {});
    });
  }
  hideRecommend = useHideRecommend;
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    document.addEventListener("play", pauseHiddenPreview, true);
    apply(await getOptions());
    watchOptions(apply);
  },
});
