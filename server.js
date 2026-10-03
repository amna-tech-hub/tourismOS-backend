const app = require("./src/app");
const config = require("./src/config/env.config");
const bootstrap = require("./src/bootstrap");

async function startServer() {
    try {
        await bootstrap.initialize();

        // Only start HTTP listener locally, not in Vercel serverless
        if (!process.env.VERCEL) {
            app.listen(config.port, () => {
                console.log(`Server running on port ${config.port}`);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

startServer();

// EXPORT APP FOR VERCEL
module.exports = app;