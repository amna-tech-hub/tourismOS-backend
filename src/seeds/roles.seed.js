const Role = require("../models/Role.model");
const roles = require("./data/roles");

async function seedRoles() {
  console.log(" Seeding Roles...");

  for (const role of roles) {
    await Role.updateOne(
      { name: role.name },
      {
        $set: {
          displayName: role.displayName,
          description: role.description,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log(" Roles seeded successfully.");
}

module.exports = seedRoles;