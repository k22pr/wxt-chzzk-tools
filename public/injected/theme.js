const colorMap = {
  primary: {
    primary: "#00f889",
    week: "#00f889",
  },
  gray: {
    primary: "#d9d9d9",
    week: "#d9d9d9",
  },
  red: {
    primary: "#fa5252",
    week: "#c64141",
    dark: "#ad3838",
  },
  orange: {
    primary: "#ff922b",
    week: "#ff922b",
    dark: "#b2661e",
  },
  yellow: {
    primary: "#fab005",
    week: "#fab005",
    dark: "#ad7a03",
  },
  blue: {
    primary: "#339af0",
    week: "#2879bd",
    dark: "#2268a3",
  },
  violet: {
    primary: "#845ef7",
    week: "#845ef7",
    dark: "#5b40aa",
  },
  pink: {
    primary: "#f06595",
    week: "#f06595",
    dark: "#a34465",
  },
};

(function () {
  // 중복 주입 가드
  // try {
  //   if (window.__CHZZK_TOOLS_THEME_LOADED__) return;
  //   window.__CHZZK_TOOLS_THEME_LOADED__ = true;
  // } catch (e) {
  //   console.error("chzzk-tools", e);
  // }

  // // /live/* 페이지만 동작
  // try {
  //   const path = location.pathname || "";
  //   if (!/^\/live\//.test(path)) return;
  // } catch (e) {
  //   console.error("chzzk-tools", _);
  // }

  // 타겟 원본 색상과 비교용 RGB
  const TARGET_HEX = "#00f889";
  const TARGET_RGB = "rgb(0, 248, 137)"; // #00f889

  // 현재 스크립트로부터 초기 색상 읽기
  const currentScript = document.currentScript;
  const triggerElement = document.getElementById("chzzk-tools-trigger");
  // let currentColor =
  //   (currentScript && currentScript.getAttribute("data-color")) || TARGET_HEX;
  // const currentColor = "#ff6b6b";

  console.log("triggerElement", triggerElement);
  const currentColor = colorMap[triggerElement.getAttribute("theme-name")];
  if (!currentColor) currentColor = colorMap.primary;
  console.log("chzzk-tools", currentColor);

  // HEX 유효성 검사
  function isHex(c) {
    return (
      typeof c === "string" &&
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.trim())
    );
  }

  // rgb()/rgba() 문자열 정규화
  function normRgb(v) {
    return (v || "").replace(/\s+/g, "").toLowerCase();
  }

  function hexToRgb(hex, asString = true) {
    try {
      if (!isHex(hex)) return null; // 유효성 체크
      let c = hex.trim().replace(/^#/, "");
      if (c.length === 3) {
        // #RGB -> #RRGGBB 확장
        c = c
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      const num = parseInt(c, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return asString ? `rgb(${r}, ${g}, ${b})` : { r, g, b };
    } catch (_) {
      return null;
    }
  }

  // 요소 한 개에 대해 필요한 속성만 교체
  function recolorElement(el, toHex) {
    try {
      const cs = getComputedStyle(el);
      const to = toHex;
      const color = normRgb(cs.color);
      const bg = normRgb(cs.backgroundColor);
      const border = normRgb(cs.borderColor);
      const outline = normRgb(cs.outlineColor);

      // 기존에 우리가 색을 적용했었다면 항상 최신 값으로 갱신
      if (el.hasAttribute("data-ct-recolored")) {
        el.style.color && (el.style.color = to);
        el.style.backgroundColor && (el.style.backgroundColor = to);
        el.style.borderColor && (el.style.borderColor = to);
        el.style.outlineColor && (el.style.outlineColor = to);
        return;
      }

      // console.log(
      //   el,
      //   el.style.color,
      //   el.style.backgroundColor,
      //   el.style.borderColor,
      //   el.style.outlineColor
      // );

      let changed = false;
      if (color === normRgb(TARGET_RGB)) {
        console.log("catch color", el, el.style.color, to);
        el.style.color = to;
        changed = true;
      }
      if (bg === normRgb(TARGET_RGB)) {
        console.log("catch bg", el, el.style.backgroundColor, to);
        el.style.backgroundColor = to;
        changed = true;
      }
      if (border === normRgb(TARGET_RGB)) {
        console.log("catch border", el, el.style.borderColor, to);
        el.style.borderColor = to;
        changed = true;
      }
      if (outline === normRgb(TARGET_RGB)) {
        console.log("catch outline", el, el.style.outlineColor, to);
        el.style.outlineColor = to;
        changed = true;
      }
      if (changed) el.setAttribute("data-ct-recolored", "1");
    } catch (_) {}
  }

  // 서브트리 전체 스캔
  function scan(root, toHex) {
    if (!root || !(root instanceof Element)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node = root;
    recolorElement(node, toHex);
    while ((node = walker.nextNode())) {
      recolorElement(node, toHex);
    }
  }

  // 초기 실행
  // if (!isHex(currentColor)) currentColor = TARGET_HEX;
  // scan(document.body || document.documentElement, currentColor);
  // 페이지 전역 CSS 변수 강제 오버라이드
  try {
    document.documentElement.style.setProperty(
      "--chzzk-tools-primary-02",
      currentColor.primary,
      "important"
    );
    document.documentElement.style.setProperty(
      "--chzzk-tools-primary-week",
      currentColor.week,
      "important"
    );
    document.documentElement.style.setProperty(
      "--chzzk-tools-primary-rgb",
      Object.values(hexToRgb(currentColor.primary, false)).join(", "),
      "important"
    );
    document.documentElement.style.setProperty(
      "--chzzk-tools-primary-dark",
      currentColor.dark,
      "important"
    );
  } catch (_) {}

  // DOM 변경 대응
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "childList") {
        m.addedNodes &&
          m.addedNodes.forEach((n) => {
            if (n && n.nodeType === 1) scan(n, currentColor.primary);
          });
      } else if (m.type === "attributes") {
        if (m.target && m.target.nodeType === 1)
          recolorElement(m.target, currentColor.primary);
      }
    }
  });
  try {
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  } catch (_) {}

  // 메시지로 색상 갱신
  window.addEventListener("message", (ev) => {
    try {
      const data = ev && ev.data && ev.data.__CHZZK_TOOLS__;
      if (!data) return;
      if (data.type === "SET_PRIMARY_COLOR") {
        const next = data.payload && data.payload.colorPrimary;
        if (isHex(next) && next !== currentColor) {
          currentColor = next;
          // scan(document.body || document.documentElement, currentColor);
          // 변수 재적용
          try {
            document.documentElement.style.setProperty(
              "--chzzk-tools-primary-02",
              currentColor.primary,
              "important"
            );
            document.documentElement.style.setProperty(
              "--chzzk-tools-primary-week",
              currentColor.week,
              "important"
            );
            document.documentElement.style.setProperty(
              "--chzzk-tools-primary-rgb",
              hexToRgb(currentColor.primary, false),
              "important"
            );
            document.documentElement.style.setProperty(
              "--chzzk-tools-primary-dark",
              currentColor.dark,
              "important"
            );
          } catch (_) {}
        }
      }
    } catch (_) {}
  });
})();
