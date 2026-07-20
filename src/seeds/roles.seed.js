const Role = require("../models/Role.model");
const roles = require("./data/roles");

async function seedRoles() {
  console.log("🌱 Seeding Roles...");

  for (const role of roles) {
    await Role.updateOne(
      { name: role.name },
      {
        $set: {
          displayName: role.displayName,
          description: role.description,
        //  permissions: role.permissions,  Storing raw strings (e.g. ['*'] or ['user:read', 'user:write'])
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("✅ Roles seeded successfully.");
}

module.exports = seedRoles;