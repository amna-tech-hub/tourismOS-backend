const express = require("express");
const router = express.Router();

const employeesController = require("../../controllers/company/employees.controller");

const isAuth = require("../../middleware/authorization.middleware");
const restrictTo = require("../../middleware/role.middleware");
const {
  inviteEmployeeValidator,
  updateEmployeeValidator,
} = require("../../validators/validator");

// Restrict all employee routes to authenticated company_admin
router.use(isAuth);
router.use(restrictTo("company_admin"));

// Create/Invite Employee
router.post("/", inviteEmployeeValidator, employeesController.inviteEmployee);

// Get All Employees
router.get("/", employeesController.getAllEmployees);

// Get Single Employee by ID
router.get("/:id", employeesController.getEmployeeById);

// Update Employee Details / Status
router.patch("/:id", updateEmployeeValidator, employeesController.updateEmployee);

// Delete Employee
router.delete("/:id", employeesController.deleteEmployee);

module.exports = router;