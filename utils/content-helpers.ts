/**
 * content script에서 공통으로 사용하는 유틸리티 함수들
 */

import { storage } from "wxt/utils/storage";
import { STORAGE_KEY, DEFAULT_OPTIONS, type Options } from "@/constants";

const OPTIONS_KEY = `local:${STORAGE_KEY}` as const;

/** 저장된 옵션을 기본값과 병합해 반환합니다. */
export async function getOptions(): Promise<Options> {
  const saved = await storage.getItem<Partial<Options>>(OPTIONS_KEY);
  return { ...DEFAULT_OPTIONS, ...saved };
}

/** 옵션 변경을 감시합니다. (기본값 병합) @returns unwatch 함수 */
export function watchOptions(callback: (options: Options) => void) {
  return storage.watch<Partial<Options>>(OPTIONS_KEY, (saved) =>
    callback({ ...DEFAULT_OPTIONS, ...saved }),
  );
}

export interface UrlWatcherOptions {
  /** URL 변경 시 호출되는 콜백. 새 path와 이전 path를 인자로 받음 */
  onPathChange: (newPath: string, oldPath: string) => void | Promise<void>;
  /** 체크 간격 (ms), 기본값 500 */
  interval?: number;
}

/**
 * URL 변경을 감지하는 워처를 시작합니다.
 * SPA 환경에서 history API를 직접 패치하는 대신 폴링 방식을 사용합니다.
 * Content Script의 Isolated World에서도 안정적으로 동작합니다.
 *
 * @returns cleanup 함수
 */
export function startUrlWatcher(options: UrlWatcherOptions): () => void {
  const { onPathChange, interval = 500 } = options;
  let lastPath = location.pathname;

  const check = () => {
    const currentPath = location.pathname;
    if (currentPath !== lastPath) {
      const oldPath = lastPath;
      lastPath = currentPath;
      onPathChange(currentPath, oldPath);
    }
  };

  const intervalId = setInterval(check, interval);

  // 즉시 첫 체크 실행
  check();

  return () => {
    clearInterval(intervalId);
  };
}

export interface ElementObserverOptions {
  /** 관찰할 CSS 선택자 */
  selector: string;
  /** 요소가 DOM에 추가되었을 때 호출되는 콜백 */
  onElementAdded?: (element: Element) => void;
  /** 요소가 DOM에서 제거되었을 때 호출되는 콜백 */
  onElementRemoved?: (element: Element) => void;
  /** 관찰할 루트 요소, 기본값 document.documentElement */
  root?: Element | Document;
}

/**
 * 특정 요소의 추가/제거를 감지하는 MutationObserver를 생성합니다.
 *
 * @returns cleanup 함수
 */
export function observeElement(options: ElementObserverOptions): () => void {
  const {
    selector,
    onElementAdded,
    onElementRemoved,
    root = document.documentElement,
  } = options;

  // 이미 존재하는 요소들 처리
  if (onElementAdded) {
    (root as Element).querySelectorAll?.(selector)?.forEach(onElementAdded);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // 추가된 노드 처리
      if (onElementAdded) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as Element;
          if (el.matches?.(selector)) {
            onElementAdded(el);
          }
          el.querySelectorAll?.(selector)?.forEach(onElementAdded);
        }
      }

      // 제거된 노드 처리
      if (onElementRemoved) {
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as Element;
          if (el.matches?.(selector)) {
            onElementRemoved(el);
          }
          el.querySelectorAll?.(selector)?.forEach(onElementRemoved);
        }
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
  };
}
