module.exports = [
  {
    name: "super_admin",
    displayName: "Super Admin",
    description: "Has complete access to the system.",
    // permissions: ["*"],
  },


  {
    name: "Company",
    displayName: "Travel Agency",
    description: "Can manage and create trips.",
    // permissions: [
    //   "trip:read",
    //   "trip:update",
    //   "destination:read",
    // ],
  },

  {
    name: "user",
    displayName: "Traveler",
    description: "Regular application user.",
    // permissions: [
    //   "trip:read",
    //   "destination:read",
    //   "hotel:read",
    //   "restaurant:read",
    // ],
  },
];