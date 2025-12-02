<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, type Ref } from "vue";
import Slider from "./Slider.vue";

const props = defineProps<{
  getCompressorParams?: () => {
    threshold: number;
    knee: number;
    ratio: number;
    attack: number;
    release: number;
    gain: number;
    filterGain: number;
    filterFrequency: number;
  } | null;
  setCompressorParams?: (params: {
    threshold: number;
    knee: number;
    ratio: number;
    attack: number;
    release: number;
    gain: number;
    filterGain: number;
    filterFrequency: number;
  }) => void;
}>();

const show = ref(false);
const x = ref(0);
const y = ref(0);
const overlayRef = ref<HTMLElement | null>(null);

// compressor 파라미터 상태 (기본값은 Web Audio 추천값 근처로 설정)
const threshold = ref(-24);
const knee = ref(30);
const ratio = ref(12);
const attack = ref(0.003);
const release = ref(0.25);
const gain = ref(1);
const filterGain = ref(0);
const filterFrequency = ref(1000);

type SliderKey =
  | "threshold"
  | "knee"
  | "ratio"
  | "attack"
  | "release"
  | "gain"
  | "filterGain"
  | "filterFrequency";

type SliderConfig = {
  key: SliderKey;
  label: string;
  min: number;
  max: number;
  step: number;
  value: Ref<number>;
  format: (v: number) => string;
};

const sliders: SliderConfig[] = [
  {
    key: "gain",
    label: "Master Gain",
    min: 0,
    max: 3,
    step: 0.01,
    value: gain,
    format: (v) => `${v.toFixed(2)}x`,
  },
  {
    key: "threshold",
    label: "Threshold (dB)",
    min: -60,
    max: 0,
    step: 1,
    value: threshold,
    format: (v) => v.toFixed(0),
  },
  {
    key: "knee",
    label: "Knee (dB)",
    min: 0,
    max: 40,
    step: 1,
    value: knee,
    format: (v) => v.toFixed(0),
  },
  {
    key: "ratio",
    label: "Ratio",
    min: 1,
    max: 20,
    step: 1,
    value: ratio,
    format: (v) => `${v.toFixed(0)}:1`,
  },
  {
    key: "attack",
    label: "Attack (s)",
    min: 0,
    max: 1,
    step: 0.001,
    value: attack,
    format: (v) => v.toFixed(3),
  },
  {
    key: "release",
    label: "Release (s)",
    min: 0,
    max: 1,
    step: 0.01,
    value: release,
    format: (v) => v.toFixed(2),
  },
  {
    key: "filterGain",
    label: "Filter Gain (dB)",
    min: -24,
    max: 24,
    step: 1,
    value: filterGain,
    format: (v) => v.toFixed(0),
  },
  {
    key: "filterFrequency",
    label: "Filter Freq (Hz)",
    min: 100,
    max: 8000,
    step: 10,
    value: filterFrequency,
    format: (v) => v.toFixed(0),
  },
];

const toggle = () => {
  show.value = !show.value;
};

const openAt = (nx: number, ny: number) => {
  // 같은 위치에서 다시 호출되면 닫기 (토글 동작)
  if (show.value && x.value === nx && y.value === ny) {
    show.value = false;
    return;
  }

  x.value = nx - 100;
  y.value = ny - 25;
  show.value = true;
};

const handleGlobalClick = (event: MouseEvent) => {
  if (!show.value) return;
  const root = overlayRef.value;
  const target = event.target as Node | null;

  // 팝업 영역 밖을 클릭한 경우 닫기
  if (root && target && !root.contains(target)) {
    show.value = false;
  }
};

const emitParams = () => {
  if (!props.setCompressorParams) return;

  props.setCompressorParams({
    threshold: threshold.value,
    knee: knee.value,
    ratio: ratio.value,
    attack: attack.value,
    release: release.value,
    gain: gain.value,
    filterGain: filterGain.value,
    filterFrequency: filterFrequency.value,
  });
};

onMounted(() => {
  // compressor 초기값 동기화
  if (props.getCompressorParams) {
    const params = props.getCompressorParams();
    if (params) {
      threshold.value = params.threshold;
      knee.value = params.knee;
      ratio.value = params.ratio;
      attack.value = params.attack;
      release.value = params.release;
      gain.value = params.gain;
      filterGain.value = params.filterGain;
      filterFrequency.value = params.filterFrequency;
    }
  }

  document.addEventListener("click", handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleGlobalClick);
});

// 외부에서 제어할 수 있도록 expose
defineExpose({ toggle, openAt });
</script>

<template>
  <span class="pzp-button__tooltip pzp-button__tooltip--top">설정</span>
  <div
    v-if="show"
    ref="overlayRef"
    class="chzzk-tools-comp-overlay"
    :style="{
      top: y + 'px',
      left: x + 'px',
      transform: 'translate(-50%, -100%)',
    }"
  >
    <div class="content">
      <label
        v-for="slider in sliders"
        :key="slider.key"
        class="slider-row"
        style="
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
        "
      >
        <div class="comp-overlay-text" style="width: 90px">
          {{ slider.label }}
        </div>
        <Slider
          class="chzzk-tools-range"
          style="flex: 1; width: 100%"
          v-model="slider.value.value"
          :min="slider.min"
          :max="slider.max"
          :step="slider.step"
          @update:modelValue="emitParams"
        />
        <div class="value comp-overlay-text" style="width: 40px">
          {{ slider.format(slider.value.value) }}
        </div>
      </label>
    </div>
  </div>
</template>

<style scoped>
.chzzk-overlay {
  position: absolute;
  z-index: 9999;
  background: rgba(25, 25, 28, 0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  pointer-events: auto;
  min-width: 200px;
  box-shadow: 0 0px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}
.content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.slider-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.slider-row div {
  white-space: nowrap;
}
.slider-row input[type="range"] {
  flex: 1;
}
.slider-row .value {
  width: 40px;
  text-align: right;
}
</style>
