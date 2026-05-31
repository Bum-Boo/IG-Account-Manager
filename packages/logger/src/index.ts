export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function createLogger(level: LogLevel = "info"): Logger {
  const shouldLog = (messageLevel: LogLevel) => levels[messageLevel] >= levels[level];

  return {
    debug: (message, context) => {
      if (shouldLog("debug")) console.debug(message, context ?? {});
    },
    info: (message, context) => {
      if (shouldLog("info")) console.info(message, context ?? {});
    },
    warn: (message, context) => {
      if (shouldLog("warn")) console.warn(message, context ?? {});
    },
    error: (message, context) => {
      if (shouldLog("error")) console.error(message, context ?? {});
    }
  };
}

