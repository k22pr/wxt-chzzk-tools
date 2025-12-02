(function () {
  "use strict";

  // 치지직 영상에 오디오 컴프레서 + 볼륨 제어를 적용하는 스크립트
  const VIDEO_SELECTOR = "video.webplayer-internal-video";

  let audioCtx = null;
  let gainNode = null;
  let compressorNode = null;

  // 오디오 체인 생성: MediaElementSource -> Compressor -> Gain -> Destination
  function ensureAudioGraph(video) {
    if (!video || video._chzzkCompressorMounted) return;

    // 한 video 요소당 한 번만 MediaElementSource를 만들도록 플래그 설정
    video._chzzkCompressorMounted = true;

    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }

      const source = audioCtx.createMediaElementSource(video);

      if (!compressorNode) {
        compressorNode = audioCtx.createDynamicsCompressor();

        // 기본 컴프레서 설정 (필요시 숫자 조절 가능)
        // threshold: 컴프레싱이 시작되는 레벨 (dB)
        compressorNode.threshold.value = -24;
        // knee: 소프트/하드 knee 양
        compressorNode.knee.value = 30;
        // ratio: 입력 대비 출력 비율
        compressorNode.ratio.value = 6;
        // attack/release: 반응 속도 (초)
        compressorNode.attack.value = 0.003;
        compressorNode.release.value = 0.25;
      }

      if (!gainNode) {
        gainNode = audioCtx.createGain();
        // 기본 볼륨 1.0 (필요시 window.chzzkCompressor.setGain 사용)
        gainNode.gain.value = 1.0;
      }

      // 기존 연결을 건드리지 않고 새 source만 체인에 연결
      source.connect(compressorNode);
      compressorNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // 재생 중이 아니면 자동 재생 시도 (에러는 무시)
      if (video.paused) {
        video.play().catch(function () {});
      }
    } catch (e) {
      console.error("[chzzk-tools] compressor error", e);
    }
  }

  // 외부에서 볼륨/컴프레서 제어할 수 있도록 전역 객체 제공
  function exposeAPI() {
    if (window.chzzkCompressor) return;

    // 전역 제어용 간단 API
    window.chzzkCompressor = {
      // 볼륨 설정 (기본 범위 0.0 ~ 3.0 정도 추천)
      setGain: function (value) {
        if (!gainNode) return;
        const v = Number(value);
        if (!Number.isFinite(v)) return;
        gainNode.gain.value = v;
      },
      // AudioContext를 재개 (브라우저 정책으로 일시정지 되었을 때 사용)
      resume: function () {
        if (audioCtx && audioCtx.state === "suspended") {
          return audioCtx.resume();
        }
      },
      // 현재 상태 조회용
      get state() {
        return audioCtx ? audioCtx.state : "inactive";
      },
    };
  }

  // 현재 문서에서 video 요소들을 찾아 오디오 그래프 연결
  function scanVideos() {
    const videos = document.querySelectorAll(VIDEO_SELECTOR);
    videos.forEach(function (video) {
      // SPA에서 같은 video 엘리먼트에 다른 스트림이 로드될 수 있으므로
      // loadedmetadata 시점에도 한 번 더 보장
      if (!video._chzzkCompressorMetaBound) {
        video._chzzkCompressorMetaBound = true;
        video.addEventListener(
          "loadedmetadata",
          function () {
            ensureAudioGraph(video);
          },
          { once: false }
        );
      }

      ensureAudioGraph(video);
    });
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
            ensureAudioGraph(node);
          } else if (node.querySelector) {
            const v = node.querySelector(VIDEO_SELECTOR);
            if (v) ensureAudioGraph(v);
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
        scanVideos();
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
    exposeAPI();
    scanVideos();
    setupMutationObserver();
    patchHistoryForSPA();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
