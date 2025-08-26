import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue", "@wxt-dev/unocss"],
  unocss: {
    // Exclude unocss from running for the background
    excludeEntrypoints: ["background"],
  },
});
