// 1. Import the style

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],

  async main(ctx) {
    console.log("hello");
    (function readInitFromDataset() {
      try {
        // 현재 스크립트 주입 시 dataset으로 전달됨
        const scripts = document.getElementsByTagName("script");
        const self = scripts[scripts.length - 1];
        if (self?.dataset?.chzzkToolsOptions) {
          const initial = JSON.parse(self.dataset.chzzkToolsOptions);
          applyOptions(initial);
        }
      } catch {}
    })();

    // 2) postMessage로 전달되는 초기/변경값 수신
    window.addEventListener("message", (e) => {
      const m = e.data && e.data.__CHZZK_TOOLS__;
      if (!m) return;
      if (
        m.type === "INIT_OPTIONS" ||
        m.type === "OPTIONS_UPDATED" ||
        m.type === "OPTIONS_DATA"
      ) {
        applyOptions(m.payload || {});
      }
    });

    function applyOptions(options) {
      console.log(options);
      // if (options?.useLiveBar) {
      //   require("./injected/live-bar.js");
      // }

      // if (options?.useAutoQuality) {
      //   require("./injected/ad-block-auto-quality-change.js");
      // }
      // 옵션에 따라 동작을 분기
      // ex) options.useLiveBar, options.useAutoQuality, options.useStreamDesign
    }
  },
});
