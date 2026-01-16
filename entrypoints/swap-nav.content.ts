/**
 * swap-nav.content.ts
 * 사이드바 네비게이션 섹션의 0번과 1번 순서를 변경
 */

import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

const NAME = "[pzzk-tools][swap-nav]";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    return false;
    // 옵션 확인
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        useSwapNav?: boolean;
      } | null;

      if (saved?.useSwapNav === false) {
        console.log(NAME, "Disabled by option");
        return;
      }
    } catch {
      // 기본값: 활성화
    }

    let lastChildCount = 0;

    const swapSections = (asideContent: Element) => {
      // 로그인 버튼이 있으면 (비로그인 상태) 실행하지 않음
      const toolbar = document.querySelector('[class*="toolbar_container__"]');
      const loginButton = toolbar?.querySelector(
        '[class*="toolbar_login_button__"]'
      );

      if (loginButton) {
        return false;
      }

      // navigation_bar_section 요소들 찾기
      const sections = asideContent.querySelectorAll(
        '[class*="navigation_bar_section__"]'
      );

      // 자식 수가 같으면 스킵
      if (sections.length === lastChildCount) {
        return true;
      }

      console.log(
        NAME,
        `Child count changed: ${lastChildCount} -> ${sections.length}`
      );
      lastChildCount = sections.length;

      if (sections.length < 2) return false;

      const firstSection = sections[0];
      const secondSection = sections[1];

      // 스왑된 요소들 찾기
      const swappedElements = asideContent.querySelectorAll(
        '[data-nav-swapped="true"]'
      );

      // 아직 스왑되지 않은 경우: 처음 두 요소에 마커 붙이고 위치 변경
      if (swappedElements.length === 0) {
        // 0번, 1번에 마커 붙이기
        firstSection.setAttribute("data-nav-swapped", "true");
        secondSection.setAttribute("data-nav-swapped", "true");
        console.log(NAME, "Initial swap markers set");
        return true;
      }

      // 스왑된 요소들이 1번, 2번 위치에 있는지 확인
      const currentFirst = sections[0];
      const currentSecond = sections[1];

      if (
        currentFirst.hasAttribute("data-nav-swapped") &&
        currentSecond.hasAttribute("data-nav-swapped")
      ) {
        console.log(NAME, "Swapped elements already at position 1, 2");
        return true;
      }

      // 스왑된 요소들을 1번, 2번 위치로 이동
      const swappedArray = Array.from(swappedElements);
      if (swappedArray.length >= 2) {
        // 0번 위치 다음에 스왑된 요소들 삽입
        const zeroElement = sections[0];
        if (!zeroElement.hasAttribute("data-nav-swapped")) {
          // 스왑된 첫 번째 요소를 0번 다음에 삽입
          asideContent.insertBefore(swappedArray[0], zeroElement.nextSibling);
          // 스왑된 두 번째 요소를 첫 번째 다음에 삽입
          asideContent.insertBefore(
            swappedArray[1],
            swappedArray[0].nextSibling
          );
          console.log(NAME, "Swapped elements moved to position 1, 2");
        }
      }

      return true;
    };

    // aside_content 요소 찾기
    const findAndObserve = () => {
      const asideContent = document.querySelector('[class*="aside_content__"]');
      if (!asideContent) return false;

      console.log(NAME, "aside_content found, starting observation");

      // 초기 스왑 시도
      swapSections(asideContent);

      // aside_content의 자식 변경 감지
      const observer = new MutationObserver(() => {
        swapSections(asideContent);
      });

      observer.observe(asideContent, {
        childList: true,
      });

      return true;
    };

    // 초기 시도
    if (findAndObserve()) return;

    // aside_content를 찾을 때까지 대기
    const bodyObserver = new MutationObserver(() => {
      if (findAndObserve()) {
        bodyObserver.disconnect();
      }
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 10초 후 자동 중지
    setTimeout(() => {
      bodyObserver.disconnect();
      console.log(NAME, "Body observer disconnected after timeout");
    }, 10000);

    console.log(NAME, "Initialized, waiting for aside_content...");
  },
});
