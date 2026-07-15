module.exports = [
  {
    name: "super_admin",
    displayName: "Super Admin",
    description: "Has complete access to the system.",
    permissions: ["*"],
  },

  {
    name: "admin",
    displayName: "Administrator",
    description: "Manages users and tourism data.",
    permissions: [
      "user:create",
      "user:read",
      "user:update",
      "user:delete",

      "trip:create",
      "trip:read",
      "trip:update",
      "trip:delete",

      "destination:create",
      "destination:read",
      "destination:update",
      "destination:delete",

      "hotel:create",
      "hotel:read",
      "hotel:update",
      "hotel:delete",

      "restaurant:create",
      "restaurant:read",
      "restaurant:update",
      "restaurant:delete",

      "notification:create",
      "notification:read",
      "notification:update",
      "notification:delete",
    ],
  },

  {
    name: "guide",
    displayName: "Tour Guide",
    description: "Can manage assigned trips.",
    permissions: [
      "trip:read",
      "trip:update",
      "destination:read",
    ],
  },

  {
    name: "vendor",
    displayName: "Vendor",
    description: "Can manage hotels and restaurants.",
    permissions: [
      "hotel:create",
      "hotel:read",
      "hotel:update",

      "restaurant:create",
      "restaurant:read",
      "restaurant:update",
    ],
  },

  {
    name: "user",
    displayName: "Traveler",
    description: "Regular application user.",
    permissions: [
      "trip:read",
      "destination:read",
      "hotel:read",
      "restaurant:read",
    ],
  },
];