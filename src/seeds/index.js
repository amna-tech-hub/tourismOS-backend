const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../config/database.config");
const config = require("../config/env.config");
const seedRoles = require("./roles.seed");
const seedSuperAdmin=require('./admin.seed')
async function runSeeder() {
    try {
        await connectDB();

        console.log("Running seeders...");
        await seedRoles();
         await seedSuperAdmin();
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