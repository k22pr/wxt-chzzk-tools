import { createApp } from "vue";
import PipButton from "@/components/injected/PipButton.vue";
import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

// Document Picture-in-Picture API 타입 정의
interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
}

interface DocumentPictureInPicture {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/live/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // 개발 중 임시 비활성화
    return;

    // 옵션 확인 (추후 옵션 페이지에서 제어 가능)
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        usePipChat?: boolean;
      } | null;

      if (saved?.usePipChat === false) {
        return;
      }
    } catch {
      // 옵션 로드 실패 시 기본값(사용)으로 진행
    }

    // Document PIP API 지원 확인
    if (!("documentPictureInPicture" in window)) {
      console.warn(
        "[Chzzk Tools] Document Picture-in-Picture API가 지원되지 않습니다. Chrome 116+ 필요."
      );
      return;
    }

    const VIDEO_SELECTOR = "video.webplayer-internal-video";
    const CHAT_CONTAINER_SELECTOR = '[class*="live_chatting_container"]';
    // div 태그 제한 제거하여 더 유연하게 매칭
    const CONTROL_BAR_RIGHT_SELECTOR = ".pzp-pc__bottom-buttons-right";

    const mountedButtons = new WeakSet<Element>();
    let pipWindow: Window | null = null;

    console.log("[Chzzk Tools] PIP+채팅 스크립트 로드됨");

    // PIP 창에 적용할 스타일 (오버레이 레이아웃)
    const PIP_STYLES = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: #000;
        height: 100vh;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .pip-container {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .pip-video-section {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }
      .pip-video-section video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .pip-chat-section {
        position: absolute;
        top: 0;
        right: 0;
        height:50%;
        width: 260px;
        display: flex;
        flex-direction: column;
        z-index: 10;
        transition: opacity 0.2s, transform 0.2s;
      }
      [class*="live_chatting_list_item__"]{
        margin-bottom:1px; 
      }
      [class*="live_chatting_message_container__"]{
        padding:0 !important;
      }
      [class*="live_chatting_message_text__"]{
        color:#fff !important;
        font-size:13px !important;
        border-radius:20px;
        padding:3px 8px;
        background:rgba(0,0,0,0.6);
        backdrop-filter: blur(6px);
      }
      [class*="live_chatting_message_nickname__"]{
        display:none;
      }
      [class*="live_chatting_guide_filter__"], [class*="live_chatting_guide_container__"]{
        display:none;
      }
      .pip-chat-section.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateX(100%);
      }
      .pip-chat-header {
        display:none;
      }
      .pip-chat-header svg {
        width: 16px;
        height: 16px;
      }
      .pip-chat-content {
        flex: 1;
        overflow: hidden;
      }
      .pip-toggle-btn {
        position: absolute;
        top: 10px;
        right: 330px;
        background: rgba(0, 0, 0, 0.7);
        border: none;
        border-radius: 4px;
        color: white;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 12px;
        z-index: 20;
        transition: background 0.2s, opacity 0.2s, right 0.2s;
        opacity: 0;
      }
      .pip-container:hover .pip-toggle-btn {
        opacity: 1;
      }
      .pip-toggle-btn.chat-hidden {
        right: 10px;
      }
      .pip-toggle-btn:hover {
        background: rgba(0, 0, 0, 0.9);
      }
      .pip-resize-handle {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 5px;
        cursor: ew-resize;
        background: transparent;
        z-index: 11;
      }
      .pip-resize-handle:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;

    // 채널 ID 추출
    function getChannelId(): string | null {
      const match = window.location.pathname.match(/\/live\/([^/?#]+)/);
      return match ? match[1] : null;
    }

    // PIP 창 열기
    async function openPipWithChat() {
      const video = document.querySelector(VIDEO_SELECTOR) as HTMLVideoElement;
      if (!video) {
        console.error("[Chzzk Tools] 비디오 요소를 찾을 수 없습니다.");
        return;
      }

      const channelId = getChannelId();
      if (!channelId) {
        console.error("[Chzzk Tools] 채널 ID를 찾을 수 없습니다.");
        return;
      }

      // 이미 PIP 창이 열려있으면 닫기
      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
        pipWindow = null;
        return;
      }

      try {
        // Document PIP 창 요청
        pipWindow = await window.documentPictureInPicture!.requestWindow({
          width: 960,
          height: 540,
          disallowReturnToOpener: false,
        });

        // 원본 페이지의 스타일시트를 PIP 창에 복사 (채팅 스타일 유지)
        const originalStylesheets = document.querySelectorAll(
          'link[rel="stylesheet"], style'
        );
        originalStylesheets.forEach((sheet) => {
          const clone = sheet.cloneNode(true) as HTMLElement;
          pipWindow!.document.head.appendChild(clone);
        });

        // PIP 전용 스타일 추가 (원본 스타일 위에 덮어씀)
        const style = pipWindow.document.createElement("style");
        style.textContent = PIP_STYLES;
        pipWindow.document.head.appendChild(style);

        // 컨테이너 생성
        const container = pipWindow.document.createElement("div");
        container.className = "pip-container";

        // 비디오 섹션
        const videoSection = pipWindow.document.createElement("div");
        videoSection.className = "pip-video-section";

        // 원본 비디오를 직접 PIP 창으로 이동 (DRM/CORS 문제 우회)
        const originalParent = video.parentElement;
        const originalNextSibling = video.nextSibling;
        const originalStyles = {
          width: video.style.width,
          height: video.style.height,
          position: video.style.position,
        };

        // 비디오 스타일 조정
        video.style.width = "100%";
        video.style.height = "100%";

        videoSection.appendChild(video);

        // PIP 창 닫힐 때 원본 위치로 복원하기 위한 정보 저장
        const restoreInfo = {
          originalParent,
          originalNextSibling,
          originalStyles,
        };

        console.log("[Chzzk Tools] 원본 비디오를 PIP 창으로 이동");

        // 채팅 섹션
        const chatSection = pipWindow.document.createElement("div");
        chatSection.className = "pip-chat-section";

        // 채팅 헤더
        const chatHeader = pipWindow.document.createElement("div");
        chatHeader.className = "pip-chat-header";
        chatHeader.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>채팅</span>
        `;

        // 채팅 컨텐츠 - 원본 채팅 리스트를 직접 이동
        const chatContent = pipWindow.document.createElement("div");
        chatContent.className = "pip-chat-content";

        // 원본 채팅 리스트 찾기
        const CHAT_LIST_SELECTOR = '[class*="live_chatting_list_wrapper"]';
        const originalChatList = document.querySelector(CHAT_LIST_SELECTOR);

        let chatRestoreInfo: {
          originalParent: Element | null;
          originalNextSibling: ChildNode | null;
          originalStyles: { width: string; height: string; position: string };
        } | null = null;

        if (originalChatList) {
          chatRestoreInfo = {
            originalParent: originalChatList.parentElement,
            originalNextSibling: originalChatList.nextSibling,
            originalStyles: {
              width: (originalChatList as HTMLElement).style.width,
              height: (originalChatList as HTMLElement).style.height,
              position: (originalChatList as HTMLElement).style.position,
            },
          };

          // 채팅 리스트 스타일 조정
          (originalChatList as HTMLElement).style.width = "100%";
          (originalChatList as HTMLElement).style.height = "100%";
          (originalChatList as HTMLElement).style.position = "relative";

          chatContent.appendChild(originalChatList);
          console.log("[Chzzk Tools] 원본 채팅 리스트를 PIP 창으로 이동");
        } else {
          // 원본 채팅을 못 찾으면 안내 메시지
          chatContent.innerHTML =
            '<div style="color: #888; padding: 20px; text-align: center;">채팅을 불러올 수 없습니다</div>';
          console.warn("[Chzzk Tools] 채팅 리스트를 찾을 수 없습니다");
        }

        chatSection.appendChild(chatHeader);
        chatSection.appendChild(chatContent);

        // 리사이즈 핸들
        const resizeHandle = pipWindow.document.createElement("div");
        resizeHandle.className = "pip-resize-handle";

        // 리사이즈 로직
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener("mousedown", (e) => {
          isResizing = true;
          startX = e.clientX;
          startWidth = chatSection.offsetWidth;
          e.preventDefault();
        });

        pipWindow.document.addEventListener("mousemove", (e) => {
          if (!isResizing) return;
          const diff = startX - e.clientX;
          const newWidth = Math.min(Math.max(startWidth + diff, 200), 500);
          chatSection.style.width = `${newWidth}px`;
        });

        pipWindow.document.addEventListener("mouseup", () => {
          isResizing = false;
        });

        chatSection.appendChild(resizeHandle);

        // 채팅 토글 버튼
        const toggleBtn = pipWindow.document.createElement("button");
        toggleBtn.className = "pip-toggle-btn";
        toggleBtn.textContent = "채팅 숨기기";
        toggleBtn.addEventListener("click", () => {
          const isHidden = chatSection.classList.toggle("hidden");
          toggleBtn.classList.toggle("chat-hidden", isHidden);
          toggleBtn.textContent = isHidden ? "채팅 보기" : "채팅 숨기기";
        });

        container.appendChild(videoSection);
        container.appendChild(chatSection);
        container.appendChild(toggleBtn);
        pipWindow.document.body.appendChild(container);

        // PIP 창 닫힐 때 정리 - 원본 비디오와 채팅을 원래 위치로 복원
        pipWindow.addEventListener("pagehide", () => {
          console.log("[Chzzk Tools] PIP 창 닫힘, 비디오 및 채팅 복원");

          // 원본 비디오를 원래 위치로 복원
          if (restoreInfo.originalParent) {
            // 스타일 복원
            video.style.width = restoreInfo.originalStyles.width;
            video.style.height = restoreInfo.originalStyles.height;
            video.style.position = restoreInfo.originalStyles.position;

            if (restoreInfo.originalNextSibling) {
              restoreInfo.originalParent.insertBefore(
                video,
                restoreInfo.originalNextSibling
              );
            } else {
              restoreInfo.originalParent.appendChild(video);
            }
          }

          // 원본 채팅을 원래 위치로 복원
          if (
            chatRestoreInfo &&
            chatRestoreInfo.originalParent &&
            originalChatList
          ) {
            // 스타일 복원
            (originalChatList as HTMLElement).style.width =
              chatRestoreInfo.originalStyles.width;
            (originalChatList as HTMLElement).style.height =
              chatRestoreInfo.originalStyles.height;
            (originalChatList as HTMLElement).style.position =
              chatRestoreInfo.originalStyles.position;

            if (chatRestoreInfo.originalNextSibling) {
              chatRestoreInfo.originalParent.insertBefore(
                originalChatList,
                chatRestoreInfo.originalNextSibling
              );
            } else {
              chatRestoreInfo.originalParent.appendChild(originalChatList);
            }
          }

          pipWindow = null;
        });
      } catch (error) {
        console.error("[Chzzk Tools] PIP 창 열기 실패:", error);
      }
    }

    // 컨트롤 바에 버튼 추가
    async function mountButton(controlBar: Element) {
      if (mountedButtons.has(controlBar)) return;
      mountedButtons.add(controlBar);

      // PIP 버튼을 두 번째 위치에 삽입
      const targetIndex = 0;
      const children = controlBar.children;
      const referenceNode = children[targetIndex];

      const container = document.createElement("button");
      container.className = "pzp-pc__pip-chat-button pzp-button";
      container.style.width = "36px";
      container.style.height = "36px";

      if (referenceNode && referenceNode.parentNode) {
        referenceNode.parentNode.insertBefore(
          container,
          referenceNode.nextSibling
        );
      } else {
        controlBar.appendChild(container);
      }

      const app = createApp(PipButton, {
        onClick: openPipWithChat,
      });
      app.mount(container);
    }

    // DOM 감시
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            if (node.matches(CONTROL_BAR_RIGHT_SELECTOR)) {
              mountButton(node);
            } else if (node.querySelector(CONTROL_BAR_RIGHT_SELECTOR)) {
              node
                .querySelectorAll(CONTROL_BAR_RIGHT_SELECTOR)
                .forEach(mountButton);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 초기 실행 (재시도 포함)
    const tryMount = () => {
      const bars = document.querySelectorAll(CONTROL_BAR_RIGHT_SELECTOR);
      console.log(`[Chzzk Tools] 컨트롤 바 찾기 시도: ${bars.length}개 발견`);
      bars.forEach(mountButton);
    };

    // 즉시 시도
    tryMount();

    // 1초 후 재시도 (페이지 로드 후 DOM이 늦게 생성되는 경우 대비)
    setTimeout(tryMount, 1000);
    // 3초 후 추가 재시도
    setTimeout(tryMount, 3000);
  },
});
