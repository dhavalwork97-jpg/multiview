type LogContext = Record<string, unknown>;

function serialize(context?: LogContext) {
  if (!context || Object.keys(context).length === 0) return "";

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return " {\"context\":\"unserializable\"}";
  }
}

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const line = `[fgc:${level}] ${message}${serialize(context)}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const serverLogger = {
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
};
