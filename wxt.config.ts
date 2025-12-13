import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
  unocss: {
    excludeEntrypoints: ["background"],
  },
  manifest: {
    name: "치직툴 (chzzk-tools)",
    permissions: ["storage", "declarativeNetRequest"],
    host_permissions: ["https://chzzk.naver.com/*"],
    web_accessible_resources: [
      {
        resources: ["injected/global.style.css"],
        matches: ["https://chzzk.naver.com/*"],
      },
    ],
  },
  webExt: {
    startUrls: [
      "https://chzzk.naver.com/live/3497a9a7221cc3ee5d3f95991d9f95e9",
    ],
  },
});
