// const mongoose = require("mongoose");
// const baseFields = require("./base/Base.schema");

// const PermissionSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
    
//     },

//     resource: {
//       type: String,
//       required: true,
//       enum: [
//         "user",
//         "role",
//         "trip",
//         "destination",
//         "hotel",
//         "restaurant",
//         "notification",
//       ],
//     },

//     action: {
//       type: String,
//       required: true,
//       enum: [
//         "create",
//         "read",
//         "update",
//         "delete",
//         "manage",
//       ],
//     },

//     description: {
//       type: String,
//       trim: true,
//     },

//     ...baseFields,
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//   }
// );

// PermissionSchema.index({
//   resource: 1,
//   action: 1,
// });

// module.exports = mongoose.model(
//   "Permission",
//   PermissionSchema
// );