const app = require("./src/app");
const config = require("./src/config/env.config");
const bootstrap = require("./src/bootstrap");

async function startServer() {
    try {
        await bootstrap.initialize();

        app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
        });

    } catch (err) {
        console.error(err);
    }
}

startServer();