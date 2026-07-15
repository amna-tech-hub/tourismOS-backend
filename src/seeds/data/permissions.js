module.exports = [
  // ==========================
  // User Permissions
  // ==========================
  {
    name: "user:create",
    resource: "user",
    action: "create",
    description: "Create users",
  },
  {
    name: "user:read",
    resource: "user",
    action: "read",
    description: "View users",
  },
  {
    name: "user:update",
    resource: "user",
    action: "update",
    description: "Update users",
  },
  {
    name: "user:delete",
    resource: "user",
    action: "delete",
    description: "Delete users",
  },

  // ==========================
  // Role Permissions
  // ==========================
  {
    name: "role:create",
    resource: "role",
    action: "create",
    description: "Create roles",
  },
  {
    name: "role:read",
    resource: "role",
    action: "read",
    description: "View roles",
  },
  {
    name: "role:update",
    resource: "role",
    action: "update",
    description: "Update roles",
  },
  {
    name: "role:delete",
    resource: "role",
    action: "delete",
    description: "Delete roles",
  },

  // ==========================
  // Trip Permissions
  // ==========================
  {
    name: "trip:create",
    resource: "trip",
    action: "create",
    description: "Create trips",
  },
  {
    name: "trip:read",
    resource: "trip",
    action: "read",
    description: "View trips",
  },
  {
    name: "trip:update",
    resource: "trip",
    action: "update",
    description: "Update trips",
  },
  {
    name: "trip:delete",
    resource: "trip",
    action: "delete",
    description: "Delete trips",
  },

  // ==========================
  // Destination Permissions
  // ==========================
  {
    name: "destination:create",
    resource: "destination",
    action: "create",
    description: "Create destinations",
  },
  {
    name: "destination:read",
    resource: "destination",
    action: "read",
    description: "View destinations",
  },
  {
    name: "destination:update",
    resource: "destination",
    action: "update",
    description: "Update destinations",
  },
  {
    name: "destination:delete",
    resource: "destination",
    action: "delete",
    description: "Delete destinations",
  },

  // ==========================
  // Hotel Permissions
  // ==========================
  {
    name: "hotel:create",
    resource: "hotel",
    action: "create",
    description: "Create hotels",
  },
  {
    name: "hotel:read",
    resource: "hotel",
    action: "read",
    description: "View hotels",
  },
  {
    name: "hotel:update",
    resource: "hotel",
    action: "update",
    description: "Update hotels",
  },
  {
    name: "hotel:delete",
    resource: "hotel",
    action: "delete",
    description: "Delete hotels",
  },

  // ==========================
  // Restaurant Permissions
  // ==========================
  {
    name: "restaurant:create",
    resource: "restaurant",
    action: "create",
    description: "Create restaurants",
  },
  {
    name: "restaurant:read",
    resource: "restaurant",
    action: "read",
    description: "View restaurants",
  },
  {
    name: "restaurant:update",
    resource: "restaurant",
    action: "update",
    description: "Update restaurants",
  },
  {
    name: "restaurant:delete",
    resource: "restaurant",
    action: "delete",
    description: "Delete restaurants",
  },

  // ==========================
  // Notification Permissions
  // ==========================
  {
    name: "notification:create",
    resource: "notification",
    action: "create",
    description: "Create notifications",
  },
  {
    name: "notification:read",
    resource: "notification",
    action: "read",
    description: "View notifications",
  },
  {
    name: "notification:update",
    resource: "notification",
    action: "update",
    description: "Update notifications",
  },
  {
    name: "notification:delete",
    resource: "notification",
    action: "delete",
    description: "Delete notifications",
  },
];