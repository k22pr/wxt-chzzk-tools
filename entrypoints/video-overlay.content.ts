import { createApp, ComponentPublicInstance } from "vue";
import VideoOverlay from "@/components/VideoOverlay.vue";
import ControlBarButton from "@/components/ControlBarButton.vue";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const VIDEO_SELECTOR = "video.webplayer-internal-video";
    const CONTROL_BAR_LEFT_SELECTOR = "div.pzp-pc__bottom-buttons-right";

    const mountedVideos = new WeakSet<Element>();
    const mountedButtons = new WeakSet<Element>();

    // 오버레이 인스턴스를 저장할 맵 (비디오 요소 -> 오버레이 앱 인스턴스)
    const overlayMap = new WeakMap<Element, any>();

    // 비디오별 오디오 체인을 저장할 맵 (비디오 요소 -> { context, source, filter, compressor, gain })
    const audioChainMap = new WeakMap<
      Element,
      {
        context: AudioContext;
        source: MediaElementAudioSourceNode;
        filter: BiquadFilterNode;
        compressor: DynamicsCompressorNode;
        gain: GainNode;
      }
    >();

    function setupAudioForVideo(video: Element) {
      if (audioChainMap.has(video)) return;

      const media = video as HTMLMediaElement;
      if (!media || typeof media.tagName !== "string") return;
      if (media.tagName.toLowerCase() !== "video") return;

      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const context: AudioContext = new AudioContextClass();
      const source = context.createMediaElementSource(media);
      const filter = context.createBiquadFilter();
      const compressor = context.createDynamicsCompressor();
      const gain = context.createGain();

      // 기본 필터/게인 설정 (필요 시 수정 가능)
      filter.type = "peaking";
      filter.frequency.value = 1000; // 1kHz 근처 대역
      filter.Q.value = 1;
      filter.gain.value = 0;

      gain.gain.value = 1;

      // source -> filter -> compressor -> gain -> destination
      source.connect(filter);
      filter.connect(compressor);
      compressor.connect(gain);
      gain.connect(context.destination);

      // 사용자 상호작용 이후 재생 시 자동 resume
      const resumeContext = () => {
        if (context.state === "suspended") {
          context.resume();
        }
      };
      media.addEventListener("play", resumeContext, { passive: true });

      audioChainMap.set(video, { context, source, filter, compressor, gain });
    }

    async function mountUi(video: Element) {
      if (mountedVideos.has(video)) return;
      const parent = video.parentElement;
      if (!parent) return;

      mountedVideos.add(video);

      // 0. 비디오 오디오를 AudioContext + DynamicsCompressor로 연결
      setupAudioForVideo(video);

      if (!document.getElementById("chzzk-video-overlay-style")) {
        const style = document.createElement("style");
        style.id = "chzzk-video-overlay-style";
        document.head.appendChild(style);
      }

      // 1. 오버레이를 일반 DOM에 직접 주입
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.pointerEvents = "none";
      container.style.zIndex = "100";

      parent.appendChild(container);

      const app = createApp(VideoOverlay, {
        getCompressorParams: () => {
          const chain = audioChainMap.get(video);
          if (!chain) return null;
          const c = chain.compressor;
          const g = chain.gain;
          const f = chain.filter;
          return {
            threshold: c.threshold.value,
            knee: c.knee.value,
            ratio: c.ratio.value,
            attack: c.attack.value,
            release: c.release.value,
            gain: g.gain.value,
            filterGain: f.gain.value,
            filterFrequency: f.frequency.value,
          };
        },
        setCompressorParams: (params: {
          threshold: number;
          knee: number;
          ratio: number;
          attack: number;
          release: number;
          gain: number;
          filterGain: number;
          filterFrequency: number;
        }) => {
          const chain = audioChainMap.get(video);
          if (!chain) return;
          const c = chain.compressor;
          const g = chain.gain;
          const f = chain.filter;

          c.threshold.value = params.threshold;
          c.knee.value = params.knee;
          c.ratio.value = params.ratio;
          c.attack.value = params.attack;
          c.release.value = params.release;

          g.gain.value = params.gain;
          f.gain.value = params.filterGain;
          f.frequency.value = params.filterFrequency;
        },
      });
      const instance = app.mount(container as HTMLElement);
      overlayMap.set(video, instance); // 인스턴스 저장
    }

    async function mountButton(controlBar: Element) {
      if (mountedButtons.has(controlBar)) return;

      // 해당 컨트롤 바가 속한 비디오 찾기 (가장 가까운 비디오 컨테이너 탐색 등)
      // 보통 pzp-pc__bottom-buttons-left 는 video 태그와 같은 컨테이너 안에 있거나 형제 관계임.
      // 여기서는 DOM 구조를 타고 올라가서 비디오를 찾거나, 전역적으로 관리해야 함.
      // 간단하게: 현재 화면에 보이는 비디오 중 하나라고 가정하거나, DOM 트리 탐색.

      // DOM 트리 위로 올라가서 비디오 컨테이너 찾기
      let root =
        controlBar.closest(".pzp-pc__setting-layer") ||
        controlBar.closest('[class*="webplayer-internal-source-root"]') ||
        controlBar.closest('[class*="webplayer"]');

      let video = root?.querySelector(VIDEO_SELECTOR);

      // 비디오를 못 찾았다면 전역 검색 시도 (단일 비디오 가정)
      if (!video) {
        video = document.querySelector(VIDEO_SELECTOR);
      }

      if (!video) return; // 비디오를 못 찾으면 패스

      mountedButtons.add(controlBar);

      const targetIndex = 1;
      const children = controlBar.children;
      const referenceNode = children[targetIndex];
      const container = document.createElement("button");
      container.className = "pzp-pc__pip-button pzp-button";
      container.style.width = "36px";
      container.style.height = "36px";
      // 새 컨테이너를 referenceNode 바로 뒤에 삽입
      if (referenceNode && referenceNode.parentNode) {
        referenceNode.parentNode.insertBefore(
          container,
          referenceNode.nextSibling
        );
      } else {
        controlBar.appendChild(container);
      }
      const app = createApp(ControlBarButton, {
        onClick: () => {
          const overlayInstance = overlayMap.get(video) as any;
          if (!overlayInstance) return;

          const videoElement = video as HTMLElement;
          const videoRect = videoElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          const x =
            containerRect.left + containerRect.width / 2 - videoRect.left;
          const y = containerRect.top - videoRect.top;

          if (typeof overlayInstance.openAt === "function") {
            overlayInstance.openAt(x, y);
          } else if (typeof overlayInstance.toggle === "function") {
            overlayInstance.toggle();
          }
        },
      });
      app.mount(container);
    }

    // 초기 로드 및 감지
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 노드가 추가되었을 때 확인
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            // 비디오 요소인지 확인
            if (node.matches(VIDEO_SELECTOR)) {
              mountUi(node);
            } else if (node.querySelector(VIDEO_SELECTOR)) {
              node.querySelectorAll(VIDEO_SELECTOR).forEach(mountUi);
            }

            // 컨트롤 바 요소인지 확인
            if (node.matches(CONTROL_BAR_LEFT_SELECTOR)) {
              mountButton(node);
            } else if (node.querySelector(CONTROL_BAR_LEFT_SELECTOR)) {
              node
                .querySelectorAll(CONTROL_BAR_LEFT_SELECTOR)
                .forEach(mountButton);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 초기 실행 (이미 로드된 요소들 처리)
    document.querySelectorAll(VIDEO_SELECTOR).forEach(mountUi);
    document.querySelectorAll(CONTROL_BAR_LEFT_SELECTOR).forEach(mountButton);
  },
});
