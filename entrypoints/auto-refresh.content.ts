import type { Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

// 새로고침 주기: 30초 고정
const REFRESH_INTERVAL = 30_000;

// 사이드바 '팔로잉 채널' 섹션(nav aria-label="팔로우")의 새로고침 버튼만 대상으로 함
// (그냥 첫 '새로고침' 버튼을 찾으면 비로그인/팔로잉 없음 상태에서 '인기 카테고리'를 누르게 됨)
const REFRESH_BTN_SELECTOR =
  'nav[aria-label="팔로우"] button[aria-label="새로고침"]';

let intervalId: number | undefined;

function apply({ useAutoRefresh }: Options) {
  clearInterval(intervalId);
  intervalId = useAutoRefresh
    ? window.setInterval(
        () =>
          document
            .querySelector<HTMLButtonElement>(REFRESH_BTN_SELECTOR)
            ?.click(),
        REFRESH_INTERVAL,
      )
    : undefined;
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    apply(await getOptions());
    watchOptions(apply);
  },
});
