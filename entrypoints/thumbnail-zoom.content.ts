/**
 * thumbnail-zoom.content.ts
 * 비디오 카드 썸네일에 마우스오버 시 1.3배 확대
 */

import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

const NAME = "[pzzk-tools][thumbnail-zoom]";
const STYLE_ID = "pzzk-tools-thumbnail-zoom";

const CSS = `
  /* 확대된 썸네일 스타일 */
  [class*="video_card_thumbnail__"].chzzk-zoom-active {
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
    // 옵션 확인
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        useThumbnailZoom?: boolean;
      } | null;

      // 기본값: 비활성화 (false)
      if (saved?.useThumbnailZoom !== true) {
        console.log(NAME, "Disabled by option");
        return;
      }
    } catch {
      // 기본값: 비활성화
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
      const thumbnails = document.querySelectorAll(
        '[class*="video_card_thumbnail__"]'
      );
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
