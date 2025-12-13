import { createApp, ComponentPublicInstance } from "vue";
import VideoOverlay from "@/components/injected/VideoOverlay.vue";
import ControlBarButton from "@/components/injected/ControlBarButton.vue";
import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

export default defineContentScript({
  matches: [
    "https://chzzk.naver.com/live/*",
    "https://chzzk.naver.com/video/*",
  ],
  cssInjectionMode: "ui",

  async main(ctx) {
    try {
      const saved = (await storage.getItem(`local:${STORAGE_KEY}`)) as {
        useVideoOverlay?: boolean;
      } | null;

      // console.log("saved", saved);

      if (saved && saved.useVideoOverlay === false) {
        return;
      }
    } catch {
      // 옵션 로드 실패 시 기본값(사용)으로 진행
    }

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

    type CompressorParams = {
      threshold: number;
      knee: number;
      ratio: number;
      attack: number;
      release: number;
      gain: number;
      filterGain: number;
      filterFrequency: number;
      volume?: number;
      version?: number;
      expiresAt?: number;
    };

    const STORAGE_KEY_PREFIX = "chzzk-tools-comp:";
    const STORAGE_VERSION = 1;
    // 기본 유효기간: 30일 (ms)
    const STORAGE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

    function getChannelIdFromLocation(): string | null {
      try {
        const pathname = window.location.pathname;
        const liveMatch = pathname.match(/\/live\/([^/?#]+)/);
        if (liveMatch) return liveMatch[1];

        const videoMatch = pathname.match(/\/video\/([^/?#]+)/);
        if (videoMatch) return videoMatch[1];

        return null;
      } catch {
        return null;
      }
    }

    function loadParamsForChannel(channelId: string): CompressorParams | null {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + channelId);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CompressorParams;
        if (!parsed) {
          window.localStorage.removeItem(STORAGE_KEY_PREFIX + channelId);
          return null;
        }

        const now = Date.now();
        // 만료된 데이터라면 제거 후 무시
        if (parsed.expiresAt && parsed.expiresAt < now) {
          window.localStorage.removeItem(STORAGE_KEY_PREFIX + channelId);
          return null;
        }

        // 유효한 데이터면 그대로 사용 (접속 시에는 쓰기 발생 X)
        return parsed;
      } catch {
        return null;
      }
    }

    function saveParamsForChannel(channelId: string, params: CompressorParams) {
      try {
        const now = Date.now();
        const payload: CompressorParams = {
          ...params,
          version: STORAGE_VERSION,
          expiresAt: now + STORAGE_TTL_MS,
        };
        window.localStorage.setItem(
          STORAGE_KEY_PREFIX + channelId,
          JSON.stringify(payload)
        );
      } catch {
        // ignore
      }
    }

    function clearParamsForChannel(channelId: string) {
      try {
        window.localStorage.removeItem(STORAGE_KEY_PREFIX + channelId);
      } catch {
        // ignore
      }
    }

    function setupAudioForVideo(
      video: Element,
      initialParams?: CompressorParams | null
    ) {
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
      filter.frequency.value = 1000;
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

      // 첫 클릭(pointerdown) 시에도 resume 시도 (음소거 해제 버튼 클릭 등 포함)
      const handlePointerDown = () => {
        resumeContext();
        document.removeEventListener("pointerdown", handlePointerDown);
      };
      document.addEventListener("pointerdown", handlePointerDown, {
        once: true,
        passive: true,
      });

      media.addEventListener("volumechange", () => {
        const channelId = getChannelIdFromLocation();
        if (!channelId) return;

        const chain = audioChainMap.get(video);
        if (!chain) return;

        const c = chain.compressor;
        const g = chain.gain;
        const f = chain.filter;

        const params: CompressorParams = {
          threshold: c.threshold.value,
          knee: c.knee.value,
          ratio: c.ratio.value,
          attack: c.attack.value,
          release: c.release.value,
          gain: g.gain.value,
          filterGain: f.gain.value,
          filterFrequency: f.frequency.value,
          volume: media.volume,
        };

        saveParamsForChannel(channelId, params);
      });

      if (initialParams) {
        compressor.threshold.value = initialParams.threshold;
        compressor.knee.value = initialParams.knee;
        compressor.ratio.value = initialParams.ratio;
        compressor.attack.value = initialParams.attack;
        compressor.release.value = initialParams.release;

        gain.gain.value = initialParams.gain;
        filter.gain.value = initialParams.filterGain;
        filter.frequency.value = initialParams.filterFrequency;
      }

      audioChainMap.set(video, { context, source, filter, compressor, gain });
    }

    async function mountUi(video: Element) {
      if (mountedVideos.has(video)) return;
      const parent = video.parentElement;
      if (!parent) return;

      mountedVideos.add(video);

      const channelId = getChannelIdFromLocation();
      const savedParams = channelId ? loadParamsForChannel(channelId) : null;

      // 0. 비디오 오디오를 AudioContext + DynamicsCompressor로 연결
      // 페이지 로드 직후에는 체인을 붙이지 않고, 약간의 딜레이 후 한 번만 연결
      setTimeout(() => {
        if (audioChainMap.has(video)) return;
        setupAudioForVideo(video, savedParams ?? undefined);
      }, 500);

      // 저장된 볼륨이 있으면 적용, 없으면 100%로 설정 후 음소거 해제
      const media = video as HTMLMediaElement;
      if (typeof savedParams?.volume === "number") {
        media.volume = savedParams.volume;
      } else {
        media.volume = 1;
      }
      media.muted = false;

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
          const media = video as HTMLMediaElement;
          return {
            threshold: c.threshold.value,
            knee: c.knee.value,
            ratio: c.ratio.value,
            attack: c.attack.value,
            release: c.release.value,
            gain: g.gain.value,
            filterGain: f.gain.value,
            filterFrequency: f.frequency.value,
            volume: media.volume,
          };
        },
        setCompressorParams: (params: CompressorParams) => {
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

          // 저장 시점의 비디오 볼륨을 함께 저장
          if (channelId) {
            const media = video as HTMLMediaElement;
            const payload: CompressorParams = {
              ...params,
              volume: media.volume,
            };
            saveParamsForChannel(channelId, payload);
          }
        },
        applyParamsOnly: (params: CompressorParams) => {
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
        clearStoredParams: () => {
          if (!channelId) return;
          clearParamsForChannel(channelId);
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
