const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const Role = require("../models/Role.model"); // If roles are stored in a separate collection
require("dotenv").config();

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Fetch Super Admin Role (if you use a Role model)
        let superAdminRole = await Role.findOne({ name: "super_admin" });
        
        // If roles aren't seeded yet, fallback or ensure role exists
        if (!superAdminRole) {
            superAdminRole = await Role.create({ name: "super_admin" });
        }

        const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@example.com";
        const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Admin@123456";

        // 2. Check if Super Admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("ℹ️  Super Admin already exists in the database.");
            process.exit(0);
        }

  const saltForPassword = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, saltForPassword);

        // 4. Create Super Admin User
        const superAdmin = await User.create({
            name: "Super Admin",
            email: adminEmail,
            password: hashedPassword, 
            phone: "+923000000000",
            role: superAdminRole._id, 
            
emailVerified: true,
            status: "active",
        });

        console.log("✅ Super Admin created successfully!");
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding Super Admin:", error);
        process.exit(1);
    }
};
module.exports= seedSuperAdmin

