/**
 * video-ui.content.ts
 * VOD 및 라이브 플레이어의 컨트롤바 디자인을 프리미엄 스타일로 변경
 */

import type { Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

const CSS = `
  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .pzp-pc__bottom {
    transition: background 0.3s, backdrop-filter 0.3s, width 0.3s;
    height: auto;
    padding: 25px 10px 10px 10px;
    border-radius: 20px;
    width: fit-content;
    /* 플레이어가 600px보다 좁으면 max-width보다 커져 잘리므로 95%로 제한 */
    min-width: min(600px, 95%);
    max-width: 95%;
    transform: translateX(-50%);
    left: 50%;
    border: 1px solid transparent;
    bottom: 20px;
    transition: 0.3s;
  }

  :fullscreen .pzp-pc .pzp-pc__bottom {
    min-width: min(800px, 95%) !important;
    padding: 35px 10px 10px 10px !important;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc--controls .pzp-pc__bottom,
  :fullscreen .pzp-pc--controls .pzp-pc__bottom {
    backdrop-filter: blur(8px) saturate(60%);
    background: rgba(15, 17, 19, 0.6);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow:0px 0px 30px rgba(0,0,0,0.6);
  }

  /* 패널이 재생바까지 감싸므로 global.style.css의 재생바 아래 틈 막이는 필요 없음 */
  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc__bottom::before,
  :fullscreen .pzp-pc__bottom::before {
    content: none !important;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .pzp-pc__progress-slider .pzp-ui-slider__wrap,
  :fullscreen .pzp-pc .pzp-pc__progress-slider .pzp-ui-slider__wrap {
    position:relative;
    width:calc(100% - 20px);
    left:10px;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .pzp-pc__progress-slider {
    bottom: 55px;
    border-radius: 10px;
    width:calc(100% - 20px);
    left:10px;
  }

  :fullscreen .pzp-pc .pzp-pc__progress-slider {
    bottom: 60px !important;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .live-bar-box,
  :fullscreen .pzp-pc .live-bar-box {
    bottom: 45px !important;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .pzp-pc__volume-slider,
  :fullscreen .pzp-pc .pzp-pc__volume-slider {
    width:72px;
    margin-right:13px;
    overflow:visible;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .pzp-ui-progress__div,
  :fullscreen .pzp-pc .pzp-ui-progress__div {
    border-radius: 10px;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc__bottom-buttons,
  :fullscreen .pzp-pc__bottom-buttons {
    margin-top:5px;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .pzp-pc .pzp-pc__seeking-preview,
  :fullscreen .pzp-pc .pzp-pc__seeking-preview {
    bottom:100px;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .player_header [class^="_header_"] {
    margin-top:10px;
    margin-left:10px;
  }

  :is(#live_player_layout, #player_layout):not(.pip_mode) .player_header [class^="_title_"] {
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

function apply({ useVideoUI }: Options) {
  const existing = document.getElementById(STYLE_ID);
  if (!useVideoUI) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  // document_start 시점엔 head가 없을 수 있으나 <html> 직속 style도 그대로 적용됨
  (document.head || document.documentElement).appendChild(style);
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    apply(await getOptions());
    watchOptions(apply);
  },
});
