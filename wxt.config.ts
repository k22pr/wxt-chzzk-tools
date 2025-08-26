import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
  unocss: {
    excludeEntrypoints: ["background"],
  },
  manifest: {
    permissions: ["storage"],
    optional_host_permissions: ["https://chzzk.naver.com/*"],
    web_accessible_resources: [
      {
        resources: [
          // public/ 폴더 기준 경로
          "injected/status.js",
          "injected/auto-quality.js",
          "injected/live-bar.js",
        ],
        matches: ["https://chzzk.naver.com/*"],
      },
    ],
  },
  webExt: {
    startUrls: [
      "https://chzzk.naver.com/live/32fb866e323242b770cdc790f991a6f6",
    ],
  },
});
