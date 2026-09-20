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
            status:"inactive",
            createdBy: req.user.id,
        });

        // 4. Generate Crypto Invitation Token
        const { rawToken, hashedToken } = generateCryptoToken();

        // 5. Save Invitation in Database (sent to company email)
        await Invitation.create({
            company: company._id,
            user:company._id,
            email: company.email,
            phone:company.phone,
            role: companyAdminRole._id,
            token: hashedToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
            invitedBy: req.user.id,
        });

        // 6. Build Inline HTML Email Template with Invitation Link
        const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/accept-invitation?token=${rawToken}`;

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
// src/controllers/admin/company.controller.js (Updated getCompanyStats)

const getCompanyStats = async (req, res) => {
  try {
    const company = await Company.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    // Calculate AI credit statistics
    const totalCredits = company.aiCredits?.total || 0;
    const usedCredits = company.aiCredits?.used || 0;
    const remainingCredits = Math.max(0, totalCredits - usedCredits);

    // ============================================
    // 🆕 FIX: Get Company's ACTUAL revenue (their payout)
    // ============================================
    const [
      totalEmployees,
      totalTours,
      totalBookings,
      // 🆕 Company's actual revenue (what they received)
      companyRevenueResult,
      // 🆕 Commission paid to platform
      commissionPaidResult,
      // 🆕 Average booking value for this company
      avgBookingResult,
    ] = await Promise.all([
      Employee.countDocuments({ company: company._id, isDeleted: false }),
      Tour.countDocuments({ company: company._id, isDeleted: false }),
      Booking.countDocuments({ company: company._id, isDeleted: false }),
      
      // 🆕 Company's actual revenue from paid bookings
      Payment.aggregate([
        {
          $match: {
            companyId: company._id,
            status: "paid",
            purpose: "booking",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$companyPayout" },
            totalBookings: { $sum: 1 },
            totalBookingValue: { $sum: "$amount" },
          },
        },
      ]),
      
      // 🆕 Commission paid to platform
      Payment.aggregate([
        {
          $match: {
            companyId: company._id,
            status: "paid",
            purpose: "booking",
          },
        },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: "$platformCommission" },
          },
        },
      ]),
      
      // 🆕 Average booking value
      Payment.aggregate([
        {
          $match: {
            companyId: company._id,
            status: "paid",
            purpose: "booking",
          },
        },
        {
          $group: {
            _id: null,
            avgBookingValue: { $avg: "$amount" },
          },
        },
      ]),
    ]);

    const companyRevenue = companyRevenueResult.length > 0 
      ? companyRevenueResult[0] 
      : { totalRevenue: 0, totalBookings: 0, totalBookingValue: 0 };
      
    const commissionPaid = commissionPaidResult.length > 0 
      ? commissionPaidResult[0].totalCommission 
      : 0;
      
    const avgBooking = avgBookingResult.length > 0 
      ? avgBookingResult[0].avgBookingValue 
      : 0;

    return successResponse(res, {
      statusCode: 200,
      message: "Company stats fetched successfully.",
      data: {
        companyId: company._id,
        companyName: company.companyName,
        email: company.email,
        address: company.address,
        phone: company.phone || null,
        status: company.status,
        createdAt: company.createdAt,
        verificationStatus:company.verificationStatus,
        stats: {
          totalEmployees,
          totalTours,
          totalBookings,
          // 🆕 Revenue Metrics (Company's actual earnings)
          revenue: {
            total: companyRevenue.totalRevenue, // Company's actual revenue
            totalBookingValue: companyRevenue.totalBookingValue, // Gross sales
            platformCommission: commissionPaid, // What they paid to platform
            netRevenue: companyRevenue.totalRevenue - commissionPaid, // After commission
            averageBookingValue: Math.round(avgBooking),
          },
          aiCredits: {
            total: totalCredits,
            used: usedCredits,
            remaining: remainingCredits,
            plan: company.aiCredits?.plan || "Starter",
            expiresAt: company.aiCredits?.expiresAt || null,
            lastUsedAt: company.aiCredits?.lastUsedAt || null,
          },
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
const Payment = require("../../models/Payment.model");


const getFraudAttempts = async (req, res) => {
  try {
    const fraudAttempts = await Payment.find({ status: "fraud_attempt" })
      .sort({ createdAt: -1 })
      .limit(100);

    const ipGroups = {};
    fraudAttempts.forEach((attempt) => {
      if (!ipGroups[attempt.ipAddress]) {
        ipGroups[attempt.ipAddress] = [];
      }
      ipGroups[attempt.ipAddress].push(attempt);
    });

    const sortedIps = Object.entries(ipGroups).sort((a, b) => b[1].length - a[1].length);

    res.json({
      success: true,
      totalAttempts: fraudAttempts.length,
      uniqueIps: Object.keys(ipGroups).length,
      attempts: fraudAttempts,
      ipAnalysis: sortedIps.map(([ip, attempts]) => ({
        ip,
        attemptCount: attempts.length,
        firstAttempt: attempts[attempts.length - 1].createdAt,
        lastAttempt: attempts[0].createdAt,
        reasons: [...new Set(attempts.map((a) => a.fraudReason))],
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    getFraudAttempts
};