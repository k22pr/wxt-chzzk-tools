import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
  unocss: {
    excludeEntrypoints: ["background"],
  },
  manifest: {
    permissions: ["storage"],
    web_accessible_resources: [
      {
        resources: [
          // public/ 폴더 기준 경로
          "injected/status.js",
          "injected/auto-quality.js",
          "injected/live-bar.js",
          "injected/stream-design.css",
          "injected/stream-design.js",
          "injected/theme.css",
          "injected/theme.js",
        ],
        matches: ["https://chzzk.naver.com/*"],
      },
    ],
  },
  webExt: {
    startUrls: [
      "https://chzzk.naver.com/live/9199eb6eb3dea874f47bbb35bd1dfee2",
    ],
  },
});
