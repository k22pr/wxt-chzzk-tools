import { STORAGE_KEY } from "@/constants";
import { storage } from "wxt/utils/storage";

let cssLink: HTMLLinkElement | null = null;
let triggerElement: HTMLDivElement | null = null;

let installed = {
  liveBar: false,
  autoQuality: false,
  streamDesign: false,
};

function injectPublicScript(file: string, attrs: Record<string, string> = {}) {
  try {
    const url = browser.runtime.getURL(`injected/${file}` as any);
    const s = document.createElement("script");
    s.src = url;
    s.async = false;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {
    console.error(e);
  }
}

function injectPublicStyle(file: string) {
  try {
    if (cssLink) return; // 중복 방지
    const url = browser.runtime.getURL(`injected/${file}` as any);
    cssLink = document.createElement("link");
    cssLink.id = "chzzk-tools-style";
    cssLink.rel = "stylesheet";
    cssLink.href = url;
    (document.head || document.documentElement).appendChild(cssLink);
  } catch (e) {
    console.error(e);
  }
}

function removePublicStyle() {
  try {
    cssLink?.remove();
    cssLink = null;
  } catch (e) {
    console.error(e);
  }
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  async main() {
    triggerElement = document.createElement("div");
    triggerElement.id = "chzzk-tools-trigger";
    triggerElement.style.display = "none";
    // triggerElement?.setAttribute("installed-live-bar", "false");
    // triggerElement?.setAttribute("installed-auto-quality", "false");
    // triggerElement?.setAttribute("installed-stream-design", "false");
    document.body.appendChild(triggerElement);

    injectPublicStyle("stream-design.css");
    injectPublicScript("stream-design.js");
  },
});

// export default defineContentScript({
//   matches: ["https://chzzk.naver.com/*"],
//   async main() {
//     cssLink = document.createElement("link");
//     triggerElement = document.createElement("div");
//     triggerElement.id = "chzzk-tools-trigger";
//     triggerElement.style.display = "none";
//     // triggerElement?.setAttribute("installed-live-bar", "false");
//     // triggerElement?.setAttribute("installed-auto-quality", "false");
//     // triggerElement?.setAttribute("installed-stream-design", "false");
//     document.body.appendChild(triggerElement);

//     // 옵션을 읽어 페이지로 postMessage 전달
//     let options = await storage.getItem(`local:${STORAGE_KEY}`);
//     if (!options) {
//       options = {
//         useStreamDesign: false,
//         useAutoQuality: true,
//         useLiveBar: true,
//       };
//     }
//     // public/injected/* 자산을 페이지에 주입하는 유틸
//     function injectPublicScript(
//       file: string,
//       attrs: Record<string, string> = {}
//     ) {
//       const url = browser.runtime.getURL(`injected/${file}` as any);
//       const s = document.createElement("script");
//       s.src = url;
//       s.async = false;
//       Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
//       (document.head || document.documentElement).appendChild(s);
//       s.remove();
//     }

//     function injectPublicStyle(file: string) {
//       if (cssLink) return; // 중복 방지
//       const url = browser.runtime.getURL(`injected/${file}` as any);
//       cssLink = document.createElement("link");
//       cssLink.id = "chzzk-tools-style";
//       cssLink.rel = "stylesheet";
//       cssLink.href = url;
//       (document.head || document.documentElement).appendChild(cssLink);
//     }

//     function removePublicStyle() {
//       cssLink?.remove();
//       cssLink = null;
//     }

//     function postPageMessage(type: string, payload?: any) {
//       window.postMessage({ __CHZZK_TOOLS__: { type, payload } }, "*");
//     }

//     async function sendOptionData(data: any) {
//       triggerElement?.setAttribute(
//         "live-bar",
//         data?.useLiveBar ? "true" : "false"
//       );
//       triggerElement?.setAttribute(
//         "auto-quality",
//         data?.useAutoQuality ? "true" : "false"
//       );
//       triggerElement?.setAttribute(
//         "stream-design",
//         data?.useStreamDesign ? "true" : "false"
//       );

//       console.log(installed);

//       // Live Bar
//       if (data?.useLiveBar && !installed.liveBar) {
//         injectPublicScript("live-bar.js");
//         installed.liveBar = true;
//         // postPageMessage("ENABLE_LIVE_BAR");
//       } else {
//         // postPageMessage("DISABLE_LIVE_BAR");
//       }

//       // Auto Quality
//       if (data?.useAutoQuality && !installed.autoQuality) {
//         injectPublicScript("auto-quality.js");
//         installed.autoQuality = true;
//         // postPageMessage("ENABLE_AUTO_QUALITY");
//       } else {
//         // postPageMessage("DISABLE_AUTO_QUALITY");
//       }

//       // Stream Design (CSS + optional JS)
//       if (data?.useStreamDesign) {
//         injectPublicStyle("stream-design.css");
//         injectPublicScript("stream-design.js");

//         if (!installed.streamDesign) {
//           console.log(data);
//           // injectPublicScript("stream-design.js");
//           installed.streamDesign = true;
//           // postPageMessage("ENABLE_STREAM_DESIGN");
//         }
//       } else {
//         removePublicStyle();
//       }
//     }

//     sendOptionData(options);

//     // 실시간 변경 반영: storage 변경을 페이지로 계속 포워딩
//     browser.storage.onChanged.addListener((changes, area) => {
//       if (changes[STORAGE_KEY]) {
//         const newVal = changes[STORAGE_KEY].newValue ?? {};
//         sendOptionData(newVal);
//       }
//     });

//     (async function () {
//       let options = await storage.getItem(`local:${STORAGE_KEY}`);
//       const fireLoc = () => setTimeout(() => sendOptionData(options), 0);
//       const _ps = history.pushState,
//         _rs = history.replaceState;
//       history.pushState = function () {
//         const r = _ps.apply(this, arguments as any);
//         fireLoc();
//         return r;
//       };
//       history.replaceState = function () {
//         const r = _rs.apply(this, arguments as any);
//         fireLoc();
//         return r;
//       };
//       window.addEventListener("popstate", fireLoc);
//     })();
//   },
// });
