/**
 * ad-fix.content.ts
 * 광고 감지 API를 차단하고, 광고 차단 팝업이 떠 있는 동안 키보드 볼륨 조절을 비디오로 전달하는 스크립트
 * (팝업 자체는 global.style.css에서 숨김)
 */

const AD_BLOCK_POPUP = '[data-nlog-area="ad_blocking_info_layer"]';

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    // --- 1. 네트워크 차단 (Fetch/XHR) ---
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      const url =
        typeof input === "string" ? input : (input as Request).url || "";
      if (url.includes("ad-polling") || url.includes("ad-video-info")) {
        console.log("[pzzk-tools] 광고 감지 API 차단됨:", url);
        return Promise.resolve(
          new Response(
            JSON.stringify({
              code: 200,
              message: "success",
              content: { pollingInterval: 300000, adInfo: null },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return originalFetch.apply(this, arguments as any);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("ad-polling") || urlStr.includes("ad-video-info")) {
        (this as any)._isAdPolling = true;
      }
      return originalOpen.apply(this, arguments as any);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      if ((this as any)._isAdPolling) {
        console.log("[pzzk-tools] XHR 광고 요청 차단됨");
        Object.defineProperty(this, "status", { value: 200 });
        Object.defineProperty(this, "responseText", {
          value: JSON.stringify({
            code: 200,
            message: "success",
            content: {},
          }),
        });
        Object.defineProperty(this, "readyState", { value: 4 });
        this.dispatchEvent(new Event("load"));
        this.dispatchEvent(new Event("readystatechange"));
        return;
      }
      return originalSend.apply(this, arguments as any);
    };

    // --- 2. 키보드 이벤트 전달 (볼륨 조절) ---
    // 팝업이 없을 땐 플레이어 기본 단축키가 처리하므로 개입하지 않음 (중복 조절 방지)
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        if (!document.querySelector(AD_BLOCK_POPUP)) return;
        // 채팅/검색 입력 중의 방향키는 무시
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("input, textarea, [contenteditable]")) return;

        const video = document.querySelector<HTMLVideoElement>(
          "video.webplayer-internal-video"
        );
        if (!video) return;

        const delta = e.key === "ArrowUp" ? 0.05 : -0.05;
        video.volume = Math.max(0, Math.min(1, video.volume + delta));
      },
      true
    );
  },
});
