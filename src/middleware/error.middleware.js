
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants');
const errorHandler = (err, req, res, next) => {
    const log = logger.withRequest(req);
    
    log.error(`Error: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || ERROR_MESSAGES.INTERNAL_ERROR,
        requestId: req.id,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;