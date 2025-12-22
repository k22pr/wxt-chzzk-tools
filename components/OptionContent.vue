<script lang="ts" setup>
import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

const emit = defineEmits<{
  (e: "update-color", color: string): void;
}>();

const DEFAULT_OPTIONS = {
  useAutoQuality: true,
  useLiveBar: true,
  useVideoOverlay: true,
  useAutoRefresh: true,
  useVideoTime: true,
  themeName: "primary",
};

const options = reactive({
  useAutoQuality: true,
  useLiveBar: true,
  useVideoOverlay: true,
  useAutoRefresh: true,
  useVideoTime: true,
  themeName: "primary",
});

// 기본값과 동일한지 확인하는 헬퍼 함수
const isEqualToDefault = (val: typeof options) => {
  return Object.keys(DEFAULT_OPTIONS).every(
    (key) =>
      val[key as keyof typeof DEFAULT_OPTIONS] ===
      DEFAULT_OPTIONS[key as keyof typeof DEFAULT_OPTIONS]
  );
};

onMounted(async () => {
  const saved = await storage.getItem(`local:${STORAGE_KEY}`);
  Object.assign(options, { ...DEFAULT_OPTIONS, ...(saved ?? {}) });
});

watch(
  options,
  async (val) => {
    try {
      await storage.setItem(`local:${STORAGE_KEY}`, val);
    } catch (e) {}
  },
  { deep: true }
);

// 색상 변경 시 부모로 즉시 통지하여 테마에 반영
watch(
  () => options.themeName,
  (color) => {
    if (typeof color === "string" && color) emit("update-color", color);
  }
);
</script>

<template>
  <div w="full" grid gap="4">
    <div w="full" grid gap="2">
      <div w="full" flex items="top" class="flex" justify="between">
        <div w="full">
          <div text="4">자동 화질변경</div>
          <div text="3 gray-5">
            광고 차단시 화질이 낮아지는 문제를 해결합니다.
          </div>
        </div>
        <div>
          <a-switch v-model:checked="options.useAutoQuality" />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">LIVE 재생바</div>
          <div text="3 gray-5">
            방송 접속시점부터 최대 1분30초간 재생바를 제공합니다.
          </div>
        </div>
        <div>
          <a-switch v-model:checked="options.useLiveBar" />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">음향 보정 (Compressor)</div>
          <div text="3 gray-5">
            볼륨/음질을 조절할 수 있는 오버레이를 표시합니다.
          </div>
        </div>
        <div>
          <a-switch v-model:checked="options.useVideoOverlay" />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">팔로잉 자동 새로고침</div>
          <div text="3 gray-5">
            사이드바의 팔로잉 목록을 30초마다 새로고침합니다.
          </div>
        </div>
        <div>
          <a-switch v-model:checked="options.useAutoRefresh" />
        </div>
      </div>
    </div>
    <div w="full" grid gap="2">
      <div w="full" flex items="top" justify="between">
        <div w="full">
          <div text="4">VOD 실제 시간</div>
          <div text="3 gray-5">VOD 탐색 시 실제 방송 시간을 표시합니다.</div>
        </div>
        <div>
          <a-switch v-model:checked="options.useVideoTime" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.read-the-docs {
  color: #888;
}

.color-button {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 0px;
  transition: 0.2s;
  cursor: pointer;
  opacity: 0.8;

  &:hover {
    opacity: 1;
  }

  &.active {
    border: 1px solid #fff;
    opacity: 1;
  }
  &.primary {
    background-color: #00f889;
    &.active {
      outline: 3px solid rgba(0, 248, 137, 0.5);
    }
  }
  &.gray {
    background-color: #d9d9d9;
    &.active {
      outline: 3px solid rgba(217, 217, 217, 0.5);
    }
  }
  &.red {
    background-color: #ff4d4f;
    &.active {
      outline: 3px solid rgba(255, 77, 79, 0.5);
    }
  }
  &.orange {
    background-color: #ff922b;
    &.active {
      outline: 3px solid rgba(255, 146, 43, 0.5);
    }
  }
  &.yellow {
    background-color: #fab005;
    &.active {
      outline: 3px solid rgba(255, 176, 5, 0.5);
    }
  }
  &.blue {
    background-color: #339af0;
    &.active {
      outline: 3px solid rgba(51, 154, 240, 0.5);
    }
  }
  &.violet {
    background-color: #845ef7;
    &.active {
      outline: 3px solid rgba(132, 94, 247, 0.5);
    }
  }
  &.pink {
    background-color: #f06595;
    &.active {
      outline: 3px solid rgba(240, 101, 149, 0.5);
    }
  }
}
</style>
