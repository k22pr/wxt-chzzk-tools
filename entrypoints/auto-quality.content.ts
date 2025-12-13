import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

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

async function setupAutoQuality() {
  let qualityInterval: number | null = null;
  let processed = false;

  async function tick() {
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );

    const hasLive =
      location.pathname.includes("/live/") ||
      location.pathname.includes("/video/");
    const videoEl =
      document.querySelector<HTMLVideoElement>(VIDEO_ELEMENT_NAME);
    const items = [
      ...new Set([
        ...document.querySelectorAll<HTMLLIElement>(QUALITY_ELEMENT_NAME),
      ]),
    ];
    const target = items.find((li) => /1080p|720p/.test(li.innerText));
    if (!target) return false;

    const isNowHighQuality = target.classList.contains(
      "pzp-ui-setting-pane-item--checked"
    );

    if (hasLive && !isNowHighQuality && !processed) {
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

  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "h") pressEnterOnElement(null);
  });

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

  (function patchHistoryForSPA() {
    const fireLoc = () => window.setTimeout(restartQualityInterval, 0);
    const _ps = history.pushState;
    const _rs = history.replaceState;
    history.pushState = function (...args: any[]) {
      const r = _ps.apply(this, args as any);
      fireLoc();
      return r;
    };
    history.replaceState = function (...args: any[]) {
      const r = _rs.apply(this, args as any);
      fireLoc();
      return r;
    };
    window.addEventListener("popstate", fireLoc);
  })();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryMount, { once: true });
  } else {
    tryMount();
  }

  new MutationObserver((list) => {
    for (const m of list) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        const el = n as Element;
        if (
          el.matches?.(VIDEO_ELEMENT_NAME) ||
          el.querySelector?.(VIDEO_ELEMENT_NAME)
        ) {
          tryMount();
        }
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}

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

  (function patchHistoryForSPA() {
    const fireLoc = () => window.setTimeout(() => scan(document), 0);
    const _ps = history.pushState;
    const _rs = history.replaceState;
    history.pushState = function (...args: any[]) {
      const r = _ps.apply(this, args as any);
      fireLoc();
      return r;
    };
    history.replaceState = function (...args: any[]) {
      const r = _rs.apply(this, args as any);
      fireLoc();
      return r;
    };
    window.addEventListener("popstate", fireLoc);
  })();
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/live/*"],
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

    setupPopupRemover();

    const isVideoPage = window.location.pathname.startsWith("/video/");

    if (isVideoPage) {
      // /video/* 페이지: 3초 딜레이 후 화질 변경 (채팅 다시보기 로딩 충돌 방지)
      setTimeout(async () => {
        await setupAutoQuality();
      }, 2000);
    } else {
      // /live/* 페이지: 즉시 실행
      await setupAutoQuality();
    }
  },
});
