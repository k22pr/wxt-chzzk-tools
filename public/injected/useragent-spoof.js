(function () {
  "use strict";
  const NAME = "chzzk-tools";

  function overload(target, prop, value, options) {
    const opts = {
      force: false,
      configurable: false,
      writable: false,
      ...(options || {}),
    };

    try {
      let t = target;
      while (t !== null) {
        const desc = Object.getOwnPropertyDescriptor(t, prop);
        if (desc && desc.configurable) {
          const attrs = { configurable: opts.configurable, enumerable: true };
          if (desc.get) {
            attrs.get = () => value;
          } else {
            attrs.value = value;
            attrs.writable = opts.writable;
          }
          Object.defineProperty(t, prop, attrs);
        } else if (
          opts.force &&
          Object.getPrototypeOf(target) === Object.getPrototypeOf(t)
        ) {
          Object.defineProperty(t, prop, {
            value,
            configurable: opts.configurable,
            enumerable: true,
            writable: opts.writable,
          });
        }
        t = Object.getPrototypeOf(t);
      }
    } catch (e) {}
  }

  function patchNavigator(n) {
    if (!n || typeof n !== "object" || !("userAgent" in n)) return;

    const spoofedUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 OPR/65.0.3467.48";

    overload(n, "userAgent", spoofedUA, {
      force: true,
      configurable: true,
      writable: false,
    });

    if (n.userAgentData) {
      const originalUAData = n.userAgentData;
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
        getHighEntropyValues: async (hints) => {
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

      overload(n, "userAgentData", spoofedUAData, {
        force: true,
        configurable: true,
        writable: false,
      });
    }
  }

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
})();
