/**
 * ad-fix.content.ts
 * 광고 차단 팝업을 네트워크 레벨에서 차단하고,
 * 발생 시 스마트하게 클릭하여 닫는 전용 스크립트
 */

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    console.log("[chzzk-tools] Ad-Fixer (MAIN) 활성화됨");

    // --- 1. 네트워크 차단 (Fetch/XHR) ---
    const patchNetwork = () => {
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        const url =
          typeof input === "string" ? input : (input as Request).url || "";
        if (url.includes("ad-polling") || url.includes("ad-video-info")) {
          console.log("[chzzk-tools] 광고 감지 API 차단됨:", url);
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
        if (
          typeof url === "string" &&
          (url.includes("ad-polling") || url.includes("ad-video-info"))
        ) {
          (this as any)._isAdPolling = true;
        }
        return originalOpen.apply(this, arguments as any);
      };

      const originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function () {
        if ((this as any)._isAdPolling) {
          console.log("[chzzk-tools] XHR 광고 요청 차단됨");
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

    patchNetwork();
  },
});
