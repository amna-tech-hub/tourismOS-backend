// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config/env.config');
const routes = require('./routes');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const errorHandler = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Import logger 
//i will do later 
const app = express();

// Security & Performance Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(compression());
// Request ID Middleware (
app.use(requestIdMiddleware);

app.use(morgan('dev',{stream:logger.stream}));
app.use(cookieParser());

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));



// API Routes
app.use('/api', routes);

// Health Check (no versioning)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        requestId: req.id,
    });
});
//  Routes
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AI TourismOS API',
        version: '1.0.0',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// 404 Handler
app.use((req, res) => {
    logger.error("Route not found")
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestId: req.id,
    });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;