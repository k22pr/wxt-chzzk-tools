function tryMount() {
  const VIDEO_ELEMENT_NAME = "video.webplayer-internal-video";
  const triggerElement = document.getElementById("chzzk-tools-trigger");
  const useStreamDesign =
    triggerElement.getAttribute("data-use-stream-design") === "true";
  const headerWithClass = document.querySelector(
    'header[class^="header_container__"]'
  );
  const asideWithClass = document.querySelector(
    'aside[class^="aside_container__"]'
  );
  const asideMenuWithClass = asideWithClass.querySelector(
    `div[class^="aside_content__"] > nav:nth-child(2)`
  );
  const videoElement = document.querySelector(VIDEO_ELEMENT_NAME);

  if (!triggerElement) {
    console.log("no trigger element");
    return;
  }
  // videoElement.addEventListener("mouseover", () => {
  //   console.log("mouseover");
  // });
  document.addEventListener("mousemove", () => {
    console.log("mousemove");
    headerWithClass?.classList.add("tool-active");
    asideMenuWithClass?.classList.add("tool-active");
  });

  document.addEventListener("mouseout", () => {
    console.log("mouseout");
    headerWithClass?.classList.remove("tool-active");
    asideMenuWithClass?.classList.remove("tool-active");
  });

  console.log(
    "stream-design.js",
    useStreamDesign,
    headerWithClass,
    asideWithClass,
    asideMenuWithClass
  );
  console.log(useStreamDesign, headerWithClass, triggerElement);
}

(function () {
  console.log("test");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryMount, { once: true });
    console.log("DOMContentLoaded tryMount()");
  } else {
    tryMount();
    console.log("tryMount()");
  }
})();
