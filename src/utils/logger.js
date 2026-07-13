// src/utils/logger.js

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

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

const transports = [
    new winston.transports.Console({
        format: format,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
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
    }),
];

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    levels,
    transports,
    exitOnError: false,
});

// Stream for Morgan
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

// Create child logger with request ID
logger.withRequest = (req) => {
    return logger.child({ requestId: req.id });
};

module.exports = logger;