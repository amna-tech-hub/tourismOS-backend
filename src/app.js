// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config/env.config');
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


 const adminRoutes =require('./routes/admin-routes/superadmin.routes')
//  const aiRoutes=require('./routes/ai.routes')
  const authRoutes=require('./routes/auth.routes')
const companyRoutes=require('./routes/company-routes/company-admin.routes')
const companyEmployeeRoutes=require('./routes/company-routes/employee.routes')
const tourRoutes=require('./routes/tour.route')
const uploadRouter=require('./routes/upload.routes')
const travellerBookingRoutes=require('./routes/traveler/booking.routes')
const companyBookingRoutes=require('./routes/company-routes/booking.routes')
const notificationRoutes=require('./routes/notification.routes')
const reviewRoutes=require('./routes/traveler/review.routes')

// API Routes
// app.use('/api/ai', aiRoutes);
app.use('/api/admin',adminRoutes)
app.use('/api/auth',authRoutes)
app.use('/api/company',companyRoutes)
app.use('/api/company/employees',companyEmployeeRoutes)
app.use('/api/tours',tourRoutes)
app.use("/api/upload", uploadRouter);
app.use("/api", travellerBookingRoutes);
app.use("/company/bookings", companyBookingRoutes);
app.use("/api/notification",notificationRoutes)
app.use("/api/tour/review",reviewRoutes)

// Health Check 
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