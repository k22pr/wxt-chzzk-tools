export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    // 페이지 컨텍스트 테스트용 status 스크립트
    // 필요 시 여기에 상태 로깅이나 디버그 코드를 추가할 수 있습니다.
  },
});
