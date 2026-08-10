// Models
const User = require("../../models/User.model");
const Role = require("../../models/Role.model");
const Booking = require("../../models/Booking.model"); // Adjust path as needed
const Company = require("../../models/Company.model"); // Adjust path as needed
const Tour = require("../../models/Tour.model");       // Adjust path as needed

const ApiFeatures = require("../../utils/apiFeatures.util");
const { successResponse, errorResponse } = require("../../utils/response.util");

const getAllUsers = async (req, res) => {
  try {
    const { role, emailVerified, search } = req.query;

    // Build dynamic query object
    let filterCriteria = {};

    // 1. Dynamic Role Filtering by Role Name or Role ID
    if (role) {
      if (role.match(/^[0-9a-fA-F]{24}$/)) {
        // If query passes a valid MongoDB ObjectId
        filterCriteria.role = role;
      } else {
        // If query passes role name e.g. ?role=user or ?role=company_admin
        const foundRole = await Role.findOne({ name: role.toLowerCase() });
        if (foundRole) {
          filterCriteria.role = foundRole._id;
        } else {
          // If specified role does not exist, return empty result set early
          return successResponse(res, {
            statusCode: 200,
            message: "Users fetched successfully.",
            data: [],
            meta: {
              totalDocuments: 0,
              page: Number(req.query.page) || 1,
              limit: Number(req.query.limit) || 10,
              totalPages: 0,
            },
          });
        }
      }
    }

    // 2. Email Verification Filter (?emailVerified=true / false)
    if (emailVerified !== undefined && emailVerified !== "") {
      filterCriteria.emailVerified = emailVerified === "true";
    }

    // Base query with populated role details
    const baseQuery = User.find(filterCriteria).populate(
      "role",
      "name displayName description"
    );

    // Apply API Features (Search, Sort, Pagination)
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["name", "email", "phone"])
      .sort()
      .paginate();

    // Execute paginated query & count
    const [users, totalDocuments] = await Promise.all([
      features.query,
      User.countDocuments(filterCriteria),
    ]);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    return successResponse(res, {
      statusCode: 200,
      message: "Users fetched successfully.",
      data: users,
      meta: {
        totalDocuments,
        page,
        limit,
        totalPages: Math.ceil(totalDocuments / limit),
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const softDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || user.isDeleted) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found or already deleted.",
      });
    }

    // Prevent Super Admin self-deletion safeguard
    if (req.user && req.user._id.toString() === id.toString()) {
      return errorResponse(res, {
        statusCode: 400,
        message: "You cannot delete your own admin account.",
      });
    }

    // Mark as deleted
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user?._id || null; // Stores who performed the soft delete

    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: "User account soft-deleted successfully.",
      data: { id: user._id, isDeleted: user.isDeleted },
    });
  } catch (error) {
    console.error("Soft Delete User Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password")
      .populate("role", "name displayName description");

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User details fetched successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Get User By ID Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};



const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().select("name displayName description");

    return successResponse(res, {
      statusCode: 200,
      message: "System roles fetched successfully.",
      data: roles,
    });
  } catch (error) {
    console.error("Get Roles Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};


const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    if (!user.isDeleted) {
      return errorResponse(res, {
        statusCode: 400,
        message: "User account is not deleted.",
      });
    }

    // Reset soft delete audit fields
    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedBy = null;

    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: "User account restored successfully.",
      data: {
        id: user._id,
        isDeleted: user.isDeleted,
      },
    });
  } catch (error) {
    console.error("Restore User Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const userProfile = async (req, res) => {
  try {
    console.log(req.user," user request");
    
    const userId = req.user?.id || req.user?.id;

    if (!userId) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Unauthorized request.",
      });
    }

    const user = await User.findOne({ _id: userId})
      .select("-password")
      .populate("role", "name");

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User profile fetched successfully.",
      data: { user },
    });
  } catch (error) {
    console.error("User Profile Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Unauthorized request.",
      });
    }

    // 1. Extract fields from req.body
    const { name, phone, profilePicture } = req.body;

    // 2. Build the update object
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    
    // ADD THIS LINE:
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, {
        statusCode: 400,
        message: "No fields provided for update.",
      });
    }

    // 3. Update in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("role", "name");

    if (!updatedUser) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Profile updated successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc    Get Detailed User Statistics (Role-Aware)
 * @route   GET /api/v1/users/:id/stats
 * @access  Private (Super Admin)
 */
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch User with Populated Role
    const user = await User.findById(id).populate(
      "role",
      "name displayName description"
    );

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    const roleName = user.role?.name?.toLowerCase() || "user";

    // Standardized user profile overview matching your User model fields
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        gender: user.gender,
        profilePicture: user.profilePicture?.url || null,
        emailVerified: user.emailVerified,
        isDeleted: user.isDeleted || false,
        deletedAt: user.deletedAt || null,
        role: {
          id: user.role?._id,
          name: user.role?.name,
          displayName: user.role?.displayName || roleName,
          description: user.role?.description,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      metrics: {},
    };

    // 2. Role-Specific Aggregations
    if (roleName === "user") {
      // --- TRAVELER / REGULAR USER METRICS ---
      const [bookingCounts, spending] = await Promise.all([
        Booking.aggregate([
          { $match: { traveler: user._id, isDeleted: { $ne: true } } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Booking.aggregate([
          {
            $match: {
              traveler: user._id,
              paymentStatus: "paid",
              isDeleted: { $ne: true },
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: "$totalAmount" },
            },
          },
        ]),
      ]);

      const bookingMap = bookingCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});

      const totalBookings = bookingCounts.reduce((sum, curr) => sum + curr.count, 0);

      responseData.metrics = {
        roleType: "traveler",
        totalBookings,
        pendingBookings: bookingMap.pending || 0,
        confirmedBookings: bookingMap.confirmed || 0,
        completedBookings: bookingMap.completed || 0,
        cancelledBookings: bookingMap.cancelled || 0,
        totalSpent: spending[0]?.totalSpent || 0,
      };
    } else if (roleName === "company_admin") {
      // --- COMPANY ADMIN METRICS ---
      const company = await Company.findOne({
        owner: user._id,
        isDeleted: { $ne: true },
      });

      if (company) {
        const [totalTours, bookingStats] = await Promise.all([
          Tour.countDocuments({ company: company._id, isDeleted: { $ne: true } }),
          Booking.aggregate([
            { $match: { company: company._id, isDeleted: { $ne: true } } },
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                revenue: {
                  $sum: {
                    $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
                  },
                },
              },
            },
          ]),
        ]);

        responseData.metrics = {
          roleType: "company_admin",
          hasCompany: true,
          companyId: company._id,
          companyName: company.companyName,
          companyStatus: company.status,
          verificationStatus: company.verificationStatus,
          totalTours,
          totalBookings: bookingStats[0]?.totalBookings || 0,
          totalRevenue: bookingStats[0]?.revenue || 0,
        };
      } else {
        responseData.metrics = {
          roleType: "company_admin",
          hasCompany: false,
        };
      }
    } else if (roleName === "employee") {
      // --- EMPLOYEE METRICS ---
      responseData.metrics = {
        roleType: "employee",
        assignedTours: 0,
        managedBookings: 0,
      };
    } else if (roleName === "super_admin") {
      // --- SUPER ADMIN METRICS ---
      responseData.metrics = {
        roleType: "super_admin",
        accessLevel: "Full Access",
      };
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User stats fetched successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error("Get User Stats Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};


/**
 * @desc    Update User Role
 * @route   PATCH /api/v1/users/:id/role
 * @access  Private (Super Admin)
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    const roleExists = await Role.findById(roleId);
    if (!roleExists) {
      return errorResponse(res, { statusCode: 400, message: "Invalid role ID." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role: roleId },
      { new: true }
    ).populate("role", "name displayName description");

    if (!user) {
      return errorResponse(res, { statusCode: 404, message: "User not found." });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User role updated successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};

/**
 * @desc    Toggle Email Verification Status
 * @route   PATCH /api/v1/users/:id/verify-email
 * @access  Private (Super Admin)
 */
const toggleEmailVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { emailVerified } = req.body; // boolean

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, { statusCode: 404, message: "User not found." });
    }

    user.emailVerified = typeof emailVerified === "boolean" ? emailVerified : !user.emailVerified;
    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: `User email verification set to ${user.emailVerified}.`,
      data: { id: user._id, emailVerified: user.emailVerified },
    });
  } catch (error) {
    console.error("Toggle Verification Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};

module.exports = {
 
  getAllUsers,
  getUserById,
  userProfile,
  updateProfile,
  softDeleteUser,
  toggleEmailVerification,
  updateUserRole,
  getUserStats,
   getRoles,
  restoreUser,
};