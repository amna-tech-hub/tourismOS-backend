const express = require("express");
const router = express.Router();

const userController=require('../../controllers/traveler/user.controller')

const isAuth = require("../../middleware/authorization.middleware");
const restrictTo = require("../../middleware/role.middleware");

// User Profile Routes (Authenticated User)
router.get("/me", isAuth, userController.userProfile);
router.patch("/me", isAuth, userController.updateProfile);

// Admin User Management Routes (Super Admin Only)
router.get("/", isAuth, restrictTo("super_admin"), userController.getAllUsers);
router.get("/roles", isAuth, restrictTo("super_admin"), userController.getRoles); 
router.get("/:id/stats", isAuth, restrictTo("super_admin"), userController.getUserStats); 
router.get("/:id", isAuth, restrictTo("super_admin"), userController.getUserById);
router.patch("/:id/role", isAuth, restrictTo("super_admin"), userController.updateUserRole); 
router.patch("/:id/verify-email", isAuth, restrictTo("super_admin"), userController.toggleEmailVerification); // New
router.delete("/:id", isAuth, restrictTo("super_admin"), userController.softDeleteUser);
router.patch("/:id/restore", isAuth, restrictTo("super_admin"), userController.restoreUser);

module.exports = router;