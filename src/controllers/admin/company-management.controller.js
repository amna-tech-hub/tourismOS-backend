const Company = require("../../models/Company.model");
const User = require("../../models/User.model");
const ApiFeatures = require("../../utils/apiFeatures.util");
const {
    successResponse,
    errorResponse,
} = require("../../utils/response.util");

// 1. Create Company
const Role = require("../../models/Role.model");
const Invitation = require("../../models/Invitation.model");
const { generateCryptoToken } = require("../../utils/cryptoToken.util");
const mailSender = require("../../services/email/mailSender");

const createCompany = async (req, res) => {
    try {
        const { companyName, email, phone, address } = req.body;

        if (!companyName || !email) {
            return errorResponse(res, {
                statusCode: 400,
                message: "Company name and email are required.",
            });
        }

        // 1. Check if Company with this email already exists
        const existingCompany = await Company.findOne({ email, isDeleted: false });
        if (existingCompany) {
            return errorResponse(res, {
                statusCode: 409,
                message: "A company with this email already exists.",
            });
        }

        const companyAdminRole = await Role.findOne({ name: "company_admin" });
        
        if (!companyAdminRole) {
            return errorResponse(res, {
                statusCode: 500,
                message: "Company Admin role not configured in database.",
            });
        }

        // 3. Create the Company record
        const company = await Company.create({
          
           companyName: companyName,
            email,
            phone,
            address,
            createdBy: req.user.id,
        });
console.log(company," looking id in company");

        // 4. Generate Crypto Invitation Token
        const { rawToken, hashedToken } = generateCryptoToken();

        // 5. Save Invitation in Database (sent to company email)
        await Invitation.create({
            company: company._id,
            user:company._id,
            email: company.email,
            role: companyAdminRole._id,
            token: hashedToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
            invitedBy: req.user.id,
        });

        // 6. Build Inline HTML Email Template with Invitation Link
        const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/accept-invitation?token=${rawToken}`;

        const emailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Welcome to TourismOS!</h2>
                <p>Hello,</p>
                <p>Your company <strong>${company.companyName}</strong> has been created on TourismOS.</p>
                <p>Please click the button below to complete your setup, enter your name, and set your account password:</p>
                <div style="margin: 30px 0;">
                    <a href="${inviteUrl}" style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Set Up Company Admin Account
                    </a>
                </div>
                <p style="font-size: 13px; color: #666;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 13px; color: #4F46E5;">${inviteUrl}</p>
                <p style="font-size: 12px; color: #999; margin-top: 30px;">This invitation link will expire in 7 days.</p>
            </div>
        `;

        // 7. Send Invitation Email via mailSender
        await mailSender(company.email, `Complete setup for ${company.companyName} on TourismOS`, emailBody);

        // 8. Send Success Response
        return successResponse(res, {
            statusCode: 201,
            message: "Company created successfully and invitation email sent.",
            data: company,
        });
    } catch (error) {
        console.error("Create Company Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};



const getAllCompanies = async (req, res) => {
    try {
        const baseQuery = Company.find({ isDeleted: false });

        const totalCompanies = await Company.countDocuments({ isDeleted: false });

        const features = new ApiFeatures(baseQuery, req.query)
            .search(["companyName", "email", "phone", "address"])
            .filter()
            .sort()
            .paginate();

        const companies = await features.query;

      const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;

return successResponse(res, {
  statusCode: 200,
  message: "Companies retrieved successfully.",
  data: companies,
  meta: {
    totalDocuments: totalCompanies,
    page,
    limit,
    totalPages: Math.ceil(totalCompanies / limit),
  },
});
    } catch (error) {
        console.error("Get All Companies Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

// 3. Get Company By ID
const getCompanyById = async (req, res) => {
    try {
        const company = await Company.findOne({ _id: req.params.id, isDeleted: false });

        if (!company) {
            return errorResponse(res, {
                statusCode: 404,
                message: "Company not found.",
            });
        }

        return successResponse(res, {
            statusCode: 200,
            message: "Company fetched successfully.",
            data: company,
        });
    } catch (error) {
        console.error("Get Company By ID Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

// 4. Update Company
const updateCompany = async (req, res) => {
    try {
        const company = await Company.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!company) {
            return errorResponse(res, {
                statusCode: 404,
                message: "Company not found.",
            });
        }

        return successResponse(res, {
            statusCode: 200,
            message: "Company updated successfully.",
            data: company,
        });
    } catch (error) {
        console.error("Update Company Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

// 5. Suspend Company
const suspendCompany = async (req, res) => {
    try {
        const company = await Company.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: { status: "suspended" } },
            { new: true }
        );

        if (!company) {
            return errorResponse(res, {
                statusCode: 404,
                message: "Company not found.",
            });
        }

        return successResponse(res, {
            statusCode: 200,
            message: "Company suspended successfully.",
            data: company,
        });
    } catch (error) {
        console.error("Suspend Company Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

// 6. Activate Company
const activateCompany = async (req, res) => {
    try {
        const company = await Company.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: { status: "active" } },
            { new: true }
        );

        if (!company) {
            return errorResponse(res, {
                statusCode: 404,
                message: "Company not found.",
            });
        }

        return successResponse(res, {
            statusCode: 200,
            message: "Company activated successfully.",
            data: company,
        });
    } catch (error) {
        console.error("Activate Company Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

// 7. Soft Delete Company
const softDeleteCompany = async (req, res) => {
    try {
        const company = await Company.findOneAndUpdate(
            { _id: req.params.id, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: new Date(), status: "inactive" } },
            { new: true }
        );

        if (!company) {
            return errorResponse(res, {
                statusCode: 404,
                message: "Company not found.",
            });
        }

        return successResponse(res, {
            statusCode: 200,
            message: "Company deleted successfully.",
        });
    } catch (error) {
        console.error("Soft Delete Company Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};
const Employee = require("../../models/Employee.model");
const Tour = require("../../models/Tour.model");
const Booking = require("../../models/Booking.model");
// 8. Company Dashboard Stats (Placeholder)
const getCompanyStats = async (req, res) => {
    try {
     
        const company = await Company.findOne({ _id: req.params.id, isDeleted: false });

        if (!company) {
            return errorResponse(res, {
                statusCode: 404,
                message: "Company not found.",
            });
        }

    const totalEmployees = await Employee.countDocuments({
  company: company._id,
  isDeleted: false,
});

const totalTours = await Tour.countDocuments({
  company: company._id,
  isDeleted: false,
});

const totalBookings = await Booking.countDocuments({
  company: company._id,
  isDeleted: false,
});

const revenueResult = await Booking.aggregate([
  {
    $match: {
      company: company._id,
      status: "completed",
      paymentStatus: "paid",
      isDeleted: false,
    },
  },
  {
    $group: {
      _id: null,
      revenue: {
        $sum: "$totalAmount",
      },
    },
  },
]);

const revenue =
  revenueResult.length > 0 ? revenueResult[0].revenue : 0;

return successResponse(res, {
  statusCode: 200,
  message: "Company stats fetched successfully.",
  data: {
    companyId: company._id,
    companyName: company.companyName,
    status: company.status,
    createdAt: company.createdAt,
    stats: {
      totalEmployees,
      totalTours,
      totalBookings,
      revenue,
    },
  },
});
    } catch (error) {
        console.error("Company Stats Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    suspendCompany,
    activateCompany,
    softDeleteCompany,
    getCompanyStats,
};