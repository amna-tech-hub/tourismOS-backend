// src/bootstrap.js

const mongoose = require('mongoose');
const logger = require('./utils/logger');
const config = require('./config/env.config');
const { connectDB } = require('./config/database.config');

/**
 * Application Bootstrap
 * Initializes all services before starting the server
 */
class AppBootstrap {
    constructor() {
        this.isShuttingDown = false;
    }

    /**
     * Initialize all services
     */
    async initialize() {
        try {
            logger.info(' Starting application bootstrap...');
            logger.info(` Environment: ${config.nodeEnv}`);

            // Step 1: Log environment info
            this.logEnvironmentInfo();

            // Step 2: Connect to Database
            await this.initializeDatabase();

          
            logger.info('Application bootstrap completed successfully!');
            return true;
        } catch (error) {
            logger.error(`❌ Bootstrap failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Log environment information (just for visibility)
     */
    logEnvironmentInfo() {
        logger.info('Environment Configuration:');
        logger.info(`   Port: ${config.port}`);
        logger.info(`   Environment: ${config.nodeEnv}`);
        logger.info(`   Database: ${config.database.uri ? ' Configured' : 'Missing'}`);
        // logger.info(`   JWT: ${config.jwt.secret ? ' Configured' : ' Missing'}`);
        
        // Log database URI (hide credentials for security)
        if (config.database.uri) {
            const hiddenUri = config.database.uri.replace(/\/\/.*@/, '//*****@');
            logger.info(`   Database URI: ${hiddenUri}`);
        }
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        logger.info(' Connecting to database...');
        
        try {
            // Connect to MongoDB
            await connectDB();
            
            // Log database stats
            // const stats = await mongoose.connection.db.stats();
            // logger.info(` Database connected successfully`);
            // logger.info(`    Collections: ${stats.collections}`);
            // logger.info(`    Documents: ${stats.objects}`);
            // logger.info(`     Database Name: ${mongoose.connection.name}`);
            
            // Test connection with a simple ping
            await mongoose.connection.db.admin().ping();
            logger.info(' Database ping successful');
            
            return true;
        } catch (error) {
            logger.error(` Database initialization failed: ${error.message}`);
            throw new Error(`Database unavailable: ${error.message}`);
        }
    }

//    cleaning
    async shutdown() {
        if (this.isShuttingDown) {
            return;
        }

        this.isShuttingDown = true;
        logger.info(' Starting graceful shutdown...');

        try {
            // Disconnect from database
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