<script lang="ts" setup>
import { theme } from "ant-design-vue";
import OptionContent from "@/components/OptionContent.vue";

import packageJson from "../../package.json";

const version = packageJson.version;
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
    <div w="full" py="2">
      <div w="full" grid gap="2" flex items="center" mt="pt" py="2" px="4">
        <img src="@/assets/logo.svg" class="logo vue" w="32px" />
        <div flex items="end" gap="2">
          <div text="20px center" font="medium">Pzzk Tools</div>
          <div text="xs gray-6" font="mono">v{{ version }}</div>
        </div>
      </div>
      <div w="full" px="4">
        <OptionContent />
      </div>
    </div>
  </a-config-provider>
</template>

<style scoped lang="scss">
.logo {
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
