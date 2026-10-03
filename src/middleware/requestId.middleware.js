const { randomUUID } = require('crypto');

const requestIdMiddleware = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.locals.requestId = requestId;
    next();
};

module.exports = requestIdMiddleware;