import { createContext, useContext, type Accessor } from "solid-js";
import zhCN from "./zh-CN.json";
import enUS from "./en-US.json";

const locales: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

function getByPath(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

export interface I18n {
  t: (key: string) => string;
  locale: Accessor<string>;
}

export const I18nContext = createContext<I18n>();

export function createI18n(localeAccessor: Accessor<string>): I18n {
  const t = (key: string): string => {
    const loc = localeAccessor();
    const dict = locales[loc] ?? locales["zh-CN"]!;
    return getByPath(dict as Record<string, unknown>, key);
  };

  return { t, locale: localeAccessor };
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nContext.Provider");
  }
  return ctx;
}
