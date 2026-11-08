// 공용 스타일(public/injected/global.style.css) 주입
export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  main() {
    const link = document.createElement("link");
    link.id = "pzzk-tools-style";
    link.rel = "stylesheet";
    link.href = browser.runtime.getURL("/injected/global.style.css");
    (document.head || document.documentElement).appendChild(link);
  },
});
