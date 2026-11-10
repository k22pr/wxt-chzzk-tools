import {
  getOptions,
  startUrlWatcher,
  observeElement,
} from "@/utils/content-helpers";

const VIDEO_LAYOUT_NAME = "div#live_player_layout";
const VIDEO_ELEMENT_NAME = "video.webplayer-internal-video";
const BOTTOM_SEL = "div.pzp-pc__bottom";
const EDGE_EPS = 0.5;
// 치지직 기본 재생 위치는 라이브 끝보다 3~4.5초 뒤라, 그보다 넉넉해야 LIVE 표시가 깜빡이지 않음
const LIVE_EPS = 6;
const MAX_VIDEO_DURATION = 60 * 1.5;
// 서버 재생목록이 담는 길이(실측 30~33초). 이보다 이전 구간은 브라우저에 남은 버퍼로만 재생 가능
// ponytail: 플레이어 내부 값을 못 읽어 실측 하한으로 고정. 서버 창이 바뀌면 같이 조정
const PLAYLIST_WINDOW = 30;

const CSS = `
      .live-bar-box{display:flex !important;position:absolute;left:0px;bottom:30px !important;width:100%;font-size:11px;line-height:1;}
      .live-bar-box[hidden]{display:none !important;}
      .live-bar-box .live-bar-ui{width:100%;display:flex;gap:8px;align-items:center;color:#fff;padding:6px 8px;}
      .live-bar-box .go{width:45px;border:0;border-radius:6px;padding:2px 8px;background:#868e96;color:#fff;cursor:pointer;font-size:11px;line-height:1;margin-left:4px;}
      .live-bar-box .go.live{background:rgb(221, 51, 51);box-shadow:0px 0px 4px rgba(221, 51, 51, 0.5);}
      .live-bar-box .t{white-space:nowrap;min-width:20px;text-align:center}
      .live-bar-box .time{display:flex;gap:4px;align-items:center}
      .live-bar-box .slide-box{display:flex;flex:1;position:relative;align-items:center;width:100%; height:4px;padding:8px 0px;cursor:pointer;background:transparent;}
      .live-bar-box .slide-box:hover{height:6px;}
      .live-bar-box .slide-box :is(.track,.rng){transition:width 0.1s, height 0.2s;}
      .live-bar-box .slide-box .track{position:absolute;left:0px;width:100%;height:2px;border-radius:3px;background:rgba(255,255,255,0.5);}
      .live-bar-box .slide-box .rng{position:absolute;left:0px;height:2px;border-radius:3px;background:#00f889;}
      .live-bar-box .slide-box:hover .track{height:6px;border-radius:3px;box-shadow:0px 0px 4px rgba(0,0,0,0.3);}
      .live-bar-box .slide-box:hover .rng{height:6px;border-radius:3px;box-shadow:0px 0px 5px #00f889;}
      .live-bar-box.no-anim .slide-box .rng { transition: none !important; }

      .live-bar-box .hover-tip{
        position:absolute; top:0; transform:translate(-50%,-140%);
        background:rgba(0,0,0,.7); color:#fff; padding:2px 6px; border-radius:4px;
        font-size:11px/1; pointer-events:none;
        opacity:0; transition:opacity .12s;
      }
      .live-bar-box .hover-tip.show{ opacity:1; }
      .live-bar-box .hover-x{
        position:absolute; top:0; bottom:0; width:1px; background:rgba(255,255,255,1);
        transform:translateX(-.5px); opacity:0; transition:opacity .12s;
      }
      .live-bar-box .hover-x.show{ opacity:1; }
`;

const styleOnce = (() => {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
  };
})();

function timeFormat(t: number): string {
  const h = (t / 3600) | 0;
  const m = ((t % 3600) / 60) | 0;
  const s = t % 60 | 0;

  return h
    ? `${t > 0 ? "" : "-"}${Math.abs(h)}:${String(Math.abs(m)).padStart(
        2,
        "0"
      )}:${String(Math.abs(s)).padStart(2, "0")}`
    : `${t > 0 ? "" : "-"}${Math.abs(m)}:${String(Math.abs(s)).padStart(
        2,
        "0"
      )}`;
}

function getEdges(v: HTMLVideoElement) {
  const s = v.seekable;
  if (s && s.length) {
    const start = s.start(0);
    const end = s.end(s.length - 1);
    return {
      start: Math.max(start, end - MAX_VIDEO_DURATION),
      end: s.end(s.length - 1),
      ok: true,
    };
  }
  const b = v.buffered;
  if (b && b.length) {
    const start = b.start(0);
    const end = b.end(b.length - 1);
    return {
      start: Math.max(start, end - MAX_VIDEO_DURATION),
      end: b.end(b.length - 1),
      ok: true,
    };
  }
  return { start: 0, end: isFinite(v.duration) ? v.duration : 0, ok: false };
}

// 재생목록 창보다 이전인데 버퍼에도 없는 구멍(seekable은 구멍까지 한 범위로 보고함)은 받아 올 수 없어
// 플레이어가 곧바로 라이브로 되돌리므로, t 이후 2초 이상 이어서 재생할 수 있는 첫 버퍼 위치로 옮김
// (버퍼 끝 2초 안이나 짧은 조각도 곧 구멍에 닿아 멈추므로 건너뜀)
function playableTarget(v: HTMLVideoElement, t: number, end: number) {
  if (t >= end - PLAYLIST_WINDOW) return t;
  const b = v.buffered;
  for (let i = 0; i < b.length; i++) {
    const s = Math.max(t, b.start(i));
    if (b.end(i) - s >= 2) return s;
  }
  return t;
}

function findBottomContainer(v: HTMLVideoElement): Element | null {
  let c = document.querySelector(BOTTOM_SEL);
  if (c) return c;
  let node: any = v;
  while (node) {
    const root = node.getRootNode?.();
    const host = root && (root as any).host;
    if (!host) break;
    const inHost = (root as any).querySelector?.(BOTTOM_SEL);
    if (inHost) return inHost;
    node = host;
  }
  return null;
}

function mount(v: HTMLVideoElement & { __liveBarMounted?: boolean }) {
  if ((v as any).__liveBarMounted) return;
  const bottom = findBottomContainer(v);
  if (!bottom) return;

  styleOnce();

  if (bottom.querySelector(".live-bar-box")) return;

  const wrap = document.createElement("div");
  wrap.className = "live-bar-box pzp-pc__progress-slider";
  wrap.innerHTML = `
      <div class="live-bar-ui">
      <div class='slide-box'>
        <div class='track'></div>
        <div class="rng"></div>
      </div>
        <div class='time'>
          <span class="t total">0:00</span>
          <button class="go">LIVE</button>
        </div>
      </div>
    `;
  bottom.appendChild(wrap);

  const rng = wrap.querySelector<HTMLDivElement>(".rng")!;
  const tTotal = wrap.querySelector<HTMLSpanElement>(".total")!;
  const btn = wrap.querySelector<HTMLButtonElement>(".go")!;
  const slide = wrap.querySelector<HTMLDivElement>(".slide-box")!;

  const tip = document.createElement("div");
  tip.className = "hover-tip";
  tip.textContent = "0:00";
  const cross = document.createElement("div");
  cross.className = "hover-x";
  slide.appendChild(cross);
  slide.appendChild(tip);
  let raf = 0;
  let lastEvt: PointerEvent | null = null;

  // 비디오/바가 사라지면 비디오·레이아웃에 단 리스너를 함께 정리
  const alive = new AbortController();

  const onMove = (e: PointerEvent) => {
    lastEvt = e;
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (lastEvt) renderAt(lastEvt.clientX);
      });
  };

  function seekFromClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    wrap.classList.add("no-anim");
    const rect = slide.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const ratio = rect.width ? x / rect.width : 0;

    const { start, end } = getEdges(v);
    const target = start + ratio * (end - start);
    seekTo(target);

    requestAnimationFrame(() => wrap.classList.remove("no-anim"));
  }

  const atLiveEdge = (currentTime: number) => {
    const { end } = getEdges(v);
    return currentTime - end > -LIVE_EPS;
  };

  function renderAt(clientX: number) {
    const rect = slide.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = rect.width ? x / rect.width : 0;

    const { start, end, ok } = getEdges(v);
    const lo = ok ? start : 0;
    const hi =
      ok && isFinite(end) ? end : isFinite(v.duration) ? v.duration : lo;
    if (!isFinite(hi) || hi <= lo) return;

    const t = lo + ratio * (hi - lo);
    const nearLive = atLiveEdge(t);

    tip.textContent = nearLive ? "LIVE" : timeFormat(t - hi);
    (cross as HTMLDivElement).style.left = `${x}px`;
    (tip as HTMLDivElement).style.left = `${x}px`;
  }

  function updateUI() {
    // 치지직 자체 재생바(타임머신 등)가 표시되는 방송에서는 겹치지 않도록 숨김
    const native = wrap.parentElement?.querySelector(
      ".pzp-pc__progress-slider:not(.live-bar-box)"
    );
    const hide = !!native && getComputedStyle(native).display !== "none";
    if (wrap.hidden !== hide) wrap.hidden = hide;

    const { start, end } = getEdges(v);

    const percent = (v.currentTime - start) / (end - start);
    if (end - v.currentTime < LIVE_EPS) {
      rng.style.width = "100%";
    } else {
      rng.style.width = `${Math.min(100, percent * 100)}%`;
    }

    // 같은 값을 다시 쓰면 텍스트 노드가 교체돼 레이아웃·MutationObserver가 깨므로 바뀔 때만 씀
    const total = timeFormat(Math.min(Math.max(0, end - start), MAX_VIDEO_DURATION));
    if (tTotal.textContent !== total) tTotal.textContent = total;

    const live = atLiveEdge(v.currentTime);
    // 라이브가 아니면 라이브 끝점 기준 지연 시간 (hover 툴팁과 같은 기준)
    const label = live ? "LIVE" : timeFormat(v.currentTime - end);
    if (btn.textContent !== label) btn.textContent = label;
    btn.classList.toggle("live", live);
    if (lastEvt) renderAt(lastEvt.clientX);
  }

  // 재생목록 창보다 이전으로 되감은 직후의 목표 위치. 플레이어(hls.js)는 재생목록을 갱신할 때(약 1초마다)
  // 위치가 창 밖이고 아직 재생 준비 중(readyState<4)이면 라이브로 되돌리는데, 이동 직후엔 잠깐 그 상태가 됨
  let rewound: { target: number; until: number; retries: number } | null = null;

  function seekTo(val: number) {
    const { start, end } = getEdges(v);
    const t = playableTarget(v, Math.min(end - 1, Math.max(start, val)), end);
    // 라이브 끝 1초 안에서 앞으로 가는 요청(→ 키, LIVE 버튼)이 끝-1초로 잘려 오히려 뒤로 가지 않게 함
    if (val > v.currentTime && t <= v.currentTime) return;
    // 뒤로 가는 요청이 구멍을 건너뛰느라 앞으로 가게 되면 이동하지 않음
    // (구멍 너머 이전 버퍼는 재생해도 곧 구멍에서 멈춰 라이브로 튀므로 넘어가지 않음)
    if (val < v.currentTime && t >= v.currentTime) return;
    v.currentTime = t;
    // 창은 조각(2~4초) 단위로 밀리므로 창 경계 바로 안쪽도 곧 창 밖이 됨: 4초 여유를 두고 대비
    rewound =
      t < end - PLAYLIST_WINDOW + 4
        ? { target: t, until: performance.now() + 2000, retries: 2 }
        : null;
  }

  // 되감은 직후 플레이어가 라이브 쪽으로 되돌리면 같은 위치로 다시 이동 (최대 2번)
  // 되돌리는 위치는 끊김이 쌓일수록 라이브에서 멀어지므로(최대 약 12초) 라이브와의 거리 대신 '10초 넘게 앞으로 감'으로 판단
  v.addEventListener(
    "seeking",
    () => {
      if (!rewound || performance.now() > rewound.until) return void (rewound = null);
      const { target } = rewound;
      if (Math.abs(v.currentTime - target) < 1) return; // 우리가 건 이동
      if (
        v.currentTime - target > 10 &&
        rewound.retries-- > 0 &&
        playableTarget(v, target, getEdges(v).end) === target // 그 사이 데이터가 사라졌으면 포기
      ) {
        v.currentTime = target;
      } else {
        rewound = null;
      }
    },
    { signal: alive.signal }
  );

  slide.addEventListener("mousedown", seekFromClick);
  document.querySelector(VIDEO_LAYOUT_NAME)?.addEventListener(
    "keydown",
    (evt) => {
      const e = evt as KeyboardEvent;
      // 바를 숨긴 상태(치지직 자체 재생바 사용 중)면 방향키는 플레이어 기본 동작에 맡김
      if (wrap.hidden) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        wrap.classList.add("no-anim");

        if (e.key === "ArrowLeft") {
          seekTo(parseFloat(String(v.currentTime)) - 5);
        } else if (e.key === "ArrowRight") {
          seekTo(parseFloat(String(v.currentTime)) + 5);
        }

        requestAnimationFrame(() => wrap.classList.remove("no-anim"));
      }
    },
    { signal: alive.signal }
  );

  btn.addEventListener("click", () => {
    const { end, ok } = getEdges(v);
    if (!ok) return;
    seekTo(end - EDGE_EPS);
  });

  slide.addEventListener(
    "pointerenter",
    (e: PointerEvent) => {
      tip.classList.add("show");
      cross.classList.add("show");
      onMove(e);
    },
    { passive: true }
  );

  slide.addEventListener("pointermove", onMove, { passive: true });

  slide.addEventListener("pointerleave", () => {
    // 남겨 두면 이후 갱신마다 숨은 툴팁 위치를 계산하느라 강제 레이아웃이 일어남
    lastEvt = null;
    tip.classList.remove("show");
    cross.classList.remove("show");
  });

  // 프레임마다 갱신하지 않고 미디어 이벤트(timeupdate는 약 4Hz)로만 갱신. 막대는 width 트랜지션으로 이어짐
  [
    "loadedmetadata",
    "durationchange",
    "progress",
    "playing",
    "pause",
    "waiting",
    "seeked",
    "seeking",
    "ratechange",
    "timeupdate",
    "resize",
  ].forEach((ev) => v.addEventListener(ev, updateUI, { signal: alive.signal }));

  updateUI();

  const mo = new MutationObserver(() => {
    if (!document.contains(v) || !document.contains(wrap)) {
      alive.abort();
      wrap.remove();
      mo.disconnect();
      // 컨트롤 바만 다시 그려진 경우(비디오 유지) 새 바를 붙임
      // (새 bottom 감지 콜백은 이 콜백보다 먼저 돌아 플래그 때문에 건너뛰므로 여기서 직접 재시도)
      (v as any).__liveBarMounted = false;
      tryMountAll();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  (v as any).__liveBarMounted = true;
}

function tryMountAll() {
  if (!location.pathname.startsWith("/live/")) return;
  document
    .querySelectorAll<HTMLVideoElement>(VIDEO_ELEMENT_NAME)
    .forEach((v) => mount(v));
}

function setupLiveBarObserver() {
  // 비디오/컨트롤 바가 이미 있으면 즉시, 이후 추가되거나 URL이 바뀌면 마운트 시도
  observeElement({ selector: VIDEO_ELEMENT_NAME, onElementAdded: tryMountAll });
  observeElement({ selector: BOTTOM_SEL, onElementAdded: tryMountAll });
  startUrlWatcher({ onPathChange: tryMountAll });
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_idle",
  async main() {
    if (!(await getOptions()).useLiveBar) return;
    setupLiveBarObserver();
  },
});
