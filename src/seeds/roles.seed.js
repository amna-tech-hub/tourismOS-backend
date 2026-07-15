const Role = require("../models/Role.model");
const Permission = require("../models/Permission.model");

const roles = require("./data/roles");

async function seedRoles() {
  console.log(" Seeding Roles...");

  for (const role of roles) {
    let permissionIds = [];

    // Super Admin gets every permission
    if (role.permissions.includes("*")) {
      const allPermissions = await Permission.find({}, "_id");

      permissionIds = allPermissions.map(permission => permission._id);
    } else {
      const permissions = await Permission.find({
        name: { $in: role.permissions },
      });

      permissionIds = permissions.map(permission => permission._id);
    }

    await Role.updateOne(
      { name: role.name },
      {
        $set: {
          displayName: role.displayName,
          description: role.description,
          permissions: permissionIds,
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