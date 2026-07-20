// src/models/Role.model.js

const mongoose = require('mongoose');
const baseFields= require('./base/base.schema');

const RoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        trim: true,
        enum: ['user', 'admin', 'super_admin', 'guide', 'vendor'],
      
    },
    displayName: {
        type: String,
        required: [true, 'Display name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
   
 
   
  
    
}, {
    timestamps: true,
    versionKey: false,
  });




const Role = mongoose.model('Role', RoleSchema);

module.exports = Role;