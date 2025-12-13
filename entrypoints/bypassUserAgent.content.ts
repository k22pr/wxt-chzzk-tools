const NAME = "chzzk-tools";
const spoofedUA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6856.96 Safari/537.36 OPR/114.0.5303.133";

const overload = <T>(
  t: T,
  prop: T extends Navigator ? keyof T | "oscpu" : keyof T,
  value: unknown,
  options: { force?: boolean; configurable?: boolean; writable?: boolean } = {
    force: false,
    configurable: false,
    writable: false,
  }
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
        return "Windows";
      },
      getHighEntropyValues: async (hints: string[]) => {
        const values = await originalUAData.getHighEntropyValues(hints);
        return { ...values, platform: "Windows" };
      },
      toJSON: () => {
        return {
          brands: originalUAData.brands,
          mobile: originalUAData.mobile,
          platform: "Windows",
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

export default defineContentScript({
  matches: ["https://chzzk.naver.com/*"],
  runAt: "document_start",
  world: "MAIN",
  async main() {
    try {
      if (navigator.userAgent.includes("Windows")) {
        patchNavigator(navigator);
        console.log(
          `[${NAME}] UserAgent & Platform spoofed to Mac`,
          navigator.userAgent
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
