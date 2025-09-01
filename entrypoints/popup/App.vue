<script lang="ts" setup>
import { theme } from "ant-design-vue";
import OptionContent from "@/components/OptionContent.vue";
import { storage } from "wxt/utils/storage";
import { STORAGE_KEY } from "@/constants";

// 대표 색상 상태 (기본값)
const colorPrimary = ref<string>("#00f889");

const isLoaded = ref(false);

onMounted(() => {
  // document.addEventListener("contextmenu", function (event) {
  //   event.preventDefault();
  // });

  document.addEventListener("copy", function (event) {
    event.preventDefault();
  });

  document.addEventListener("selectstart", function (event) {
    event.preventDefault();
  });

  // 저장된 옵션에서 색상 초기화
  storage.getItem(`local:${STORAGE_KEY}`).then((saved: any) => {
    if (saved?.colorPrimary && typeof saved.colorPrimary === "string") {
      colorPrimary.value = saved.colorPrimary;
    }
    isLoaded.value = true;
  });
});

// 자식에서 색상 변경 시 테마 즉시 반영
const onUpdateColor = (color: string) => {
  colorPrimary.value = color;
};
</script>

<template>
  <a-config-provider
    :theme="{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: colorPrimary,
      },
    }"
  >
    <!-- <a-watermark
      :height="30"
      :width="130"
      content="Chzzk Tools"
      :gap="[20, 20]"
    > -->
    <div w="full" p="4">
      <div w="full" flex="col" items="center" mb="6">
        <div w="full" text="center" flex justify="center">
          <img
            src="@/assets/logo.svg"
            class="logo vue"
            alt="Vue logo"
            w="54px"
            my="4"
          />
        </div>
        <h1 text="center">Chzzk Tools</h1>
      </div>
      <div w="full" px="4" v-if="isLoaded">
        <OptionContent @update-color="onUpdateColor" />
      </div>
    </div>
    <!-- </a-watermark> -->
  </a-config-provider>
</template>

<style scoped lang="scss">
.logo {
  height: 6em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #54bc4ae0);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
