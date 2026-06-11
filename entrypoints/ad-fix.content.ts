/**
 * ad-fix.content.ts
 * 광고 차단 팝업을 시각적으로 숨기고 키보드 이벤트를 비디오로 전달하는 스크립트
 */

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    console.log(
      "[pzzk-tools] Ad-Fixer (MAIN) 활성화됨 - v9 (Hide + Passthrough)"
    );

    // --- 1. 네트워크 차단 (Fetch/XHR) ---
    const patchNetwork = () => {
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
    };

    // --- 2. 팝업 시각적 숨기기 (DOM 유지) ---
    const setupPopupHandler = () => {
      let popupHidden = false;

      const hidePopup = () => {
        const popupContents = document.querySelector(
          '[class*="popup_contents__"]'
        );
        if (!popupContents) return;
        if (
          !popupContents.textContent?.includes(
            "광고 차단 프로그램을 사용 중이신가요?"
          )
        )
          return;

        const dimmed = popupContents.closest(
          '[class*="popup_dimmed__"]'
        ) as HTMLElement;
        if (!dimmed || popupHidden) return;

        console.log("[pzzk-tools] 광고 팝업 감지됨, 시각적으로 숨김");

        // DOM은 유지하되 완전히 안 보이게
        dimmed.style.cssText = `
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          position: fixed !important;
          top: -9999px !important;
          left: -9999px !important;
        `;

        document.documentElement.style.overflow = "auto";
        document.body.style.overflow = "auto";
        popupHidden = true;

        // 비디오 포커스 및 플레이어 컨테이너 포커스
        const player = document.querySelector(".pzp-pc") as HTMLElement;
        const video = document.querySelector(
          "video.webplayer-internal-video"
        ) as HTMLElement;

        if (player) {
          player.focus();
          console.log("[pzzk-tools] 플레이어 컨테이너 포커스");
        }
        if (video) {
          video.focus();
          console.log("[pzzk-tools] 비디오 포커스");
        }
      };

      setInterval(hidePopup, 500);
    };

    // --- 3. 키보드 이벤트 전달 (볼륨 조절) ---
    const setupKeyboardPassthrough = () => {
      document.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            const video = document.querySelector(
              "video.webplayer-internal-video"
            ) as HTMLVideoElement;
            if (!video) return;

            // 볼륨 직접 조절
            const delta = e.key === "ArrowUp" ? 0.05 : -0.05;
            video.volume = Math.max(0, Math.min(1, video.volume + delta));
            console.log(
              `[pzzk-tools] 볼륨 수동 조절: ${Math.round(video.volume * 100)}%`
            );
          }
        },
        true
      );
    };

    patchNetwork();
    setupPopupHandler();
    setupKeyboardPassthrough();
  },
});
