// server.js

const app = require("./src/app");
const config = require("./src/config/env.config");
const bootstrap = require("./src/bootstrap");

// Vercel/serverless handler
const handler = async (req, res) => {
    try {
        await bootstrap.initialize();
        return app(req, res);
    } catch (err) {
        console.error("Application initialization failed:", err);

        return res.status(500).json({
            success: false,
            message: "Database connection failed",
        });
    }
};

// Start server locally
if (!process.env.VERCEL) {
    bootstrap.initialize()
        .then(() => {
            app.listen(config.port, () => {
                console.log(`Server running on port ${config.port}`);
            });
        })
        .catch((error) => {
            console.error("Application startup failed:", error);
            process.exit(1);
        });
}

module.exports = handler;