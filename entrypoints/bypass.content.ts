const VIDEO_SELECTOR = "video.webplayer-internal-video";
const NAME = "chzzk-tools";

function modifyDataObject(data: any) {
  try {
    if (!data || !data.content) return data;

    if (data.content.p2pQuality) {
      data.content.p2pQuality = [];
      try {
        Object.defineProperty(data.content, "p2pQuality", {
          configurable: false,
          writable: false,
        });
      } catch (e) {}
    }

    if (data.content && data.content.livePlaybackJson) {
      let playback: any = null;
      try {
        playback =
          typeof data.content.livePlaybackJson === "string"
            ? JSON.parse(data.content.livePlaybackJson)
            : data.content.livePlaybackJson;
      } catch (e) {
        playback = null;
      }

      if (playback) {
        if (playback.meta && playback.meta.p2p) {
          playback.meta.p2p = false;
        }

        if (Array.isArray(playback.media)) {
          playback.media.forEach((m: any) => {
            if (Array.isArray(m.encodingTrack)) {
              m.encodingTrack.forEach((track: any) => {
                if (track.p2pPath) delete track.p2pPath;
                if (track.p2pPathUrlEncoding) delete track.p2pPathUrlEncoding;
              });
            }
          });
        }

        data.content.livePlaybackJson = JSON.stringify(playback);
      }
    }
  } catch (err) {
    console.error(`[${NAME}] modifyDataObject error:`, err);
  }

  return data;
}

function patchFetch() {
  const _fetch = window.fetch;

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url =
      typeof input === "string" ? input : (input as Request).url || "";

    return _fetch(input as any, init).then(async (resp) => {
      try {
        if (url && url.includes("live-detail")) {
          console.log("[chzzk-tools] /live-detail 호출", {
            href: window.location.href,
            time: new Date().toISOString(),
          });
          console.trace("[chzzk-tools] /live-detail call stack");

          const clone = resp.clone();
          const text = await clone.text();
          let data = JSON.parse(text);
          data = modifyDataObject(data);

          const headers = new Headers(resp.headers);
          if (!headers.has("content-type")) {
            headers.set("content-type", "application/json;charset=utf-8");
          }

          return new Response(JSON.stringify(data), {
            status: resp.status,
            statusText: resp.statusText,
            headers,
          });
        } else {
          // console.log("live-detail not found");
          return resp;
        }
      } catch (err) {
        console.error(`[${NAME}] fetch patch error:`, err);
      }
      return resp;
    });
  };

  // console.info(`[${NAME}] fetch patched`);
}

function patchXHR() {
  // 현재는 주석 처리된 XHR 패치 자리. 필요 시 다시 활성화 가능.
}

function setupMutationObserver() {
  const root = document.documentElement || document.body;
  if (!root) return;

  const mo = new MutationObserver(function (mutations) {
    for (const m of mutations) {
      m.addedNodes.forEach(function (node) {
        if (!(node instanceof Element)) return;
        if (node.matches && node.matches(VIDEO_SELECTOR)) {
          patchXHR();
        } else if (node.querySelector) {
          const v = node.querySelector(VIDEO_SELECTOR);
          if (v) patchXHR();
        }
      });
    }
  });

  mo.observe(root, { childList: true, subtree: true });
}

function patchHistoryForSPA() {
  const _ps = history.pushState;
  const _rs = history.replaceState;

  const fire = function () {
    setTimeout(function () {
      patchXHR();
    }, 0);
  };

  history.pushState = function (...args: any[]) {
    const r = _ps.apply(this, args as any);
    fire();
    return r;
  };

  history.replaceState = function (...args: any[]) {
    const r = _rs.apply(this, args as any);
    fire();
    return r;
  };

  window.addEventListener("popstate", fire);
}

function init() {
  try {
    if (navigator.userAgent.includes("Windows")) {
      console.log(
        `[${NAME}] UserAgent & Platform spoofed to Mac`,
        navigator.userAgent
      );
    }
  } catch (e) {
    console.error(`[${NAME}] UserAgent spoof error:`, e);
  }

  patchFetch();
  patchXHR();
  setupMutationObserver();
  patchHistoryForSPA();
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  async main() {
    init();
  },
});
