const Employee = require("../../models/Employee.model");
const Company = require("../../models/Company.model");
const Role = require("../../models/Role.model");
const Invitation = require("../../models/Invitation.model");
const User = require("../../models/User.model");
const { generateCryptoToken } = require("../../utils/cryptoToken.util");
const mailSender = require("../../services/email/mailSender");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util"); 

const getAdminCompany = async (userId) => {
  return await Company.findOne({ ownerId: userId, isDeleted: false });
};


const inviteEmployee = async (req, res) => {
  try {
    const { email, designation, department,phone,address } = req.body;

    if (!email) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Employee email is required.",
      });
    }

    // 1. Get company owned by logged-in company admin
    const company = await getAdminCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found for this admin.",
      });
    }

    // 2. Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, {
        statusCode: 409,
        message: "A user with this email already exists in the system.",
      });
    }

    // 3. Get Employee Role
    const employeeRole = await Role.findOne({ name: "employee" });
    if (!employeeRole) {
      return errorResponse(res, {
        statusCode: 500,
        message: "Employee role not configured in database.",
      });
    }
        const employee = await Employee.create({
           company: company._id,
            designation ,
            department,
            phone,
            address,
            createdBy: req.user.id,
        });

    // 4. Generate Crypto Invitation Token
    const { rawToken, hashedToken } = generateCryptoToken();

    // 5. Save Invitation in Database
    const invitation = await Invitation.create({
      company: company._id,
      user:employee._id,
      email,
      role: employeeRole._id,
      designation: designation || "Employee",
      department: department || "General",
      token: hashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      invitedBy: req.user.id,
    });

    // 6. Build Invitation Link and Email Template
    const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/accept-invitation?token=${rawToken}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Join ${company.companyName} on TourismOS!</h2>
        <p>Hello,</p>
        <p>You have been invited to join <strong>${company.companyName}</strong> as a <strong>${designation || "Employee"}</strong>.</p>
        <p>Please click the button below to accept the invitation, set up your profile, and create your password:</p>
        <div style="margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Accept Employee Invitation
          </a>
        </div>
        <p style="font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #4F46E5;">${inviteUrl}</p>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">This invitation link will expire in 7 days.</p>
      </div>
    `;

    // 7. Send Invitation Email
    await mailSender(email, `Invitation to join ${company.companyName}`, emailBody);

    return successResponse(res, {
      statusCode: 201,
      message: "Employee invitation sent successfully.",
      data: {
        invitationId: invitation._id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Invite Employee Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const company = await getAdminCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    // 1. Base query scoped to the current company
    const baseQuery = Employee.find({
      company: company._id,
      isDeleted: { $ne: true },
    }).populate("user", "name email phone gender emailVerified");

    // 2. Total document count for pagination metadata
    const totalDocuments = await Employee.countDocuments({
      company: company._id,
      isDeleted: { $ne: true },
    });

    // 3. Apply ApiFeatures chain
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["designation", "department", "phone", "address"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // 4. Execute final query
    const employees = await features.query;

  const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;

return successResponse(res, {
  statusCode: 200,
  message: "Employees fetched successfully.",
  data: employees,
  meta: {
    totalDocuments,
    page,
    limit,
    totalPages: Math.ceil(totalDocuments / limit),
  },
});
  } catch (error) {
    console.error("Get All Employees Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const company = await getAdminCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    const employee = await Employee.findOne({
      _id: req.params.id,
      company: company._id,
      isDeleted: { $ne: true },
    }).populate("user", "name email phone gender avatar");

    if (!employee) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Employee not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Employee retrieved successfully.",
      data: employee,
    });
  } catch (error) {
    console.error("Get Employee By ID Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};


const updateEmployee = async (req, res) => {
  try {
    const { designation, department, status, joiningDate } = req.body;

    const company = await getAdminCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    const updates = {};
    if (designation !== undefined) updates.designation = designation;
    if (department !== undefined) updates.department = department;
    if (status !== undefined) updates.status = status;
    if (joiningDate !== undefined) updates.joiningDate = joiningDate;

    const updatedEmployee = await Employee.findOneAndUpdate(
      {
        _id: req.params.id,
        company: company._id,
        isDeleted: { $ne: true },
      },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("user", "name email phone");

    if (!updatedEmployee) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Employee not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Employee updated successfully.",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


const deleteEmployee = async (req, res) => {
  try {
    const company = await getAdminCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    const employee = await Employee.findOneAndUpdate(
      {
        _id: req.params.id,
        company: company._id,
        isDeleted: { $ne: true },
      },
      { $set: { isDeleted: true, status: "inactive" } },
      { new: true }
    );

    if (!employee) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Employee not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Employee deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete Employee Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  inviteEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};