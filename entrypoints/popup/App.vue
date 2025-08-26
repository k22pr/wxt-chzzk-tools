<script lang="ts" setup>
import { theme } from "ant-design-vue";
import OptionContent from "@/components/OptionContent.vue";
</script>

<template>
  <a-config-provider
    :theme="{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#00f889',
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
      <div w="full" px="4">
        <OptionContent />
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
