import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
  unocss: {
    excludeEntrypoints: ["background"],
  },
  manifest: {
    name: "치직툴 - 라이브 스트리밍 도구",
    // scripting: 팝업 '모양' 탭에서 숨길 영역을 페이지에 하이라이트할 때 사용
    permissions: ["storage", "declarativeNetRequest", "scripting"],
    host_permissions: [
      "https://chzzk.naver.com/*",
      "https://api.chzzk.naver.com/*",
      "https://apis.naver.com/*",
    ],
  },
  webExt: {
    startUrls: [
      "https://chzzk.naver.com/live/3497a9a7221cc3ee5d3f95991d9f95e9",
    ],
  },
});
