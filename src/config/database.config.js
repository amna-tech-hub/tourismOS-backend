// src/config/database.config.js

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./env.config');
const { startGeocodingJob } = require('../jobs/geocode.job');

// Import plugins
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');

// Apply plugins globally ONCE at file load (outside connectDB function)
mongoose.plugin(mongoosePaginate);
mongoose.plugin(mongooseDelete, { 
    overrideMethods: 'all',
    deletedAt: true,
});

/**
 * Database connection options optimized for Vercel Serverless
 */
const options = {
    bufferCommands: false, // Prevents 10s silent timeouts; fails fast with exact error
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
};

/**
 * Connect to MongoDB with Connection Caching
 */
const connectDB = async () => {
    // 1. If already connected, reuse existing connection
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    try {
        const conn = await mongoose.connect(config.database.uri, options);
        logger.info('✅ MongoDB connected successfully');

        // Only start background jobs in traditional local/EC2 server mode, NOT on Vercel
        if (!process.env.VERCEL) {
            startGeocodingJob();
        }

        return conn;
    } catch (error) {
        logger.error(`❌ MongoDB Connection Error: ${error.message}`);
        throw error;
    }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected successfully');
    } catch (error) {
        logger.error(`Error disconnecting MongoDB: ${error.message}`);
        throw error;
    }
};

module.exports = {
    connectDB,
    disconnectDB,
};