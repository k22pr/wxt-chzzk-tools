import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

const NAME = "chzzk-tools";
const REFRESH_INTERVAL = 15000;

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * 단일 이미지의 해상도를 480 -> 720으로 변경합니다.
 */
function upgradeTo720(img: HTMLImageElement): void {
  // const src = img.src;
  // if (!src.includes("livecloud-thumb.akamaized.net")) return;
  // if (!src.includes("/image_480.jpg")) return;
  // try {
  //   const url = new URL(src);
  //   url.pathname = url.pathname.replace("/image_480.jpg", "/image_720.jpg");
  //   img.src = url.toString();
  // } catch {
  //   // URL 파싱 오류 무시
  // }
}

/**
 * 모든 썸네일 이미지의 해상도를 720으로 변경합니다. (즉시 실행)
 */
function upgradeAllTo720(): void {
  const images = document.querySelectorAll<HTMLImageElement>("img");
  images.forEach(upgradeTo720);

  // srcset도 처리
  const elements = document.querySelectorAll<HTMLImageElement>(
    "img[srcset], source[srcset]"
  );
  elements.forEach((el) => {
    const srcset = el.getAttribute("srcset");
    if (!srcset || !srcset.includes("livecloud-thumb.akamaized.net")) return;
    if (!srcset.includes("/image_480.jpg")) return;

    const updated = srcset.replace(/\/image_480\.jpg/g, "/image_720.jpg");
    if (updated !== srcset) {
      el.setAttribute("srcset", updated);
    }
  });
}

/**
 * MutationObserver로 새로 추가되는 이미지도 720으로 변경합니다.
 */
function observeNewImages(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          upgradeTo720(node);
        } else if (node instanceof HTMLElement) {
          // 하위 이미지도 처리
          node.querySelectorAll<HTMLImageElement>("img").forEach(upgradeTo720);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * livecloud-thumb.akamaized.net 썸네일 이미지의 date 파라미터를 갱신합니다.
 */
function refreshThumbnailDates(): void {
  const images = document.querySelectorAll<HTMLImageElement>("img");

  images.forEach((img) => {
    const src = img.src;
    if (!src.includes("livecloud-thumb.akamaized.net")) return;

    try {
      const url = new URL(src);
      const dateParam = url.searchParams.get("date");

      if (dateParam) {
        // 현재 시간으로 date 파라미터 갱신
        const newDate = Date.now();
        url.searchParams.set("date", newDate.toString());
        // url.pathname = url.pathname.replace(
        //   "/image_480.jpg",
        //   "/image_720.jpg"
        // );
        img.src = url.toString();
      }
    } catch {
      // URL 파싱 오류 무시
    }
  });
}

/**
 * srcset 속성의 썸네일 date 파라미터도 갱신합니다.
 */
function refreshSrcsetDates(): void {
  const elements = document.querySelectorAll<HTMLImageElement>(
    "img[srcset], source[srcset]"
  );

  elements.forEach((el) => {
    const srcset = el.getAttribute("srcset");
    if (!srcset || !srcset.includes("livecloud-thumb.akamaized.net")) return;

    try {
      // 현재 시간으로 date 파라미터 갱신
      const now = Date.now();
      let updatedSrcset = srcset.replace(/date=\d+/g, `date=${now}`);

      // updatedSrcset = updatedSrcset.replace(
      //   /\/image_480\.jpg/g,
      //   "/image_720.jpg"
      // );

      if (updatedSrcset !== srcset) {
        el.setAttribute("srcset", updatedSrcset);
      }
    } catch {
      // 파싱 오류 무시
    }
  });
}

/**
 * 모든 썸네일 갱신 실행
 */
function refreshAllThumbnails(): void {
  refreshThumbnailDates();
  refreshSrcsetDates();
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    // 페이지 로드 시 즉시 720 해상도로 변경
    // upgradeAllTo720();
    // 새로 추가되는 이미지도 720으로 변경
    observeNewImages();

    // 썸네일 갱신 시작
    const startRefresh = () => {
      if (intervalId) return; // 이미 실행 중이면 무시
      intervalId = setInterval(() => {
        refreshAllThumbnails();
      }, REFRESH_INTERVAL);
    };

    // 썸네일 갱신 중지
    const stopRefresh = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // 옵션 확인 및 적용
    const checkAndApply = async () => {
      const saved = await storage.getItem<{
        useThumbnailRefresh?: boolean;
      }>(`local:${STORAGE_KEY}`);

      // 저장된 값이 없으면 기본값 true 적용
      const isEnabled = saved?.useThumbnailRefresh ?? true;

      if (isEnabled) {
        startRefresh();
      } else {
        stopRefresh();
      }
    };

    // 초기 확인
    await checkAndApply();

    // storage 변경 감시
    storage.watch<{ useThumbnailRefresh?: boolean }>(
      `local:${STORAGE_KEY}`,
      async () => {
        await checkAndApply();
      }
    );
  },
});
