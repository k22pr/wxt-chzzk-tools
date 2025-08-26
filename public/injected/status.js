// 페이지 컨텍스트 테스트 스크립트
(function () {
  console.info(`[chzzk-tools] injected `);

  // 옵션 데이터를 메시지로 받을 때 로깅
  window.addEventListener("message", (e) => {
    const m = e.data && e.data.__CHZZK_TOOLS__;
    if (!m) return;
    if (
      m.type === "INIT_OPTIONS" ||
      m.type === "OPTIONS_UPDATED" ||
      m.type === "OPTIONS_DATA"
    ) {
      console.info("[chzzk-tools] options:", m.payload);
    }
  });
})();
