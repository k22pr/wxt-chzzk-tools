import type { Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

const THUMB_HOST = "livecloud-thumb.akamaized.net";
// 팝업 안내 문구와 동일하게 30초
const REFRESH_INTERVAL = 30_000;

let intervalId: ReturnType<typeof setInterval> | undefined;

/**
 * 라이브 썸네일(img src / srcset)의 date 파라미터를 현재 시각으로 갱신합니다.
 */
function refreshAllThumbnails(): void {
  const now = String(Date.now());
  for (const attr of ["src", "srcset"]) {
    document.querySelectorAll(`[${attr}*="${THUMB_HOST}"]`).forEach((el) => {
      const value = el.getAttribute(attr)!;
      const updated = value.replace(/(?<=[?&]date=)\d+/g, now);
      if (updated !== value) el.setAttribute(attr, updated);
    });
  }
}

function apply({ useThumbnailRefresh }: Options) {
  clearInterval(intervalId);
  intervalId = useThumbnailRefresh
    ? setInterval(refreshAllThumbnails, REFRESH_INTERVAL)
    : undefined;
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    apply(await getOptions());
    watchOptions(apply);
  },
});
