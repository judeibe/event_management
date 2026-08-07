/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

const serializeMeta = (meta?: LogMeta): LogMeta | undefined => {
  if (!meta) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (value instanceof Error) {
        return [key, { message: value.message, name: value.name, stack: value.stack }];
      }

      return [key, value];
    }),
  );
};

const writeLog = (level: LogLevel, message: string, meta?: LogMeta): void => {
  const entry = {
    level,
    message,
    meta: serializeMeta(meta),
    timestamp: new Date().toISOString(),
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
};

export const logger = {
  debug: (message: string, meta?: LogMeta): void => writeLog('debug', message, meta),
  error: (message: string, meta?: LogMeta): void => writeLog('error', message, meta),
  info: (message: string, meta?: LogMeta): void => writeLog('info', message, meta),
  warn: (message: string, meta?: LogMeta): void => writeLog('warn', message, meta),
};
