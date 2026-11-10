import "virtual:uno.css";
import { createApp } from "vue";
import App from "./App.vue";
import "ant-design-vue/dist/reset.css";

// 쓰는 컴포넌트만 등록 (전체 등록 시 팝업 번들이 약 1.1MB 커짐). Tabs는 TabPane도 함께 등록함
import { ConfigProvider, Slider, Switch, Tabs } from "ant-design-vue";
import "./style.scss";

createApp(App).use(ConfigProvider).use(Slider).use(Switch).use(Tabs).mount("#app");
