// Models
const User = require("../../models/User.model");
const Role = require("../../models/Role.model");
const Booking = require("../../models/Booking.model"); // Adjust path as needed
const Company = require("../../models/Company.model"); // Adjust path as needed
const Tour = require("../../models/Tour.model");       // Adjust path as needed
const Review =require("../../models/Review.model")
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

    const {
      name,
      phone,
      gender,
      bio,
      profilePicture,
    } = req.body;

    // =====================================================
    // BUILD UPDATE OBJECT
    // =====================================================

    const updates = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (phone !== undefined) {
      updates.phone = phone;
    }

    if (gender !== undefined) {
      updates.gender = gender;
    }

    if (bio !== undefined) {
      updates.bio = bio;
    }

    // =====================================================
    // PROFILE PICTURE
    // =====================================================

    if (profilePicture !== undefined) {
      if (profilePicture === null) {
        updates.profilePicture = {
          url: null,
          public_id: null,
        };
      } else if (typeof profilePicture === "object") {
        updates.profilePicture = {
          url: profilePicture.url || null,
          public_id: profilePicture.public_id || null,
        };
      }
    }

    // =====================================================
    // VALIDATE EMPTY UPDATE
    // =====================================================

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, {
        statusCode: 400,
        message: "No fields provided for update.",
      });
    }

    // =====================================================
    // UPDATE USER
    // =====================================================

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
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
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    // =====================================================
    // 1. FETCH USER
    // =====================================================

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

    // =====================================================
    // 2. BASE USER PROFILE
    // =====================================================

    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        gender: user.gender,

        profilePicture: {
          url: user.profilePicture?.url || null,
          public_id: user.profilePicture?.public_id || null,
        },

        emailVerified: user.emailVerified,
        isDeleted: user.isDeleted || false,
        deletedAt: user.deletedAt || null,

        role: {
          id: user.role?._id,
          name: user.role?.name,
          displayName:
            user.role?.displayName || roleName,
          description: user.role?.description,
        },

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      metrics: {},
    };

    // =====================================================
    // 3. TRAVELER METRICS
    // =====================================================

    if (
      roleName === "traveler" ||
      roleName === "user"
    ) {
      const [
        bookingCounts,
        spending,
        reviewStats,
        completedBookings,
      ] = await Promise.all([

        // =================================================
        // BOOKING COUNTS
        // =================================================

        Booking.aggregate([
          {
            $match: {
              traveler: user._id,
              isDeleted: { $ne: true },
            },
          },
          {
            $group: {
              _id: "$status",
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        // =================================================
        // TOTAL SPENT
        // =================================================

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
              totalSpent: {
                $sum: "$totalAmount",
              },
            },
          },
        ]),

        // =================================================
        // REVIEW STATISTICS
        // =================================================

        Review.aggregate([
          {
            $match: {
              user: user._id,
            },
          },
          {
            $group: {
              _id: null,

              totalReviews: {
                $sum: 1,
              },

              averageRating: {
                $avg: "$rating",
              },
            },
          },
        ]),

        // =================================================
        // COMPLETED BOOKINGS
        // Used to calculate destinations visited
        // =================================================

        Booking.find({
          traveler: user._id,
          status: "completed",
          isDeleted: { $ne: true },
        })
          .populate("tour", "from to")
          .select("tour"),
      ]);

      // =====================================================
      // BOOKING MAP
      // =====================================================

      const bookingMap = bookingCounts.reduce(
        (acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {}
      );

      // =====================================================
      // TOTAL BOOKINGS
      // =====================================================

      const totalBookings = bookingCounts.reduce(
        (sum, curr) => sum + curr.count,
        0
      );

      // =====================================================
      // DESTINATIONS VISITED
      // =====================================================

      const destinations = new Set();

      completedBookings.forEach((booking) => {
        const tour = booking.tour;

        if (!tour) {
          return;
        }

        if (tour.from) {
          destinations.add(
            tour.from.trim().toLowerCase()
          );
        }

        if (tour.to) {
          destinations.add(
            tour.to.trim().toLowerCase()
          );
        }
      });

      // =====================================================
      // REVIEW DATA
      // =====================================================

      const totalReviews =
        reviewStats[0]?.totalReviews || 0;

      const averageRating =
        reviewStats[0]?.averageRating
          ? Number(
              reviewStats[0].averageRating.toFixed(1)
            )
          : 0;

      // =====================================================
      // TRAVELER METRICS RESPONSE
      // =====================================================

      responseData.metrics = {
        roleType: "traveler",

        // -----------------------------
        // BOOKINGS
        // -----------------------------

        totalBookings,

        pendingBookings:
          bookingMap.pending || 0,

        confirmedBookings:
          bookingMap.confirmed || 0,

        completedBookings:
          bookingMap.completed || 0,

        cancelledBookings:
          bookingMap.cancelled || 0,

        // -----------------------------
        // SPENDING
        // -----------------------------

        totalSpent:
          spending[0]?.totalSpent || 0,

        // -----------------------------
        // REVIEWS
        // -----------------------------

        totalReviews,

        averageRating,

        // -----------------------------
        // TRAVEL
        // -----------------------------

        destinationsVisited:
          destinations.size,
      };

    // =====================================================
    // 4. COMPANY ADMIN METRICS
    // =====================================================

    } else if (roleName === "company_admin") {

      const company = await Company.findOne({
        owner: user._id,
        isDeleted: { $ne: true },
      });

      if (company) {

        const [
          totalTours,
          bookingStats,
        ] = await Promise.all([

          // TOTAL TOURS
          Tour.countDocuments({
            company: company._id,
            isDeleted: { $ne: true },
          }),

          // BOOKINGS + REVENUE
          Booking.aggregate([
            {
              $match: {
                company: company._id,
                isDeleted: { $ne: true },
              },
            },
            {
              $group: {
                _id: null,

                totalBookings: {
                  $sum: 1,
                },

                revenue: {
                  $sum: {
                    $cond: [
                      {
                        $eq: [
                          "$paymentStatus",
                          "paid",
                        ],
                      },
                      "$totalAmount",
                      0,
                    ],
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

          verificationStatus:
            company.verificationStatus,

          totalTours,

          totalBookings:
            bookingStats[0]?.totalBookings || 0,

          totalRevenue:
            bookingStats[0]?.revenue || 0,
        };

      } else {

        responseData.metrics = {
          roleType: "company_admin",

          hasCompany: false,
        };
      }

    // =====================================================
    // 5. EMPLOYEE METRICS
    // =====================================================

    } else if (roleName === "employee") {

      responseData.metrics = {
        roleType: "employee",

        assignedTours: 0,

        managedBookings: 0,
      };

    // =====================================================
    // 6. SUPER ADMIN METRICS
    // =====================================================

    } else if (roleName === "super_admin") {

      responseData.metrics = {
        roleType: "super_admin",

        accessLevel: "Full Access",
      };
    }

    // =====================================================
    // 7. RESPONSE
    // =====================================================

    return successResponse(res, {
      statusCode: 200,

      message: "User stats fetched successfully.",

      data: responseData,
    });

  } catch (error) {

    console.error(
      "Get User Stats Error:",
      error
    );

    return errorResponse(res, {
      statusCode: 500,

      message:
        error.message ||
        "Internal Server Error",
    });
  }
};

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