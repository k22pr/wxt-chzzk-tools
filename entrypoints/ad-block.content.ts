/**
 * ad-block.content.ts
 * '광고 차단' 옵션 적용: 광고 관련 영역 숨김 CSS를 넣고, ad-fix.content.ts(MAIN world)에 켜짐 여부를 전달
 */

import { AD_BLOCK_FLAG, type Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

const CSS = `
  /* 홈 배너 광고 영역 숨김 */
  section:has(> #home_banner) {
    display: none !important;
  }

  /* 광고 차단 안내 팝업 숨김 (확인 버튼은 isTrusted 클릭만 받으므로 닫지 않고 감춤) */
  div:has(> [data-nlog-area="ad_blocking_info_layer"]) {
    display: none !important;
  }
  /* 팝업이 건 스크롤 잠금(body overflow:hidden) 해제 */
  body:has([data-nlog-area="ad_blocking_info_layer"]) {
    overflow: auto !important;
    padding-right: 0 !important;
  }
`;

const STYLE_ID = "chzzk-tools-ad-block";

function apply({ useAdBlock }: Options) {
  // MAIN world는 확장 저장소를 못 읽으므로 두 world가 함께 쓰는 페이지 localStorage로 전달.
  // ad-fix는 요청 때마다 이 값을 읽으므로 새로고침 없이 바로 반영됨
  try {
    if (useAdBlock) localStorage.setItem(AD_BLOCK_FLAG, "1");
    else localStorage.removeItem(AD_BLOCK_FLAG);
  } catch {} // 사이트 데이터 차단 시: 숨김 CSS만 적용

  const existing = document.getElementById(STYLE_ID);
  if (!useAdBlock) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  // document_start 시점엔 head가 없을 수 있으나 <html> 직속 style도 그대로 적용됨
  (document.head || document.documentElement).appendChild(style);
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    apply(await getOptions());
    watchOptions(apply);
  },
});
