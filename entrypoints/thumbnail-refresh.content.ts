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

  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (!img.src.includes(THUMB_HOST)) return;
    try {
      const url = new URL(img.src);
      if (!url.searchParams.has("date")) return;
      url.searchParams.set("date", now);
      img.src = url.toString();
    } catch {
      // URL 파싱 오류 무시
    }
  });

  document
    .querySelectorAll("img[srcset], source[srcset]")
    .forEach((el) => {
      const srcset = el.getAttribute("srcset");
      if (!srcset?.includes(THUMB_HOST)) return;
      const updated = srcset.replace(/date=\d+/g, `date=${now}`);
      if (updated !== srcset) el.setAttribute("srcset", updated);
    });
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
