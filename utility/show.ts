const showlog = (type: "log" | "warn" | "error", ...optionalParams: any[]) => {
  if (import.meta.env.DEV) {
    // console[type]("[chzzk-tools]", ...optionalParams);
  }
};

export default {
  log: (...optionalParams: any[]) => showlog("log", ...optionalParams),
  warn: (...optionalParams: any[]) => showlog("warn", ...optionalParams),
  error: (...optionalParams: any[]) => showlog("error", ...optionalParams),
};
