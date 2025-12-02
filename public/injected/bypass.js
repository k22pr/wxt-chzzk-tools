(function () {
  "use strict";

  const isDebug =
    document.currentScript &&
    document.currentScript.getAttribute("data-debug") === "true";

  const log = {
    info: (...args) => isDebug && console.log(...args),
    error: (...args) => isDebug && console.error(...args),
  };

  const VIDEO_SELECTOR = "video.webplayer-internal-video";
  const NAME = "chzzk-tools";

  function modifyDataObject(data) {
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
      } // Modify livePlaybackJson

      if (data.content && data.content.livePlaybackJson) {
        let playback = null;

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
            playback.media.forEach((m) => {
              if (Array.isArray(m.encodingTrack)) {
                m.encodingTrack.forEach((track) => {
                  if (track.p2pPath) {
                    delete track.p2pPath;
                  }

                  if (track.p2pPathUrlEncoding) {
                    delete track.p2pPathUrlEncoding;
                  }
                });
              }
            });
          }

          data.content.livePlaybackJson = JSON.stringify(playback);
        }
      }
    } catch (err) {
      log.error(`[${NAME}] modifyDataObject error:`, err);
    }

    return data;
  } // Patch fetch

  (function patchFetch() {
    const _fetch = window.fetch;

    window.fetch = function (input, init) {
      const url =
        typeof input === "string" ? input : (input && input.url) || "";

      return _fetch(input, init).then(async (resp) => {
        try {
          if (url && url.includes("live-detail")) {
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

              headers: headers,
            });
          }
        } catch (err) {
          log.error(`[${NAME}] fetch patch error:`, err);
        }

        return resp;
      });
    };

    log.info(`[${NAME}] fetch patched`);
  })(); // Patch XMLHttpRequest

  function patchXHR() {
    const proto = XMLHttpRequest.prototype;

    const origOpen = proto.open;

    const origSend = proto.send;

    proto.open = function (method, url) {
      this.__chzzk_url = url;

      return origOpen.apply(this, arguments);
    };

    proto.send = function (body) {
      this.addEventListener("readystatechange", function () {
        if (
          this.readyState === 4 &&
          this.__chzzk_url &&
          this.__chzzk_url.includes("live-detail")
        ) {
          try {
            let data = JSON.parse(this.responseText);

            data = modifyDataObject(data);

            Object.defineProperty(this, "responseText", {
              get: () => JSON.stringify(data),
            });

            Object.defineProperty(this, "response", {
              get: () => JSON.stringify(data),
            });
          } catch (err) {
            log.error(`[${NAME}] XHR patch error:`, err);
          }
        }
      });

      return origSend.apply(this, arguments);
    };

    log.info(`[${NAME}] XHR patched`);
  }

  // SPA 네비게이션/DOM 변경 시마다 재스캔
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

  // SPA URL 변경 감지용 history 패치
  function patchHistoryForSPA() {
    const _ps = history.pushState;
    const _rs = history.replaceState;

    const fire = function () {
      setTimeout(function () {
        patchXHR();
      }, 0);
    };

    history.pushState = function () {
      const r = _ps.apply(this, arguments);
      fire();
      return r;
    };

    history.replaceState = function () {
      const r = _rs.apply(this, arguments);
      fire();
      return r;
    };

    window.addEventListener("popstate", fire);
  }

  function init() {
    patchXHR();
    setupMutationObserver();
    patchHistoryForSPA();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
