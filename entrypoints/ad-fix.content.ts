/**
 * ad-fix.content.ts
 * 광고 표시 플래그·미드롤 광고 폴링을 차단하고, 광고 차단 팝업이 떠 있는 동안 키보드 볼륨 조절을 비디오로 전달하는 스크립트
 * (팝업 자체는 global.style.css에서 숨김)
 */

const AD_BLOCK_POPUP = '[data-nlog-area="ad_blocking_info_layer"]';
// 광고 표시 여부 API. 응답은 {livePlaybackJson:{liveId, chatChannelId}}로 위장한 프리롤/미드롤 플래그
const AD_FLAG_API = "/seoraksan?";
const NO_ADS = JSON.stringify({
  code: 200,
  message: null,
  content: { playerAdDisplayResponse: { preRoll: false, midRoll: false } },
});

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    // --- 0. 광고 표시 플래그 차단 ---
    // 광고 플래그는 URL·응답을 AES-GCM으로 암호화한 터널(api.chzzk.naver.com/service/t/...)로 받아서
    // 네트워크 단에선 구분이 안 됨. 요청마다 URL을 암호화한 키로 응답을 복호화하므로,
    // 플래그 API URL을 암호화한 키의 복호화 결과를 '광고 없음'으로 바꾼다.
    const subtle = crypto.subtle;
    const encrypt = subtle.encrypt.bind(subtle);
    const decrypt = subtle.decrypt.bind(subtle);
    const adFlagKeys = new WeakSet<CryptoKey>();
    subtle.encrypt = (algorithm, key, data) => {
      try {
        if (new TextDecoder().decode(data).includes(AD_FLAG_API)) adFlagKeys.add(key);
      } catch {}
      return encrypt(algorithm, key, data);
    };
    subtle.decrypt = (algorithm, key, data) => {
      if (!adFlagKeys.has(key)) return decrypt(algorithm, key, data);
      console.log("[chzzk-tools] 광고 표시 플래그 차단됨");
      return Promise.resolve(new TextEncoder().encode(NO_ADS).buffer as ArrayBuffer);
    };

    // --- 1. 미드롤 광고 폴링 차단 (XHR) ---
    // 미드롤 광고 정보는 axios(XHR)로 ad-polling을 조회함. 위 플래그로 미드롤 컴포넌트가 아예 안 뜨지만,
    // 플래그 우회가 깨질 때를 대비해 '광고 없음'으로 응답
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      const urlStr = typeof url === "string" ? url : url.toString();
      // 같은 객체를 다른 URL로 다시 open하면 이전 가짜 응답 상태를 지움
      (this as any)._isAdPolling = urlStr.includes("ad-polling");
      for (const key of ["status", "readyState", "responseText"]) delete (this as any)[key];
      return originalOpen.apply(this, arguments as any);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      if ((this as any)._isAdPolling) {
        console.log("[chzzk-tools] XHR 광고 요청 차단됨");
        Object.defineProperty(this, "status", { value: 200, configurable: true });
        Object.defineProperty(this, "responseText", {
          value: JSON.stringify({
            code: 200,
            message: "success",
            content: { pollingInterval: 300000, adInfo: null },
          }),
          configurable: true,
        });
        Object.defineProperty(this, "readyState", { value: 4, configurable: true });
        this.dispatchEvent(new Event("readystatechange"));
        this.dispatchEvent(new Event("load"));
        // axios는 loadend로 응답을 처리하므로 없으면 요청이 끝나지 않고 계속 대기함
        this.dispatchEvent(new Event("loadend"));
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
