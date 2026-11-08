/**
 * thumbnail-zoom.content.ts
 * 비디오 카드 썸네일에 마우스오버 시 1.3배 확대
 */

import { getOptions } from "@/utils/content-helpers";

const NAME = "[pzzk-tools][thumbnail-zoom]";
const STYLE_ID = "pzzk-tools-thumbnail-zoom";
// 공용 비디오 카드(세로/가로형)의 썸네일 링크: <div class="_container_… _vertical_…"><a class="_thumbnail_…">
const THUMBNAIL_SELECTOR =
  ':is([class*=" _vertical_"], [class*=" _horizontal_"]) > a[class^="_thumbnail_"]';

const CSS = `
  /* 확대된 썸네일 스타일 */
  .chzzk-zoom-active {
    position: absolute !important;
    z-index: 12001 !important;
    transform: scale(1.4) !important;
    transform-origin: center center !important;
    transition: transform 0.15s ease-out !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
    border-radius: 8px !important;
  }

  /* placeholder 스타일 */
  .chzzk-zoom-placeholder {
    visibility: hidden;
    pointer-events: none;
  }
`;

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    if (!(await getOptions()).useThumbnailZoom) {
      console.log(NAME, "Disabled by option");
      return;
    }

    // 스타일 삽입
    const injectStyle = () => {
      if (document.getElementById(STYLE_ID)) return;

      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    };

    // 썸네일 이벤트 핸들러
    const handleMouseEnter = (e: Event) => {
      const thumbnail = e.currentTarget as HTMLElement;
      if (thumbnail.classList.contains("chzzk-zoom-active")) return;

      // 현재 크기와 위치 저장
      const rect = thumbnail.getBoundingClientRect();
      const parent = thumbnail.parentElement;
      if (!parent) return;

      // 부모에 position: relative 설정
      const parentStyle = getComputedStyle(parent);
      if (parentStyle.position === "static") {
        parent.style.position = "relative";
      }

      // 현재 위치 저장 (offset 기준)
      const offsetLeft = thumbnail.offsetLeft;
      const offsetTop = thumbnail.offsetTop;

      // placeholder 생성
      const placeholder = document.createElement("div");
      placeholder.className = "chzzk-zoom-placeholder";
      placeholder.style.width = `${rect.width}px`;
      placeholder.style.height = `${rect.height}px`;
      placeholder.dataset.chzzkPlaceholder = "true";

      // placeholder 삽입
      parent.insertBefore(placeholder, thumbnail);

      // 현재 위치를 절대 위치로 설정 (offset 기준)
      thumbnail.style.left = `${offsetLeft}px`;
      thumbnail.style.top = `${offsetTop}px`;
      thumbnail.style.width = `${rect.width}px`;
      thumbnail.style.height = `${rect.height}px`;

      // 확대 클래스 추가
      thumbnail.classList.add("chzzk-zoom-active");
    };

    const handleMouseLeave = (e: Event) => {
      const thumbnail = e.currentTarget as HTMLElement;
      if (!thumbnail.classList.contains("chzzk-zoom-active")) return;

      // 확대 클래스 제거
      thumbnail.classList.remove("chzzk-zoom-active");

      // 스타일 초기화
      thumbnail.style.left = "";
      thumbnail.style.top = "";
      thumbnail.style.width = "";
      thumbnail.style.height = "";

      // placeholder 제거
      const parent = thumbnail.parentElement;
      if (parent) {
        const placeholder = parent.querySelector(
          '[data-chzzk-placeholder="true"]'
        );
        if (placeholder) {
          placeholder.remove();
        }
      }
    };

    // 썸네일에 이벤트 바인딩
    const bindThumbnails = () => {
      const thumbnails = document.querySelectorAll(THUMBNAIL_SELECTOR);
      thumbnails.forEach((thumbnail) => {
        if (thumbnail.hasAttribute("data-chzzk-zoom-bound")) return;

        thumbnail.setAttribute("data-chzzk-zoom-bound", "true");
        thumbnail.addEventListener("mouseenter", handleMouseEnter);
        thumbnail.addEventListener("mouseleave", handleMouseLeave);
      });
    };

    // 초기화
    if (document.head) {
      injectStyle();
    }

    bindThumbnails();

    // 동적으로 추가되는 썸네일 감지
    const observer = new MutationObserver(() => {
      bindThumbnails();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log(NAME, "Initialized");
  },
});
