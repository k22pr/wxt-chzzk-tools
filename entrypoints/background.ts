export default defineBackground(() => {
  const updateIcon = (tabId: number, url: string | undefined) => {
    if (url && url.startsWith("https://chzzk.naver.com/")) {
      browser.action.setIcon({
        tabId,
        path: {
          32: "/icon/32.png",
          128: "/icon/128.png",
        },
      });
    } else {
      browser.action.setIcon({
        tabId,
        path: {
          32: "/icon/32_gray.png",
          128: "/icon/128_gray.png",
        },
      });
    }
  };

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      updateIcon(tabId, tab.url);
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    updateIcon(activeInfo.tabId, tab.url);
  });
});
