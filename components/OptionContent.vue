<script lang="ts" setup>
import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";
import FunctionContent from "@/components/FunctionContent.vue";
import DesignContent from "@/components/DesignContent.vue";

const emit = defineEmits<{
  (e: "update-color", color: string): void;
}>();

const DEFAULT_OPTIONS = {
  useAutoQuality: true,
  useLiveBar: true,
  useVideoOverlay: true,
  useAutoRefresh: true,
  useVideoTime: true,
  useVideoUI: true,
  useHideBanner: true,
  useHideRecommend: true,
  themeName: "primary",
};

const options = reactive({
  useAutoQuality: true,
  useLiveBar: true,
  useVideoOverlay: true,
  useAutoRefresh: true,
  useVideoTime: true,
  useVideoUI: true,
  useHideBanner: true,
  useHideRecommend: true,
  themeName: "primary",
});

const activeKey = ref("1");

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

// 자식 컴포넌트에서 옵션 업데이트 시
const updateOptions = (newOptions: Partial<typeof options>) => {
  Object.assign(options, newOptions);
};
</script>

<template>
  <div w="full">
    <a-tabs v-model:activeKey="activeKey">
      <a-tab-pane key="1" tab="기능">
        <FunctionContent :options="options" @update:options="updateOptions" />
      </a-tab-pane>
      <a-tab-pane key="2" tab="모양">
        <DesignContent :options="options" @update:options="updateOptions" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style lang="scss" scoped>
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
