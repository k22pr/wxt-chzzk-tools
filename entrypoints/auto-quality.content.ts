import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";
import {
  startUrlWatcher,
  observeElement,
  onDOMReady,
  isVideoPage,
} from "@/utils/content-helpers";

const VIDEO_ELEMENT_NAME = "video.webplayer-internal-video";
const QUALITY_ELEMENT_NAME = "li.pzp-ui-setting-quality-item";

function pressEnterOnElement(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus?.({ preventScroll: true });
  el.click();
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      code: "Enter",
    })
  );
  el.dispatchEvent(
    new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Enter",
      code: "Enter",
    })
  );
}

// setupAutoQuality returns a cleanup function
async function setupAutoQuality() {
  let qualityInterval: number | null = null;
  let processed = false;
  let observer: MutationObserver | null = null;

  async function tick() {
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );

    const videoEl =
      document.querySelector<HTMLVideoElement>(VIDEO_ELEMENT_NAME);
    const items = [
      ...new Set([
        ...document.querySelectorAll<HTMLLIElement>(QUALITY_ELEMENT_NAME),
      ]),
    ];
    const target = items.find((li) => /1080p/.test(li.innerText));
    if (!target) return false;

    const isNowHighQuality = target.classList.contains(
      "pzp-ui-setting-pane-item--checked"
    );

    if (!isNowHighQuality && !processed) {
      pressEnterOnElement(target as unknown as HTMLElement);
      videoEl?.play().catch(() => {});
      processed = true;
      return;
    }

    if (isNowHighQuality && videoEl && !videoEl.paused) {
      stopQualityInterval();
    }
  }

  function startQualityInterval() {
    if (qualityInterval !== null) return;
    qualityInterval = window.setInterval(tick, 100);
  }

  function stopQualityInterval() {
    if (qualityInterval === null) return;
    clearInterval(qualityInterval);
    qualityInterval = null;
  }

  function restartQualityInterval() {
    processed = false;
    stopQualityInterval();
    startQualityInterval();
    window.setTimeout(stopQualityInterval, 3000);
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.altKey && e.key.toLowerCase() === "h") pressEnterOnElement(null);
  };
  window.addEventListener("keydown", onKeydown);

  function tryMount() {
    const videoElement =
      document.querySelector<HTMLVideoElement>(VIDEO_ELEMENT_NAME);
    if (!videoElement) return;

    // 비디오가 이미 로드된 경우 즉시 실행
    if (videoElement.readyState >= 1) {
      void tick();
      restartQualityInterval();
    }

    // 아직 로드되지 않은 경우 이벤트 리스너 등록
    videoElement.addEventListener(
      "loadedmetadata",
      () => {
        void tick();
        restartQualityInterval();
      },
      { once: true }
    );
  }

  onDOMReady(tryMount);

  const cleanupObserver = observeElement({
    selector: VIDEO_ELEMENT_NAME,
    onElementAdded: () => tryMount(),
  });

  return () => {
    stopQualityInterval();
    window.removeEventListener("keydown", onKeydown);
    cleanupObserver();
  };
}

// setupPopupRemover returns a cleanup function
function setupPopupRemover() {
  const MSG = "광고 차단 프로그램을 사용 중이신가요?";

  const isPopupContents = (el: Element | null | undefined) =>
    el instanceof Element &&
    (el.className + "").includes("popup_contents__") &&
    !!el.textContent &&
    el.textContent.includes(MSG);

  const removePopup = (el: Element) => {
    const container =
      el.closest(
        '[role="dialog"], [role="alertdialog"], [class*="popup"], [class*="modal"], [class*="layer"]'
      ) || el;

    const parent = container.parentElement;
    if (!parent) return;
    parent.style.opacity = "0";
    document.documentElement.style.overflow = "auto";
    parent.remove();
  };

  const scan = (root: Document | Element | ShadowRoot | null) => {
    if (!root) return;
    const rootAny = root as any;
    const candidates =
      rootAny.querySelectorAll?.('[class*="popup_contents__"]') ?? [];
    candidates.forEach((el: Element) => {
      if (isPopupContents(el)) removePopup(el);
    });

    const all = rootAny.querySelectorAll?.("*") ?? [];
    all.forEach((n: Element & { shadowRoot?: ShadowRoot | null }) => {
      if (n.shadowRoot) scan(n.shadowRoot);
    });
    if ((root as any).shadowRoot) scan((root as any).shadowRoot);
  };

  const ready = () => scan(document);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) scan(node as Element);
      });
      if (m.type === "characterData" && (m.target as any)?.parentElement) {
        const el = (m.target as any).parentElement.closest?.(
          '[class*="popup_contents__"]'
        );
        if (el && isPopupContents(el)) removePopup(el);
      }
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    mo.disconnect();
  };
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        useAutoQuality?: boolean;
      } | null;

      if (saved?.useAutoQuality === false) {
        return;
      }
    } catch {
      // 옵션 로드 실패 시 기본값(사용)으로 진행
    }

    // 현재 정리 함수들
    let cleanup: (() => void) | null = null;

    // URL 변경 시 실행되는 콜백
    const handlePathChange = async () => {
      // 이전 상태 정리
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      // 팝업 제거는 항상 실행 (페이지마다 재설정)
      const cleanPopup = setupPopupRemover() || (() => {});

      if (!isVideoPage()) {
        // /live/* 페이지 등: 기본 실행
        const cleanQuality = (await setupAutoQuality()) || (() => {});
        cleanup = () => {
          cleanQuality();
          cleanPopup();
        };
        return;
      }

      // /video/* 페이지: "열심히 불러오는 중.." 문구가 사라지면 화질 자동 변경 실행
      const LOADING_SELECTOR = '[class*="vod_chatting_text__"]';
      let observer: MutationObserver | null = null;
      let executed = false;
      let loadingAppeared = false;
      let cleanQuality: (() => void) | null = null;

      // 비디오 숨기기/보이기
      const hideVideo = () => {
        const video =
          document.querySelector<HTMLVideoElement>(VIDEO_ELEMENT_NAME);
        if (video) video.style.opacity = "0";
      };
      const showVideo = () => {
        const video =
          document.querySelector<HTMLVideoElement>(VIDEO_ELEMENT_NAME);
        if (video) video.style.opacity = "1";
      };

      const tryExecute = async () => {
        if (executed) return;
        executed = true;
        cleanQuality = (await setupAutoQuality()) || (() => {});
        setTimeout(showVideo, 300);
      };

      hideVideo();

      observer = new MutationObserver(() => {
        if (!executed) hideVideo();
        const loadingElement = document.querySelector(LOADING_SELECTOR);
        if (loadingElement && !loadingAppeared) loadingAppeared = true;
        if (loadingAppeared && !loadingElement) {
          observer?.disconnect();
          tryExecute();
        }
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }

      const timeoutId = setTimeout(() => {
        observer?.disconnect();
        tryExecute();
      }, 2000);

      cleanup = () => {
        observer?.disconnect();
        clearTimeout(timeoutId);
        showVideo();
        cleanPopup();
        if (cleanQuality) cleanQuality();
      };
    };

    // URL 워처 시작 (공통 유틸리티 사용)
    startUrlWatcher({
      onPathChange: handlePathChange,
      interval: 500,
    });
  },
});
