const Permission = require("../models/Permission.model");
const permissions = require("./data/permissions");

async function seedPermissions() {
  console.log(" Seeding Permissions...");

  for (const permission of permissions) {
    await Permission.updateOne(
      { name: permission.name }, // Find by unique name
      { $set: permission }, // Update if found
      { upsert: true } // Insert if not found
    );
  }

  console.log(" Permissions seeded successfully.");
}

module.exports = seedPermissions;