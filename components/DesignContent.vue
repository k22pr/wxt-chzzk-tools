<script lang="ts" setup>
// 모양 탭 컴포넌트

const props = defineProps<{
  options: {
    useVideoUI: boolean;
    useHideBanner: boolean;
    useHideRecommend: boolean;
  };
}>();

const emit = defineEmits<{
  (e: "update:options", value: any): void;
}>();

// 요소 하이라이트 기능 - absolute div 오버레이 사용
const HIGHLIGHT_ID = "chzzk-tools-highlight-overlay";

const highlightElement = async (selector: string, show: boolean) => {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabId = tabs[0]?.id;
    if (!tabId) return;

    await browser.scripting.executeScript({
      target: { tabId },
      func: (sel: string, shouldShow: boolean, overlayId: string) => {
        // 기존 하이라이트 제거
        const existing = document.getElementById(overlayId);
        if (existing) existing.remove();

        if (!shouldShow) return;

        // 대상 요소 찾기
        const target = document.querySelector(sel) as HTMLElement;
        if (!target) return;

        // 요소의 위치와 크기 가져오기
        const rect = target.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft =
          window.scrollX || document.documentElement.scrollLeft;

        // 하이라이트 오버레이 생성
        const overlay = document.createElement("div");
        overlay.id = overlayId;
        overlay.style.cssText = `
          position: absolute;
          top: ${rect.top + scrollTop}px;
          left: ${rect.left + scrollLeft}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          border: 3px solid #ff4444;
          background: rgba(255, 68, 68, 0.1);
          pointer-events: none;
          z-index: 999999;
          box-sizing: border-box;
          border-radius: 8px;
          transition: all 0.2s ease;
        `;
        document.body.appendChild(overlay);
      },
      args: [selector, show, HIGHLIGHT_ID],
    });
  } catch (e) {
    console.error("Highlight error:", e);
  }
};

const onBannerHover = (show: boolean) => {
  highlightElement(
    '[class*="home_list_container__"][class*="top_banner_container__"]',
    show
  );
};

const onRecommendHover = (show: boolean) => {
  highlightElement(
    '[class*="home_list_container__"][class*="home_recommend_live_container__"]',
    show
  );
};

// 하이라이트 제거 함수
const removeHighlight = async () => {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabId = tabs[0]?.id;
    if (!tabId) return;

    await browser.scripting.executeScript({
      target: { tabId },
      func: (overlayId: string) => {
        const existing = document.getElementById(overlayId);
        if (existing) existing.remove();
      },
      args: [HIGHLIGHT_ID],
    });
  } catch {}
};

// 스위치 변경 핸들러
const onBannerChange = (value: boolean) => {
  emit("update:options", { ...props.options, useHideBanner: value });
  if (value) removeHighlight();
};

const onRecommendChange = (value: boolean) => {
  emit("update:options", { ...props.options, useHideRecommend: value });
  if (value) removeHighlight();
};
</script>

<template>
  <div w="full" grid gap="4" mt="4">
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">동영상 재생바 스타일 변경</div>
          <div text="3 gray-5">동영상 재생바에 디자인을 적용합니다.</div>
        </div>
        <div>
          <a-switch
            :checked="options.useVideoUI"
            @update:checked="
              emit('update:options', { ...options, useVideoUI: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div
        w="full"
        flex
        items="top"
        justify="between"
        @mouseenter="onBannerHover(true)"
        @mouseleave="onBannerHover(false)"
      >
        <div w="full">
          <div text="4">상단 배너 숨김</div>
          <div text="3 gray-5">메인 페이지 상단 배너를 숨깁니다.</div>
        </div>
        <div>
          <a-switch
            :checked="options.useHideBanner"
            @update:checked="onBannerChange"
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div
        w="full"
        flex
        items="top"
        justify="between"
        @mouseenter="onRecommendHover(true)"
        @mouseleave="onRecommendHover(false)"
      >
        <div w="full">
          <div text="4">추천 라이브 숨김</div>
          <div text="3 gray-5">메인 페이지 추천 라이브 섹션을 숨깁니다.</div>
        </div>
        <div>
          <a-switch
            :checked="options.useHideRecommend"
            @update:checked="onRecommendChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
