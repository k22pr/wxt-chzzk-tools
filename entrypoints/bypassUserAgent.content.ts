const NAME = "pzzk-tools";
const spoofedUA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6937.97 Safari/537.36 OPR/115.0.5231.193";

const overload = <T>(
  t: T,
  prop: T extends Navigator ? keyof T | "oscpu" : keyof T,
  value: unknown,
  options: { force?: boolean; configurable?: boolean; writable?: boolean } = {
    force: false,
    configurable: false,
    writable: false,
  },
): void => {
  let target: T = t;

  try {
    while (target !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(target, prop);

      if (descriptor && descriptor.configurable) {
        const newAttributes: PropertyDescriptor = {
          configurable: options.configurable,
          enumerable: true,
        };

        if (descriptor.get) {
          newAttributes.get = () => value;
        } else {
          newAttributes.value = value;
          newAttributes.writable = options.writable;
        }

        Object.defineProperty(target, prop, newAttributes);
      } else if (
        options.force &&
        Object.getPrototypeOf(t) === Object.getPrototypeOf(target)
      ) {
        Object.defineProperty(target, prop, {
          value,
          configurable: options.configurable,
          enumerable: true,
          writable: options.writable,
        });
      }

      target = Object.getPrototypeOf(target);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    // do nothing
  }
};
function patchNavigator(n: Navigator) {
  if (!n || typeof n !== "object" || !("userAgent" in n)) return;

  overload(n, "userAgent", spoofedUA, {
    force: true,
    configurable: true,
    writable: false,
  });

  const anyNav = n as any;
  if (anyNav.userAgentData) {
    const originalUAData = anyNav.userAgentData;
    const spoofedUAData = {
      get brands() {
        return originalUAData.brands;
      },
      get mobile() {
        return originalUAData.mobile;
      },
      get platform() {
        return "macOS";
      },
      getHighEntropyValues: async (hints: string[]) => {
        const values = await originalUAData.getHighEntropyValues(hints);
        return { ...values, platform: "macOS" };
      },
      toJSON: () => {
        return {
          brands: originalUAData.brands,
          mobile: originalUAData.mobile,
          platform: "macOS",
        };
      },
    };

    overload(anyNav, "userAgentData", spoofedUAData, {
      force: true,
      configurable: true,
      writable: false,
    });
  }
}

// fetch 래핑하여 User-Agent 헤더 스푸핑
function patchFetch() {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers);

    // 기존 User-Agent 헤더가 있으면 스푸핑된 값으로 교체
    if (headers.has("User-Agent")) {
      headers.set("User-Agent", spoofedUA);
    }

    const newInit: RequestInit = {
      ...init,
      headers,
    };

    return originalFetch.call(this, input, newInit);
  };
}

// XMLHttpRequest 래핑하여 User-Agent 헤더 스푸핑
function patchXHR() {
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.setRequestHeader = function (
    name: string,
    value: string,
  ) {
    // User-Agent 헤더인 경우 스푸핑된 값으로 교체
    if (name.toLowerCase() === "user-agent") {
      return originalSetRequestHeader.call(this, name, spoofedUA);
    }
    return originalSetRequestHeader.call(this, name, value);
  };
}

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  async main() {
    try {
      if (navigator.userAgent.includes("Windows")) {
        patchNavigator(navigator);
        patchFetch();
        patchXHR();
        console.log(
          `[${NAME}] UserAgent & Platform spoofed to Mac (navigator, fetch, XHR)`,
          navigator.userAgent,
        );
      }
    } catch (e) {
      console.error(`[${NAME}] UserAgent spoof error:`, e);
    }
  },
});

// 임시 비활성화
// (() => {
//   overload(navigator, "userAgent", spoofedUA, {
//     force: true,
//     configurable: true,
//     writable: false,
//   });
// })();
