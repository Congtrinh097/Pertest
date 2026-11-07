/**
 * Structured Logger for k6 execution.
 * Supports log levels: DEBUG, INFO, WARN, ERROR.
 * Can be controlled via __ENV.LOG_LEVEL (default: INFO).
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevelName = (__ENV.LOG_LEVEL || 'INFO').toUpperCase();
const currentLevel = LOG_LEVELS[currentLevelName] !== undefined ? LOG_LEVELS[currentLevelName] : LOG_LEVELS.INFO;

function formatMessage(level, message, context = null) {
  const vuId = typeof __VU !== 'undefined' ? __VU : 0;
  const iterId = typeof __ITER !== 'undefined' ? __ITER : 0;
  const timestamp = new Date().toISOString();
  let ctxString = '';

  if (context) {
    try {
      ctxString = ` | Context: ${JSON.stringify(context)}`;
    } catch (_) {
      ctxString = ` | Context: [Unstringifiable]`;
    }
  }

  return `[${timestamp}] [${level}] [VU: ${vuId} | Iter: ${iterId}] ${message}${ctxString}`;
}

export const logger = {
  debug: (message, context) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', message, context));
    }
  },
  info: (message, context) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, context));
    }
  },
  warn: (message, context) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, context));
    }
  },
  error: (message, context) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, context));
    }
  },
};

export default logger;
