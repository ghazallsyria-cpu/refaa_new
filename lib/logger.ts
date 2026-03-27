// lib/logger.ts
// نظام تسجيل آمن للإنتاج — يُعطَّل في بيئة الإنتاج

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, ...args: unknown[]) {
  if (!isDev && level !== 'error') return;

  const prefix = {
    info:  '[INFO]',
    warn:  '[WARN]',
    error: '[ERROR]',
    debug: '[DEBUG]',
  }[level];

  switch (level) {
    case 'error':
      console.error(`${prefix} ${message}`, ...args);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, ...args);
      break;
    default:
      console.log(`${prefix} ${message}`, ...args);
  }
}

export const logger = {
  info:  (msg: string, ...args: unknown[]) => log('info',  msg, ...args),
  warn:  (msg: string, ...args: unknown[]) => log('warn',  msg, ...args),
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
};
