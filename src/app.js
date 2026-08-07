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

const app = express();

// Security & Performance Middleware
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
    })
);
app.use(cors({
    origin:true,
    //  process.env.CORS_ORIGIN ||'http://localhost:5173' ,
    credentials: true,
}));
app.use(compression());
app.use(requestIdMiddleware);
app.use(morgan('dev', { stream: logger.stream }));
app.use(cookieParser());

// 1. STRIPE WEBHOOK ROUTE 
const paymentController = require("./controllers/payment.controller");

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
const adminRoutes = require('./routes/admin-routes/superadmin.routes');
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company-routes/company-admin.routes');
const companyEmployeeRoutes = require('./routes/company-routes/employee.routes');
const tourRoutes = require('./routes/tour.route');
const uploadRouter = require('./routes/upload.routes');
const travellerBookingRoutes = require('./routes/traveler/booking.routes');
const companyBookingRoutes = require('./routes/company-routes/booking.routes');
const notificationRoutes = require('./routes/notification.routes');
const reviewRoutes = require('./routes/traveler/review.routes');
const paymentRoutes = require('./routes/payment.routes');
const travelJournal=require('./routes/travelJournal.routes')
const subscriptionPlan=require('./routes/subscriptionPlan.routes')
const subscriptionCheckout=require('./routes/subscription.routes')

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/company/employees', companyEmployeeRoutes);
app.use('/api/tours', tourRoutes);
app.use("/api/upload", uploadRouter);
app.use("/api/subscription",subscriptionCheckout);
app.use("/api/plans", subscriptionPlan);
app.use("/api", travellerBookingRoutes);
app.use("/company/bookings", companyBookingRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/tour/review", reviewRoutes);
app.use("/api/travel-journals", travelJournal);
app.use("/api/payments", paymentRoutes);

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

// Routes
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
    logger.error("Route not found");
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestId: req.id,
    });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;