<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from "vue";

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

const onPointerDown = (event: MouseEvent) => {
  isDragging.value = true;
  updateFromClientX(event.clientX);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
};

const onPointerMove = (event: MouseEvent) => {
  if (!isDragging.value) return;
  updateFromClientX(event.clientX);
};

const onPointerUp = () => {
  isDragging.value = false;
  window.removeEventListener("mousemove", onPointerMove);
  window.removeEventListener("mouseup", onPointerUp);
};

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onPointerMove);
  window.removeEventListener("mouseup", onPointerUp);
});
</script>

<template>
  <div
    class="chzzk-tools-slider"
    ref="trackRef"
    @mousedown.prevent="onPointerDown"
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
