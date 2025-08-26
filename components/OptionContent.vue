<script lang="ts" setup>
import { ref } from "vue";

const options = reactive({
  useStreamDesign: true,
  useAutoQuality: true,
  useLiveBar: true,
});

const toggleOption = (
  option: "useStreamDesign" | "useAutoQuality" | "useLiveBar"
) => {
  options[option] = !options[option];
};
</script>

<template>
  <div w="full" grid gap="4">
    <div w="full">
      <div w="full" flex items="center" justify="between">
        <div text="4">방송화면 디자인</div>
        <div>
          <a-switch v-model:checked="options.useStreamDesign" />
        </div>
      </div>
      <div text="3 gray-5">방송화면에 집중할 수 있도록 UI를 변경합니다.</div>
    </div>
    <div w="full">
      <div w="full" flex items="center" class="flex" justify="between">
        <div text="4">자동 화질변경</div>
        <div>
          <a-switch v-model:checked="options.useAutoQuality" />
        </div>
      </div>
      <div text="3 gray-5">광고 차단시 화질이 낮아지는 문제를 해결합니다.</div>
    </div>
    <div w="full">
      <div w="full" flex items="center" justify="between">
        <div text="4">LIVE 재생바</div>
        <div>
          <a-switch v-model:checked="options.useLiveBar" />
        </div>
      </div>
      <div text="3 gray-5">
        방송 접속시점부터 최대 1분30초간 재생바를 제공합니다.
      </div>
    </div>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
