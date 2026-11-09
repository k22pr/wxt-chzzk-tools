// ==UserScript==
// @name         CHZZK  Ad Block Auto Quality Change
// @version      1.1.0
// @match        https://chzzk.naver.com/*
// @description  치지직 프리롤·미드롤 광고를 차단하고, 광고 차단 안내 팝업을 숨기며, 최고 화질로 자동 변경합니다.
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @inject-into  page
// @author       k22pr
// @namespace    k22pr/chzzk-ad-block-auto-quality-change
// @license MIT
// @downloadURL https://update.greasyfork.org/scripts/546818/CHZZK%20%20Ad%20Block%20Auto%20Quality%20Change.user.js
// @updateURL https://update.greasyfork.org/scripts/546818/CHZZK%20%20Ad%20Block%20Auto%20Quality%20Change.meta.js
// ==/UserScript==

(function () {
  "use strict";

  const VIDEO_ELEMENT_NAME = "video.webplayer-internal-video";
  const QUALITY_ELEMENT_NAME = "li.pzp-ui-setting-quality-item";
  const AD_BLOCK_POPUP = '[data-nlog-area="ad_blocking_info_layer"]';

  // --- 1. 광고 표시 플래그 차단 ---
  // 치지직은 광고(프리롤·미드롤) 표시 여부를 /seoraksan API로 받는데, URL과 응답을 AES-GCM으로 암호화한
  // 터널(api.chzzk.naver.com/service/t/...)을 거쳐서 네트워크 단에선 구분이 안 됨.
  // 요청마다 URL을 암호화한 키로 응답을 복호화하므로, 플래그 API URL을 암호화한 키의 복호화 결과를 '광고 없음'으로 바꾼다.
  // (응답은 {livePlaybackJson:{liveId, chatChannelId}}로 위장한 프리롤/미드롤 플래그)
  const AD_FLAG_API = "/seoraksan?";
  const NO_ADS = JSON.stringify({
    code: 200,
    message: null,
    content: { playerAdDisplayResponse: { preRoll: false, midRoll: false } },
  });
  const subtle = crypto.subtle;
  const encrypt = subtle.encrypt.bind(subtle);
  const decrypt = subtle.decrypt.bind(subtle);
  const adFlagKeys = new WeakSet();
  subtle.encrypt = (algorithm, key, data) => {
    try {
      if (new TextDecoder().decode(data).includes(AD_FLAG_API)) adFlagKeys.add(key);
    } catch {}
    return encrypt(algorithm, key, data);
  };
  subtle.decrypt = (algorithm, key, data) => {
    if (!adFlagKeys.has(key)) return decrypt(algorithm, key, data);
    console.log("[chzzk-ad-block] 광고 표시 플래그 차단됨");
    return Promise.resolve(new TextEncoder().encode(NO_ADS).buffer);
  };

  // --- 2. 광고 차단 안내 팝업 숨김 ---
  // 확인 버튼은 isTrusted 클릭만 받으므로 닫지 않고 감추고, 팝업이 건 스크롤 잠금을 푼다
  const style = document.createElement("style");
  style.textContent = `
    div:has(> ${AD_BLOCK_POPUP}) { display: none !important; }
    body:has(${AD_BLOCK_POPUP}) { overflow: auto !important; padding-right: 0 !important; }
  `;
  // document-start 시점엔 문서 요소가 아직 없을 수 있음
  const addStyle = () => (document.head || document.documentElement).appendChild(style);
  if (document.documentElement) addStyle();
  else document.addEventListener("DOMContentLoaded", addStyle, { once: true });

  // 숨긴 팝업이 떠 있는 동안 플레이어 단축키가 막히므로 ↑/↓ 볼륨 조절을 비디오로 직접 전달
  // (팝업이 없을 땐 플레이어 기본 단축키가 처리하므로 개입하지 않음)
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!document.querySelector(AD_BLOCK_POPUP)) return;
      // 채팅/검색 입력 중의 방향키는 무시
      if (e.target?.closest?.("input, textarea, [contenteditable]")) return;
      const video = document.querySelector(VIDEO_ELEMENT_NAME);
      if (!video) return;
      const delta = e.key === "ArrowUp" ? 0.05 : -0.05;
      video.volume = Math.max(0, Math.min(1, video.volume + delta));
    },
    true
  );

  // --- 3. 자동 화질 변경 ---
  // 플레이어 화질 메뉴 항목은 click만으로는 바뀌지 않고 Enter 키 입력을 받아야 전환됨
  function pressEnterOnElement(el) {
    el.focus?.({ preventScroll: true });
    el.click();
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", code: "Enter" }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter", code: "Enter" }));
  }

  // 라이브 채널 ID / VOD 번호 (그 외 페이지는 null)
  const contentId = () => location.pathname.match(/^\/(?:live|video)\/([^/?#]+)/)?.[1] ?? null;

  // 화질 목록이 준비되면(최대 3초) 최고 화질을 한 번 선택
  // 목록은 높은 화질부터 나열됨: 숫자로 시작하는 첫 항목이 최고 화질 (1080p가 없는 방송도 대응)
  // ("자동" 항목은 "자동 (720p)"처럼 현재 해상도를 포함하므로 숫자로 시작하는지로 구분)
  function selectTopQuality(video) {
    const until = Date.now() + 3000;
    const timer = setInterval(() => {
      const top = [...document.querySelectorAll(QUALITY_ELEMENT_NAME)].find((li) =>
        /^\s*\d+p/.test(li.textContent ?? "")
      );
      if (!top && Date.now() < until) return;
      clearInterval(timer);
      if (!top || top.classList.contains("pzp-ui-setting-pane-item--checked")) return;
      pressEnterOnElement(top);
      video.play().catch(() => {});
    }, 100);
  }

  // 새로 들어간 라이브/VOD가 처음 로드될 때만 적용
  // (화질을 바꿔 다시 로드되거나, 소형 플레이어로 같은 방송을 이어 보는 동안에는 사용자 선택 유지)
  let applied = null;
  // media 이벤트는 버블링되지 않지만 캡처 단계에서는 document까지 전달됨
  document.addEventListener(
    "loadedmetadata",
    (e) => {
      const video = e.target;
      const id = contentId();
      if (!id || id === applied) return;
      if (!(video instanceof HTMLVideoElement) || !video.matches(VIDEO_ELEMENT_NAME)) return;
      applied = id;
      selectTopQuality(video);
    },
    true
  );
})();
