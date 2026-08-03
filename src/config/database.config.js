// src/config/database.config.js

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./env.config');
const { startGeocodingJob } = require('../jobs/geocode.job')

// Import plugins
const mongoosePaginate = require('mongoose-paginate-v2');
const mongooseDelete = require('mongoose-delete');

/**
 * Database connection options
 */
const options = {
    autoIndex: true,
    autoCreate: true,
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    // Additional options for production
    ...(config.isProduction && {
        maxPoolSize: 20,
        minPoolSize: 5,
    }),
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
    try {
        // Apply plugins globally
        mongoose.plugin(mongoosePaginate);
        mongoose.plugin(mongooseDelete, { 
            overrideMethods: 'all',
            deletedAt: true,
        });
      

        const conn = await mongoose.connect(config.database.uri, options);
        
     startGeocodingJob()

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        logger.error(` MongoDB Connection Error: ${error.message}`);
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