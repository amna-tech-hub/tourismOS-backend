// server.js
const app = require("./src/app");
const config = require("./src/config/env.config");
const bootstrap = require("./src/bootstrap");

// Express Middleware: Ensures DB is connected before ANY route executes
app.use(async (req, res, next) => {
    try {
        await bootstrap.initialize();
        next();
    } catch (err) {
        next(err);
    }
});

// Start server locally
if (!process.env.VERCEL) {
    bootstrap.initialize().then(() => {
        app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
        });
    }).catch(console.error);
}

module.exports = app;