<script lang="ts" setup>
import { STORAGE_KEY, DEFAULT_OPTIONS, type Options } from "@/constants";
import { getOptions } from "@/utils/content-helpers";
import FunctionContent from "@/components/FunctionContent.vue";
import DesignContent from "@/components/DesignContent.vue";

const options = reactive<Options>({ ...DEFAULT_OPTIONS });
const loaded = ref(false);
const activeKey = ref("1");

onMounted(async () => {
  Object.assign(options, await getOptions());
  loaded.value = true;
});

watch(
  options,
  async (val) => {
    try {
      // reactive 프록시는 Firefox에서 복제되지 않으므로 일반 객체로 저장
      await browser.storage.local.set({ [STORAGE_KEY]: { ...val } });
    } catch (e) {}
  },
  { deep: true },
);

// 자식 컴포넌트에서 옵션 업데이트 시
const updateOptions = (newOptions: Partial<Options>) => {
  Object.assign(options, newOptions);
};
</script>

<template>
  <div w="full" v-if="loaded">
    <a-tabs v-model:activeKey="activeKey">
      <a-tab-pane key="1" tab="기능">
        <div class="panel-scroll">
          <FunctionContent :options="options" @update:options="updateOptions" />
        </div>
      </a-tab-pane>
      <a-tab-pane key="2" tab="모양">
        <div class="panel-scroll">
          <DesignContent :options="options" @update:options="updateOptions" />
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style lang="scss" scoped>
.panel-scroll {
  max-height: 300px;
  overflow-y: scroll;
  padding: 8px 8px 20px 4px;

  // 커스텀 스크롤바
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

</style>
