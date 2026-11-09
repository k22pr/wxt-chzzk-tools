// 공용 스타일: import한 CSS는 WXT가 manifest의 content_scripts[].css로 넣음
// (Firefox는 run_at 시점에 CSS를 넣으므로 document_start로 둬야 페이지가 그려지기 전에 적용됨)
import "@/assets/global.style.css";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  main() {},
});
