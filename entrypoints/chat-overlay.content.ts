import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // 개발 중 임시 비활성화
    return;

    // 옵션 확인
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        useChatOverlay?: boolean;
      } | null;

      if (saved?.useChatOverlay === false) {
        return;
      }
    } catch {
      // 옵션 로드 실패 시 기본값(사용)으로 진행
    }

    const VIDEO_CONTAINER_SELECTOR = '[class*="live_information_player__"]';
    const CHAT_LIST_SELECTOR = '[class*="live_chatting_list_wrapper"]';

    let isOverlayMode = false;
    let chatRestoreInfo: {
      originalParent: Element | null;
      originalNextSibling: ChildNode | null;
    } | null = null;

    console.log("[Chzzk Tools] 채팅 오버레이 스크립트 로드됨");

    // 오버레이 스타일
    const OVERLAY_STYLES = `
      .chzzk-chat-overlay-container {
        position: absolute !important;
        top: 0 !important;
        right: 0 !important;
        height: 50% !important;
        width: 260px !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
        display: flex !important;
        flex-direction: column !important;
        transition: opacity 0.2s, transform 0.2s !important;
      }
      .chzzk-chat-overlay-container.hidden {
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateX(100%) !important;
      }
      .chzzk-chat-overlay-container [class*="live_chatting_list_item__"] {
        margin-bottom: 1px !important;
      }
      .chzzk-chat-overlay-container [class*="live_chatting_message_container__"] {
        padding: 0 !important;
      }
      .chzzk-chat-overlay-container [class*="live_chatting_message_text__"] {
        color: #fff !important;
        font-size: 13px !important;
        border-radius: 20px !important;
        padding: 3px 8px !important;
        background: rgba(0, 0, 0, 0.6) !important;
        backdrop-filter: blur(6px) !important;
      }
      .chzzk-chat-overlay-container [class*="live_chatting_message_nickname__"] {
        display: none !important;
      }
      .chzzk-chat-overlay-container [class*="live_chatting_guide_filter__"],
      .chzzk-chat-overlay-container [class*="live_chatting_guide_container__"] {
        display: none !important;
      }
      .chzzk-chat-overlay-toggle {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        background: rgba(0, 0, 0, 0.7) !important;
        border: none !important;
        border-radius: 4px !important;
        color: white !important;
        padding: 6px 10px !important;
        cursor: pointer !important;
        font-size: 12px !important;
        z-index: 1001 !important;
        opacity: 0 !important;
        transition: opacity 0.2s !important;
      }
      .chzzk-video-container:hover .chzzk-chat-overlay-toggle {
        opacity: 1 !important;
      }
      .chzzk-chat-overlay-toggle:hover {
        background: rgba(0, 0, 0, 0.9) !important;
      }
    `;

    // 스타일 주입
    function injectStyles() {
      if (document.getElementById("chzzk-chat-overlay-styles")) return;

      const style = document.createElement("style");
      style.id = "chzzk-chat-overlay-styles";
      style.textContent = OVERLAY_STYLES;
      document.head.appendChild(style);
    }

    // 채팅 오버레이 활성화
    function enableOverlay() {
      const videoContainer = document.querySelector(VIDEO_CONTAINER_SELECTOR);
      const chatList = document.querySelector(CHAT_LIST_SELECTOR);

      if (!videoContainer || !chatList) {
        console.warn(
          "[Chzzk Tools] 비디오 컨테이너 또는 채팅 리스트를 찾을 수 없습니다"
        );
        return false;
      }

      // 복원 정보 저장
      chatRestoreInfo = {
        originalParent: chatList.parentElement,
        originalNextSibling: chatList.nextSibling,
      };

      // 비디오 컨테이너에 relative position 확보
      const vcElement = videoContainer as HTMLElement;
      if (getComputedStyle(vcElement).position === "static") {
        vcElement.style.position = "relative";
      }
      vcElement.classList.add("chzzk-video-container");

      // 채팅 리스트를 비디오 위로 이동
      chatList.classList.add("chzzk-chat-overlay-container");
      videoContainer.appendChild(chatList);

      // 토글 버튼 추가
      let toggleBtn = videoContainer.querySelector(
        ".chzzk-chat-overlay-toggle"
      ) as HTMLButtonElement;
      if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.className = "chzzk-chat-overlay-toggle";
        toggleBtn.textContent = "채팅 숨기기";
        toggleBtn.addEventListener("click", () => {
          const isHidden = chatList.classList.toggle("hidden");
          toggleBtn.textContent = isHidden ? "채팅 보기" : "채팅 숨기기";
        });
        videoContainer.appendChild(toggleBtn);
      }

      isOverlayMode = true;
      console.log("[Chzzk Tools] 채팅 오버레이 활성화됨");
      return true;
    }

    // 채팅 오버레이 비활성화
    function disableOverlay() {
      const chatList = document.querySelector(".chzzk-chat-overlay-container");

      if (!chatList || !chatRestoreInfo?.originalParent) {
        return false;
      }

      // 클래스 제거
      chatList.classList.remove("chzzk-chat-overlay-container", "hidden");

      // 원래 위치로 복원
      if (chatRestoreInfo.originalNextSibling) {
        chatRestoreInfo.originalParent.insertBefore(
          chatList,
          chatRestoreInfo.originalNextSibling
        );
      } else {
        chatRestoreInfo.originalParent.appendChild(chatList);
      }

      // 토글 버튼 제거
      const toggleBtn = document.querySelector(".chzzk-chat-overlay-toggle");
      toggleBtn?.remove();

      chatRestoreInfo = null;
      isOverlayMode = false;
      console.log("[Chzzk Tools] 채팅 오버레이 비활성화됨");
      return true;
    }

    // 토글 함수
    function toggleOverlay() {
      if (isOverlayMode) {
        return disableOverlay();
      } else {
        return enableOverlay();
      }
    }

    // 초기화
    function init() {
      injectStyles();

      // 컨트롤 바에 오버레이 토글 버튼 추가
      const CONTROL_BAR_SELECTOR = ".pzp-pc__bottom-buttons-right";

      const addControlButton = () => {
        const controlBar = document.querySelector(CONTROL_BAR_SELECTOR);
        if (!controlBar) return;

        if (controlBar.querySelector(".chzzk-overlay-control-btn")) return;

        const btn = document.createElement("button");
        btn.className = "pzp-button chzzk-overlay-control-btn";
        btn.style.cssText =
          "width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff;";
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <line x1="14" y1="8" x2="20" y2="8"/>
            <line x1="14" y1="12" x2="20" y2="12"/>
            <line x1="14" y1="16" x2="20" y2="16"/>
          </svg>
        `;
        btn.title = "채팅 오버레이";
        btn.addEventListener("click", toggleOverlay);

        // 첫 번째 위치에 삽입
        if (controlBar.firstChild) {
          controlBar.insertBefore(btn, controlBar.firstChild);
        } else {
          controlBar.appendChild(btn);
        }
      };

      // 초기 실행 및 재시도
      addControlButton();
      setTimeout(addControlButton, 1000);
      setTimeout(addControlButton, 3000);

      // DOM 변경 감시
      const observer = new MutationObserver(() => {
        addControlButton();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // 페이지 로드 후 초기화
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  },
});
