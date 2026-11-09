import { getOptions } from "@/utils/content-helpers";

const VIDEO_ELEMENT_NAME = "video.webplayer-internal-video";
const QUALITY_ELEMENT_NAME = "li.pzp-ui-setting-quality-item";

// 플레이어 화질 메뉴 항목은 click만으로는 바뀌지 않고 Enter 키 입력을 받아야 전환됨
function pressEnterOnElement(el: HTMLElement) {
  el.focus?.({ preventScroll: true });
  el.click();
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      code: "Enter",
    })
  );
  el.dispatchEvent(
    new KeyboardEvent("keyup", {
      bubbles: true,
      key: "Enter",
      code: "Enter",
    })
  );
}

// 라이브 채널 ID / VOD 번호 (그 외 페이지는 null)
const contentId = () =>
  location.pathname.match(/^\/(?:live|video)\/([^/?#]+)/)?.[1] ?? null;

// 화질 목록이 준비되면(최대 3초) 최고 화질을 한 번 선택
// 목록은 높은 화질부터 나열됨: 숫자로 시작하는 첫 항목이 최고 화질 (1080p가 없는 방송도 대응)
// ("자동" 항목은 "자동 (720p)"처럼 현재 해상도를 포함하므로 숫자로 시작하는지로 구분)
function selectTopQuality(video: HTMLVideoElement) {
  const until = Date.now() + 3000;
  const timer = setInterval(() => {
    const top = [
      ...document.querySelectorAll<HTMLLIElement>(QUALITY_ELEMENT_NAME),
    ].find((li) => /^\s*\d+p/.test(li.textContent ?? ""));
    if (!top && Date.now() < until) return;
    clearInterval(timer);
    if (!top || top.classList.contains("pzp-ui-setting-pane-item--checked"))
      return;
    pressEnterOnElement(top);
    video.play().catch(() => {});
  }, 100);
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    if (!(await getOptions()).useAutoQuality) return;

    // 새로 들어간 라이브/VOD가 처음 로드될 때만 적용
    // (화질을 바꿔 다시 로드되거나, 소형 플레이어로 같은 방송을 이어 보는 동안에는 사용자 선택 유지)
    let applied: string | null = null;
    // media 이벤트는 버블링되지 않지만 캡처 단계에서는 document까지 전달됨
    document.addEventListener(
      "loadedmetadata",
      (e) => {
        const video = e.target;
        const id = contentId();
        if (!id || id === applied) return;
        if (!(video instanceof HTMLVideoElement)) return;
        if (!video.matches(VIDEO_ELEMENT_NAME)) return;
        applied = id;
        selectTopQuality(video);
      },
      true
    );
  },
});
