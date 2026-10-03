const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Strictly detect serverless or production environments
const isServerless = 
  !!process.env.VERCEL || 
  !!process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.NODE_ENV === 'production';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format((info) => {
    if (info.requestId) {
      info.message = `[${info.requestId}] ${info.message}`;
    }
    return info;
  })(),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Always log to Console
const transports = [
  new winston.transports.Console({
    format: format,
    level: isServerless ? 'info' : 'debug',
  }),
];

// ONLY create directory and write to files if NOT running in serverless/Vercel
if (!isServerless) {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      })
    );
  } catch (err) {
    console.warn('Skipping file transports due to filesystem restriction:', err.message);
  }
}

const logger = winston.createLogger({
  level: isServerless ? 'info' : 'debug',
  levels,
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

logger.withRequest = (req) => {
  return logger.child({ requestId: req.id });
};

module.exports = logger;