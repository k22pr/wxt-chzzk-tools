/**
 * chat-align.content.ts
 * 라이브·VOD 채팅창의 배지 칸(아이콘 1개 크기)과 닉네임 칸(50px)을 고정해 메시지 시작 위치를 정렬
 * - 배지 없음: 배지 하나만큼 빈 자리 / 1개: 그대로 / 2개 이상: 배지 하나 크기 안에 2x2로 작게
 * - 채팅 행은 채팅창에만 있으므로 /live, /video 외 페이지에는 영향 없음
 */

import type { Options } from "@/constants";
import { getOptions, watchOptions } from "@/utils/content-helpers";

// 채팅 행 = 닉네임 버튼(배지 묶음 + 닉네임) + 메시지. 치지직 클래스명은 해시가 붙으므로 이름 부분으로 찾음
const NAME_BOX = '[class*="_chatting_message_"] > [class*="_nickname_"] > [class*="_container_"]';

const CSS = `
  /* 배지 아이콘 크기·간격. 채팅 팝업에서 채팅 크기를 키우면 치지직이 _scale_ 클래스를 붙이고 아이콘을 키움 */
  ${NAME_BOX} { --chat-align-icon: 18px; --chat-align-gap: 4px; }
  ${NAME_BOX}[class*="_scale_125_"] { --chat-align-icon: 24px; --chat-align-gap: 5px; }
  ${NAME_BOX}[class*="_scale_150_"] { --chat-align-icon: 28px; --chat-align-gap: 6px; }
  ${NAME_BOX}[class*="_scale_175_"] { --chat-align-icon: 32px; --chat-align-gap: 7px; }

  ${NAME_BOX} > [class*="_wrapper_"] {
    flex: none;
    width: var(--chat-align-icon);
    height: var(--chat-align-icon);
    margin-right: var(--chat-align-gap);
    overflow: hidden;
  }

  /* 배지가 없으면 배지 하나만큼 빈 자리 */
  ${NAME_BOX}:not(:has(> [class*="_wrapper_"]))::before {
    content: "";
    flex: none;
    width: var(--chat-align-icon);
    height: var(--chat-align-icon);
    margin-right: var(--chat-align-gap);
  }

  /* 배지가 2개 이상이면 배지 하나 크기 안에 2x2로 작게 (5개 이상이면 앞의 4개만 보임) */
  ${NAME_BOX} > [class*="_wrapper_"]:has(> :nth-child(2)) {
    --chat-align-cell: calc((var(--chat-align-icon) - 2px) / 2);
    display: grid;
    grid-template-columns: repeat(2, var(--chat-align-cell));
    grid-auto-rows: var(--chat-align-cell);
    gap: 2px;
  }
  /* 아이콘 칸에는 인라인 style로 크기가 지정돼 있어 !important 필요 */
  ${NAME_BOX} > [class*="_wrapper_"]:has(> :nth-child(2)) > * {
    width: var(--chat-align-cell) !important;
    height: var(--chat-align-cell) !important;
    margin: 0;
  }
  ${NAME_BOX} > [class*="_wrapper_"]:has(> :nth-child(2)) > * * {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* 닉네임 50px 고정. 넘치면 치지직 자체 말줄임(...) 스타일이 적용됨 */
  ${NAME_BOX} > [class*="_nickname_"] {
    flex: none;
    width: 50px;
    min-width: 50px;
    max-width: 50px;
    /* 치지직은 배지가 있을 때만 닉네임에 1px 여백을 줘서, 배지 유무와 관계없이 같게 맞춤 */
    margin-left: 0;
    /* 버튼 기본값(가운데 정렬)이 상속돼 짧은 닉네임이 가운데로 가므로 왼쪽 정렬 */
    text-align: left;
  }
`;

const STYLE_ID = "chzzk-tools-chat-align";

function apply({ useChatAlign }: Options) {
  const existing = document.getElementById(STYLE_ID);
  if (!useChatAlign) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  // document_start 시점엔 head가 없을 수 있으나 <html> 직속 style도 그대로 적용됨
  (document.head || document.documentElement).appendChild(style);
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  async main() {
    apply(await getOptions());
    watchOptions(apply);
  },
});
