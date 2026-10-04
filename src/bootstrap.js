// src/bootstrap.js

const mongoose = require('mongoose');
const logger = require('./utils/logger');
const config = require('./config/env.config');
const { connectDB } = require('./config/database.config');

/**
 * Application Bootstrap
 * Initializes services before starting the server
 */
class AppBootstrap {
    constructor() {
        this.isShuttingDown = false;
        this.isInitialized = false;
    }

    /**
     * Initialize all services (skips if already connected)
     */
    async initialize() {
        if (this.isInitialized && mongoose.connection.readyState === 1) {
            return true;
        }

        try {
            logger.info('Starting application bootstrap...');
            logger.info(`Environment: ${config.nodeEnv}`);

            // Step 1: Log environment info
            this.logEnvironmentInfo();

            // Step 2: Connect to Database
            await this.initializeDatabase();

            this.isInitialized = true;
            logger.info('Application bootstrap completed successfully!');
            return true;
        } catch (error) {
            logger.error(`❌ Bootstrap failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Log environment information
     */
    logEnvironmentInfo() {
        logger.info('Environment Configuration:');
        logger.info(`   Port: ${config.port}`);
        logger.info(`   Environment: ${config.nodeEnv}`);
        logger.info(`   Database: ${config.database.uri ? 'Configured' : 'Missing'}`);
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        try {
            // Connect to MongoDB
            await connectDB();
            return true;
        } catch (error) {
            logger.error(`Database initialization failed: ${error.message}`);
            throw new Error(`Database unavailable: ${error.message}`);
        }
    }

    /**
     * Graceful Shutdown
     */
    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        logger.info('Starting graceful shutdown...');

        try {
            if (mongoose.connection.readyState === 1) {
                await mongoose.disconnect();
                logger.info('✅ Database disconnected');
            }
            logger.info('✅ Graceful shutdown completed');
        } catch (error) {
            logger.error(`Shutdown error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Export singleton instance
module.exports = new AppBootstrap();