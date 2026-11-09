import { createApp } from "vue";
import VideoOverlay from "@/components/injected/VideoOverlay.vue";
import { getOptions, observeElement } from "@/utils/content-helpers";

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],

  async main() {
    if (!(await getOptions()).useVideoOverlay) return;

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
      version?: number;
      expiresAt?: number;
    };

    const STORAGE_KEY_PREFIX = "pzzk-tools-comp:";
    const STORAGE_VERSION = 1;
    // 기본 유효기간: 30일 (ms)
    const STORAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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

    // 컴프레서·게인·필터 노드에 파라미터를 적용
    function applyParams(
      nodes: {
        compressor: DynamicsCompressorNode;
        gain: GainNode;
        filter: BiquadFilterNode;
      },
      params: CompressorParams
    ) {
      const { compressor, gain, filter } = nodes;
      compressor.threshold.value = params.threshold;
      compressor.knee.value = params.knee;
      compressor.ratio.value = params.ratio;
      compressor.attack.value = params.attack;
      compressor.release.value = params.release;

      gain.gain.value = params.gain;
      filter.gain.value = params.filterGain;
      filter.frequency.value = params.filterFrequency;
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

      if (initialParams) applyParams({ compressor, gain, filter }, initialParams);

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

      // 볼륨/음소거는 치지직 플레이어가 저장(localStorage player-volume)·적용하므로 건드리지 않음
      // (video.volume을 직접 바꾸면 플레이어가 그 값을 다시 저장해 치지직 설정이 덮어써짐)

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
        setCompressorParams: (params: CompressorParams) => {
          const chain = audioChainMap.get(video);
          if (!chain) return;
          applyParams(chain, params);
          if (channelId) saveParamsForChannel(channelId, params);
        },
        applyParamsOnly: (params: CompressorParams) => {
          const chain = audioChainMap.get(video);
          if (chain) applyParams(chain, params);
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
      container.addEventListener("click", (e) => {
        // 같은 클릭이 document까지 전파되면 오버레이의 바깥 클릭 처리로 바로 닫힘
        e.stopPropagation();
        const overlayInstance = overlayMap.get(video) as any;
        if (!overlayInstance) return;

        const videoRect = video.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const x =
          containerRect.left + containerRect.width / 2 - videoRect.left;
        const y = containerRect.top - videoRect.top;

        overlayInstance.openAt(x, y);
      });
      // 툴팁(플레이어의 pzp-button__tooltip 스타일) + 아이콘
      container.innerHTML =
        '<span class="pzp-button__tooltip pzp-button__tooltip--top">Compressor</span>' +
        '<span title="Pzzk Tools"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 14 14">' +
        '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M1 5.5v3M4 3v8M7 .5v13M10 3v8m3-5.5v3"/>' +
        "</svg></span>";
    }

    // 비디오 요소 감지 및 마운트
    // SPA 이동 시 비디오 요소가 교체되므로, 완전히 제거된 비디오의 AudioContext는 닫아 누수 방지
    // (DOM 내 이동은 잠시 분리됐다가 다시 붙으므로 지연 후 isConnected로 판별)
    observeElement({
      selector: VIDEO_SELECTOR,
      onElementAdded: (el) => mountUi(el),
      onElementRemoved: (el) =>
        setTimeout(() => {
          if (!el.isConnected) audioChainMap.get(el)?.context.close();
        }, 3000),
    });

    // 컨트롤 바 감지 및 마운트
    observeElement({
      selector: CONTROL_BAR_LEFT_SELECTOR,
      onElementAdded: (el) => mountButton(el),
    });
  },
});
