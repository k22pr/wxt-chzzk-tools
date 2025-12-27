/**
 * video-ui.content.ts
 * VOD 및 라이브 플레이어의 컨트롤바 디자인을 프리미엄 스타일로 변경
 */

import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

const NAME = "[chzzk-tools][video-ui]";

const CSS = `
  /* PIP 모드가 아닐 때만 적용 - #live_player_layout 또는 #player_layout에 pip_mode 클래스가 붙음 */
  #live_player_layout:not(.pip_mode) .pzp-pc .pzp-pc__bottom,
  #player_layout:not(.pip_mode) .pzp-pc .pzp-pc__bottom {
    transition: background 0.3s, backdrop-filter 0.3s, width 0.3s;
    height: auto;
    padding: 25px 10px 10px 10px;
    border-radius: 20px;
    width: fit-content;
    min-width: 500px;
    max-width: 95%;
    transform: translateX(-50%);
    left: 50%;
    border: 1px solid transparent;
    bottom: 20px;
    transition: 0.3s;
  }

  #live_player_layout:not(.pip_mode) .pzp-pc--controls .pzp-pc__bottom,
  #player_layout:not(.pip_mode) .pzp-pc--controls .pzp-pc__bottom {
    backdrop-filter: blur(6px) saturate(90%);
    background: rgba(25, 25, 28, 0.5);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow:0px 0px 30px rgba(0,0,0,0.6);
  }

  #live_player_layout:not(.pip_mode) .pzp-pc .pzp-pc__progress-slider .pzp-ui-slider__wrap,
  #player_layout:not(.pip_mode) .pzp-pc .pzp-pc__progress-slider .pzp-ui-slider__wrap {
    position:relative;
    width:calc(100% - 20px);
    left:10px;
  }

  #live_player_layout:not(.pip_mode) .pzp-pc .pzp-pc__progress-slider,
  #player_layout:not(.pip_mode) .pzp-pc .pzp-pc__progress-slider {
    bottom: 55px;
    border-radius: 10px;
    width:calc(100% - 20px);
    left:10px;
  }

  #live_player_layout:not(.pip_mode) .pzp-pc .live-bar-box,
  #player_layout:not(.pip_mode) .pzp-pc .live-bar-box {
    bottom: 45px !important;
  }


  /*
  #live_player_layout:not(.pip_mode) .pzp-pc .pzp-pc__volume-slider,
  #player_layout:not(.pip_mode) .pzp-pc .pzp-pc__volume-slider {
    width:72px;
    margin-right:13px;
    overflow:visible;
  }
  */

  #live_player_layout:not(.pip_mode) .pzp-pc .pzp-ui-progress__div,
  #player_layout:not(.pip_mode) .pzp-pc .pzp-ui-progress__div {
    border-radius: 10px;
  }

  #live_player_layout:not(.pip_mode) .pzp-pc__bottom-buttons,
  #player_layout:not(.pip_mode) .pzp-pc__bottom-buttons {
    margin-top:5px;
  }

  #live_player_layout:not(.pip_mode) .pzp-pc .pzp-pc__seeking-preview,
  #player_layout:not(.pip_mode) .pzp-pc .pzp-pc__seeking-preview {
    bottom:100px;
  }

  #live_player_layout:not(.pip_mode) [class*="vod_player_header_header__"],
  #player_layout:not(.pip_mode) [class*="vod_player_header_header__"] {
    margin-top:10px;
    margin-left:10px;
  }

  #live_player_layout:not(.pip_mode) [class*="vod_player_header_title__"],
  #player_layout:not(.pip_mode) [class*="vod_player_header_title__"] {
    display:inline;
    flex:none;
    backdrop-filter: blur(6px) saturate(180%);
    background: rgba(15, 15, 15, 0.5);
    box-shadow:0px 0px 50px rgba(0,0,0,0.4);
    padding:10px 20px;
    border-radius: 20px;
  }

  /* 설정 레이어는 PIP 여부와 관계없이 적용 */
  .pzp-pc__setting-layer,
  .pzp-pc__quality-layer,
  .pzp-pc__playback-speed-layer,
  .pzp-pc__volume-layer,
  .pzp-pc__more-layer {
    backdrop-filter: blur(20px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 14px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
    padding: 8px !important;
    overflow: hidden !important;
  }
`;

const STYLE_ID = "chzzk-tools-video-ui";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    const injectStyles = () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head
        ? document.head.appendChild(style)
        : document.documentElement.appendChild(style);
      console.log(NAME, "Premium Video UI styles injected");
    };

    const removeStyles = () => {
      const el = document.getElementById(STYLE_ID);
      if (el) {
        el.remove();
        console.log(NAME, "Premium Video UI styles removed");
      }
    };

    const checkAndApply = async () => {
      try {
        const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
          useVideoUI?: boolean;
        } | null;

        if (saved?.useVideoUI !== false) {
          injectStyles();
        } else {
          removeStyles();
        }
      } catch {
        injectStyles(); // 기본값: 적용
      }
    };

    // 초기 실행
    await checkAndApply();

    // DOM 변화 감지 (head가 뒤늦게 생성될 수 있음)
    const observer = new MutationObserver(() => {
      checkAndApply();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // 설정 변경 감지
    browser.storage.onChanged.addListener((changes) => {
      const localKey = `local:${STORAGE_KEY}`;
      const change = changes[localKey] || changes[STORAGE_KEY];
      if (change) {
        checkAndApply();
      }
    });
  },
});
