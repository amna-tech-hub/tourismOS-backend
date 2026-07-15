const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../config/database.config");
const config = require("../config/env.config");
const seedPermissions = require("./permissions.seed");
const seedRoles = require("./roles.seed");
async function runSeeder() {
    try {
        await connectDB();

        console.log("Running seeders...");
seedPermissions()
        await seedRoles();

        console.log("Seeding completed.");

        await disconnectDB();

        process.exit(0);
    } catch (error) {
        console.error(error);

        await disconnectDB();

        process.exit(1);
    }
}
runSeeder();