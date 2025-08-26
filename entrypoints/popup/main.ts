import "virtual:uno.css";
import { createApp } from "vue";
import App from "./App.vue";
import "ant-design-vue/dist/reset.css";

import Antd from "ant-design-vue";
import "./style.scss";

createApp(App).use(Antd).mount("#app");
