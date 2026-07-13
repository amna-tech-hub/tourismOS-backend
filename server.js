// server.js

const config = require('./src/config/env.config');
const app = require('./src/app');

const PORT = config.port;

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`📁 API: http://localhost:${PORT}/api/v1/health`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
});