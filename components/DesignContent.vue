<script lang="ts" setup>
// 모양 탭 컴포넌트
import { SELECTOR, type Options } from "@/constants";

defineProps<{ options: Options }>();

const emit = defineEmits<{
  (e: "update:options", value: any): void;
}>();

// 요소 하이라이트 기능 - 대상 영역에 outline 스타일을 주입
const HIGHLIGHT_ID = "pzzk-tools-highlight-overlay";

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
      func: (sel: string, shouldShow: boolean, styleId: string) => {
        // 기존 하이라이트 제거
        document.getElementById(styleId)?.remove();
        if (!shouldShow) return;

        // 위치를 계산하지 않고 대상에 outline을 그림: 스크롤·레이아웃 변화는 브라우저가 따라가고,
        // 이미 숨겨진(display:none) 영역이나 숨김을 켠 직후에는 그려지지 않음
        // (안쪽으로 그리면 추천 라이브의 영상 카드가 덮으므로 바깥쪽에 그림)
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `${sel} { outline: 3px solid #ff4444 !important; outline-offset: 2px !important; }`;
        document.head.appendChild(style);
        // hover 중 팝업이 Esc 등으로 닫히면 mouseleave가 오지 않으므로,
        // 포인터가 페이지 위에서 움직이는 순간(=팝업 밖) 스스로 제거
        document.addEventListener("pointermove", () => style.remove(), {
          once: true,
          capture: true,
        });
      },
      args: [selector, show, HIGHLIGHT_ID],
    });
  } catch (e) {
    console.error("Highlight error:", e);
  }
};

const onBannerHover = (show: boolean) => {
  highlightElement(SELECTOR.topBanner, show);
};

const onRecommendHover = (show: boolean) => {
  highlightElement(SELECTOR.recommendLive, show);
};
</script>

<template>
  <div w="full" grid gap="4">
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
    <!-- <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">네비게이션 순서 변경</div>
          <div text="3 gray-5">사이드바의 팔로잉을 최상단으로 올립니다.</div>
        </div>
        <div>
          <a-switch
            :checked="options.useSwapNav"
            @update:checked="
              emit('update:options', { ...options, useSwapNav: $event })
            "
          />
        </div>
      </div>
    </div> -->
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
            @update:checked="
              emit('update:options', { ...options, useHideBanner: $event })
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
            @update:checked="
              emit('update:options', { ...options, useHideRecommend: $event })
            "
          />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">썸네일 확대</div>
          <div text="3 gray-5">
            비디오 카드 썸네일에 마우스를 올리면 확대됩니다.
          </div>
        </div>
        <div>
          <a-switch
            :checked="options.useThumbnailZoom"
            @update:checked="
              emit('update:options', { ...options, useThumbnailZoom: $event })
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>
