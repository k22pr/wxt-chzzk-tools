<script lang="ts" setup>
import { computed, ref } from "vue";

const props = defineProps<{
  modelValue: number;
  min: number;
  max: number;
  step?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: number): void;
}>();

const trackRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

const clampedValue = computed(() => {
  const v = props.modelValue;
  if (v < props.min) return props.min;
  if (v > props.max) return props.max;
  return v;
});

const percent = computed(() => {
  const range = props.max - props.min;
  if (range <= 0) return 0;
  return ((clampedValue.value - props.min) / range) * 100;
});

function roundToStep(value: number) {
  const step = props.step ?? 1;
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

function updateFromClientX(clientX: number) {
  const track = trackRef.value;
  if (!track) return;

  const rect = track.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const raw = props.min + clampedRatio * (props.max - props.min);
  const next = roundToStep(raw);
  emit("update:modelValue", next);
}

// 포인터 이벤트(마우스·터치·펜 공통) + 포인터 캡처: 슬라이더 밖으로 끌어도 놓을 때까지 이벤트가 여기로 옴
const onPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return; // 주 버튼(왼쪽 클릭·터치·펜)만
  trackRef.value?.setPointerCapture(event.pointerId);
  isDragging.value = true;
  updateFromClientX(event.clientX);
};

const onPointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return;
  updateFromClientX(event.clientX);
};

const onPointerUp = () => {
  isDragging.value = false;
};
</script>

<template>
  <!-- mousedown.prevent: 마우스로 누를 때 포커스 이동·텍스트 선택 방지 (기존 동작 유지) -->
  <div
    class="chzzk-tools-slider"
    ref="trackRef"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @mousedown.prevent
  >
    <div class="chzzk-tools-slider__track"></div>
    <div
      class="chzzk-tools-slider__fill"
      :style="{ width: percent + '%' }"
    ></div>
    <div
      class="chzzk-tools-slider__thumb"
      :style="{ left: percent + '%' }"
    ></div>
  </div>
</template>
