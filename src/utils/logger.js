const winston = require('winston');
const path = require('path');

// Strictly check if running on Vercel or production serverless
const isServerless = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

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

// Console transport only (safe for Vercel)
const transports = [
    new winston.transports.Console({
        format: format,
        level: isServerless ? 'info' : 'debug',
    }),
];

// ONLY load 'fs' and file transports if NOT running on Vercel
if (!isServerless) {
    const fs = require('fs');
    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const fileFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    );

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