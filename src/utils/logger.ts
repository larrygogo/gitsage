/**
 * 分级日志模块
 * 生产环境仅输出 warn 及以上级别
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const IS_PROD = import.meta.env.PROD;
const MIN_LEVEL: LogLevel = IS_PROD ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatTag(tag: string): string {
  return `[${tag}]`;
}

export const logger = {
  debug(tag: string, ...args: unknown[]) {
    if (shouldLog("debug")) {
      console.log(formatTag(tag), ...args);
    }
  },

  info(tag: string, ...args: unknown[]) {
    if (shouldLog("info")) {
      console.log(formatTag(tag), ...args);
    }
  },

  warn(tag: string, ...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(formatTag(tag), ...args);
    }
  },

  error(tag: string, ...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatTag(tag), ...args);
    }
  },
};
