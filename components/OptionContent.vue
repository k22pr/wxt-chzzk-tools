<script lang="ts" setup>
import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";
const DEFAULT_OPTIONS = {
  useAutoQuality: true,
  useLiveBar: true,
  useStreamDesign: true,
};

const options = reactive({
  useAutoQuality: true,
  useLiveBar: true,
  useStreamDesign: true,
});

onMounted(async () => {
  const saved = await storage.getItem(`local:${STORAGE_KEY}`);
  Object.assign(options, { ...DEFAULT_OPTIONS, ...(saved ?? {}) });

  if (!saved) {
    storage.setItem(`local:${STORAGE_KEY}`, options);
  }
});

watch(
  options,
  (val) => {
    try {
      storage.setItem(`local:${STORAGE_KEY}`, val);
    } catch (e) {}
  },
  { deep: true }
);

const toggleOption = (
  option: "useStreamDesign" | "useAutoQuality" | "useLiveBar"
) => {
  options[option] = !options[option];
};
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
          <div text="4">방송화면 디자인</div>
          <div text="3 gray-5">
            방송화면에 집중할 수 있도록 UI를 변경합니다.
          </div>
        </div>
        <div>
          <a-switch v-model:checked="options.useStreamDesign" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
