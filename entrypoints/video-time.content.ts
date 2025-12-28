/**
 * video-time.content.ts
 * VOD 비디오 페이지에서 seeking preview에 실제 시간(liveOpenDate 기준)을 표시
 */

import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";
import {
  startUrlWatcher,
  isVideoPage,
  getIdFromPath,
} from "@/utils/content-helpers";

const NAME = "[chzzk-tools][video-time]";
const SEEKING_PREVIEW_TIME_SELECTOR = "[class*='pzp-seeking-preview__time']";
const VOD_TIME_SELECTOR = "[class*='pzp-pc__vod-time']";
const REAL_TIME_CLASS = "chzzk-tools-real-time";
const REAL_PLAYBACK_TIME_CLASS = "chzzk-tools-real-playback-time";

// liveOpenDate 캐시 (videoId -> Date)
let cachedLiveOpenDate: Date | null = null;

// 현재 비디오 ID 추출
function getVideoIdFromLocation(): string | null {
  const match = window.location.pathname.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// API에서 liveOpenDate 가져오기
async function fetchLiveOpenDate(videoId: string): Promise<Date | null> {
  // 캐시 확인
  if (cachedLiveOpenDate) {
    return cachedLiveOpenDate;
  }

  try {
    console.log(NAME, "Fetching liveOpenDate for video:", videoId);
    const response = await fetch(
      `https://api.chzzk.naver.com/service/v3/videos/${videoId}`
    );
    if (!response.ok) {
      console.error(NAME, "API response not ok:", response.status);
      return null;
    }

    const data = await response.json();
    const liveOpenDateStr = data?.content?.liveOpenDate;

    if (!liveOpenDateStr) {
      console.log(NAME, "liveOpenDate not found in response");
      return null;
    }

    const date = new Date(liveOpenDateStr);
    if (isNaN(date.getTime())) {
      console.error(NAME, "Invalid date format:", liveOpenDateStr);
      return null;
    }

    // 캐시에 저장
    cachedLiveOpenDate = date;
    console.log(NAME, "liveOpenDate cached:", date.toISOString());
    return date;
  } catch (error) {
    console.error(NAME, "Failed to fetch liveOpenDate:", error);
    return null;
  }
}

// 시간 문자열 파싱 (예: "1:23:45" -> 초 단위)
function parseTimeString(timeStr: string): number {
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

// 실제 시간 포맷팅 (MM-DD HH:MM:SS)
function formatRealTime(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 실제 시간 요소 생성/업데이트
function updateRealTimeElement(
  previewTimeEl: Element,
  liveOpenDate: Date,
  seekTimeStr: string
) {
  const seekSeconds = parseTimeString(seekTimeStr);
  const realTime = new Date(liveOpenDate.getTime() + seekSeconds * 1000);
  const realTimeStr = formatRealTime(realTime);

  // 부모 요소 찾기
  const parentEl = previewTimeEl.parentElement;
  if (!parentEl) return;

  // 기존 실제 시간 요소 찾기 (부모에서 검색)
  let realTimeEl = parentEl.querySelector(`.${REAL_TIME_CLASS}`);

  if (!realTimeEl) {
    // 새로 생성
    realTimeEl = document.createElement("div");
    realTimeEl.className = REAL_TIME_CLASS;
    (realTimeEl as HTMLElement).style.cssText = `
      position:absolute;
      right:4px;
      top:4px;
      font-size: 11px;
      color: rgba(255, 255, 255, 1);
      text-align: center;
      text-shadow:0px 0px 1px rgba(0,0,0,1);
      background:rgba(0,0,0,0.7);
      padding:1px 4px;
      backdrop-filter: blur(6px);
      border-radius:5px;
    `;
    // previewTimeEl 뒤에 형제로 추가
    previewTimeEl.insertAdjacentElement("afterend", realTimeEl);
  }

  realTimeEl.textContent = realTimeStr;
}

// 재생 시간(컨트롤바) 실제 시간 툴팁 업데이트
function updateRealPlaybackTimeElement(
  vodTimeEl: Element,
  liveOpenDate: Date,
  playbackTimeStr: string
) {
  const playbackSeconds = parseTimeString(playbackTimeStr);
  const realTime = new Date(liveOpenDate.getTime() + playbackSeconds * 1000);
  const realTimeStr = formatRealTime(realTime);

  const htmlEl = vodTimeEl as HTMLElement;

  // 기본 title 속성으로 간단한 툴팁 제공
  htmlEl.title = `실제 시간: ${realTimeStr}`;

  // VOD 시간 컨테이너 찾기 (pzp-vod-time, pzp-pc-vod-time, pzp-pc__vod-time)
  const containerEl = document.querySelector(
    "[class*='pzp-vod-time'], [class*='pzp-pc-vod-time'], [class*='pzp-pc__vod-time']"
  );
  if (!containerEl) return;

  // 커스텀 툴팁 요소 찾기/생성
  let tooltipEl = containerEl.querySelector(
    `.${REAL_PLAYBACK_TIME_CLASS}`
  ) as HTMLElement | null;

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = REAL_PLAYBACK_TIME_CLASS;
    tooltipEl.style.cssText = `
      position: absolute;
      top:-60px;
      left: 50%;
      transform: translateX(-50%);
      background:rgba(0,0,0,.6);
      color: #fff;
      padding: 6px 12px;
      border-radius: 14px;
      font-size: 13px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 1000;
      backdrop-filter: blur(6px);
    `;

    // 컨테이너를 relative로 설정
    (containerEl as HTMLElement).style.position = "relative";
    containerEl.appendChild(tooltipEl);

    // 마우스 이벤트 리스너 추가
    htmlEl.addEventListener("mouseenter", () => {
      if (tooltipEl) tooltipEl.style.opacity = "1";
    });
    htmlEl.addEventListener("mouseleave", () => {
      if (tooltipEl) tooltipEl.style.opacity = "0";
    });
  }

  // 툴팁 내용 업데이트
  const displayText = `실제 시간: ${realTimeStr}`;
  if (tooltipEl.textContent !== displayText) {
    tooltipEl.textContent = displayText;
  }
}

// seeking preview 감시 및 업데이트
async function setupSeekingPreviewObserver() {
  const videoId = getVideoIdFromLocation();
  if (!videoId) {
    console.log(NAME, "Not a video page, skipping");
    return;
  }

  console.log(NAME, "Setting up for video:", videoId);

  const liveOpenDate = await fetchLiveOpenDate(videoId);
  if (!liveOpenDate) {
    console.log(NAME, "liveOpenDate not available, feature disabled");
    return;
  }

  console.log(
    NAME,
    "Observer setup complete, liveOpenDate:",
    liveOpenDate.toISOString()
  );

  // 디바운스 및 재진입 방지
  let rafId: number | null = null;
  let isProcessing = false;
  let lastSeekTime = "";
  let lastPlaybackTime = "";

  const debouncedProcess = () => {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;

      if (isProcessing) return;
      isProcessing = true;

      try {
        // 1. Seeking Preview 처리
        const previewTimeEl = document.querySelector(
          SEEKING_PREVIEW_TIME_SELECTOR
        );
        if (previewTimeEl) {
          const firstChild = previewTimeEl.firstChild;
          if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
            const seekTimeStr = firstChild.textContent?.trim() || "";
            const hasElement = !!previewTimeEl.parentElement?.querySelector(
              `.${REAL_TIME_CLASS}`
            );

            if (
              (seekTimeStr !== lastSeekTime || !hasElement) &&
              /^\d+:\d+/.test(seekTimeStr)
            ) {
              lastSeekTime = seekTimeStr;
              updateRealTimeElement(previewTimeEl, liveOpenDate, seekTimeStr);
            }
          }
        }

        // 2. Playback Time (컨트롤바) 처리
        const vodTimeEls = document.querySelectorAll(VOD_TIME_SELECTOR);
        vodTimeEls.forEach((vodTimeEl) => {
          // 전체 텍스트에서 현재 재생 시간 부분만 추출 (예: "0:23 / 1:45:00" -> "0:23")
          // 자식 요소들의 텍스트가 섞일 수 있으므로 주의
          const currentText = vodTimeEl.textContent || "";
          const match = currentText.trim().match(/^(\d+(?::\d+)*)/);

          if (match) {
            const playbackTimeStr = match[1];
            const hasElement = !!vodTimeEl.querySelector(
              `.${REAL_PLAYBACK_TIME_CLASS}`
            );

            if (playbackTimeStr !== lastPlaybackTime || !hasElement) {
              lastPlaybackTime = playbackTimeStr;
              updateRealPlaybackTimeElement(
                vodTimeEl,
                liveOpenDate,
                playbackTimeStr
              );
            }
          }
        });
      } finally {
        isProcessing = false;
      }
    });
  };

  // MutationObserver로 관련 요소 감시
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target as Node;

      // 우리가 추가한 요소의 변경은 무시
      if (target.nodeType === Node.ELEMENT_NODE) {
        const el = target as Element;
        if (
          el.classList?.contains(REAL_TIME_CLASS) ||
          el.classList?.contains(REAL_PLAYBACK_TIME_CLASS)
        )
          continue;
      }

      // 관련 요소가 존재하거나 변경되었으면 처리
      if (
        document.querySelector(SEEKING_PREVIEW_TIME_SELECTOR) ||
        document.querySelector(VOD_TIME_SELECTOR)
      ) {
        debouncedProcess();
        break;
      }
    }
  });

  // document 전체를 감시 (요소들이 동적으로 생성/변경되므로)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // 정리 함수 반환
  return () => observer.disconnect();
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    // 옵션 확인
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        useVideoTime?: boolean;
      } | null;

      if (saved?.useVideoTime === false) {
        return;
      }
    } catch {
      // 옵션 로드 실패 시 기본값(사용)으로 진행
    }

    // 현재 관찰자 정리 함수
    let currentCleanup: (() => void) | null = null;
    let lastVideoId: string | null = null;

    // URL 변경 시 실행되는 콜백
    const handlePathChange = async () => {
      const videoId = getVideoIdFromLocation();

      // 1. 비디오 페이지가 아닌 경우 (이탈)
      if (!videoId) {
        if (lastVideoId) {
          console.log(NAME, "비디오 페이지 이탈");
          if (currentCleanup) {
            currentCleanup();
            currentCleanup = null;
          }
          lastVideoId = null;
          cachedLiveOpenDate = null;
        }
        return;
      }

      // 2. 새로운 비디오 페이지인 경우
      if (videoId !== lastVideoId) {
        console.log(NAME, "새 비디오 페이지 감지:", videoId);

        // 이전 리소스 정리
        if (currentCleanup) {
          currentCleanup();
          currentCleanup = null;
        }
        cachedLiveOpenDate = null;
        lastVideoId = videoId;

        // 새 관찰자 설정
        try {
          const cleanup = await setupSeekingPreviewObserver();
          // 설정 중 URL이 변경되었는지 확인
          if (getVideoIdFromLocation() !== videoId) {
            if (cleanup) cleanup();
            return;
          }
          currentCleanup = cleanup || null;
        } catch (e) {
          console.error(NAME, "Observer 설정 실패:", e);
        }
      }
    };

    // URL 워처 시작 (공통 유틸리티 사용)
    startUrlWatcher({
      onPathChange: handlePathChange,
      interval: 500,
    });

    // 초기 실행
    handlePathChange();
  },
});
