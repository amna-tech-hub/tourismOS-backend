const Tour = require("../../models/Tour.model");
const Company = require("../../models/Company.model");
const Review = require("../../models/Review.model");
const {
  successResponse,
  errorResponse,
} = require("../../utils/response.util");

/**
 * @desc    Get Super Admin Tours Analytics
 * @route   GET /api/v1/admin/tours/analytics
 * @access  Private (Super Admin)
 */
const getTourAnalytics = async (req, res) => {
  try {
    const [
      tourStats,
      companyTourDistribution,
      topReviewedTours,
      recentReviews,
    ] = await Promise.all([
      // ============================================
      // 1. Overall Tour Statistics
      // ============================================

      Tour.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },

        {
          $group: {
            _id: null,

            totalTours: {
              $sum: 1,
            },

            publishedTours: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "published"] },
                  1,
                  0,
                ],
              },
            },

            draftTours: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "draft"] },
                  1,
                  0,
                ],
              },
            },

            avgPlatformRating: {
              $avg: "$ratingsAverage",
            },

            totalRatingsCount: {
              $sum: "$ratingsQuantity",
            },
          },
        },
      ]),

      // ============================================
      // 2. Company Tour + Review Distribution
      // ============================================

      Company.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },

        {
          $lookup: {
            from: "tours",

            let: {
              companyId: "$_id",
            },

            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          "$company",
                          "$$companyId",
                        ],
                      },

                      {
                        $eq: [
                          "$isDeleted",
                          false,
                        ],
                      },
                    ],
                  },
                },
              },

              {
                $project: {
                  status: 1,
                  ratingsAverage: 1,
                  ratingsQuantity: 1,
                },
              },
            ],

            as: "tours",
          },
        },

        {
          $project: {
            _id: 1,
            companyName: 1,
            logo: 1,

            totalTours: {
              $size: "$tours",
            },

            publishedTours: {
              $size: {
                $filter: {
                  input: "$tours",
                  as: "tour",

                  cond: {
                    $eq: [
                      "$$tour.status",
                      "published",
                    ],
                  },
                },
              },
            },

            draftTours: {
              $size: {
                $filter: {
                  input: "$tours",
                  as: "tour",

                  cond: {
                    $eq: [
                      "$$tour.status",
                      "draft",
                    ],
                  },
                },
              },
            },

            totalReviews: {
              $sum: "$tours.ratingsQuantity",
            },

            totalRatingPoints: {
              $reduce: {
                input: "$tours",

                initialValue: 0,

                in: {
                  $add: [
                    "$$value",

                    {
                      $multiply: [
                        {
                          $ifNull: [
                            "$$this.ratingsAverage",
                            0,
                          ],
                        },

                        {
                          $ifNull: [
                            "$$this.ratingsQuantity",
                            0,
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },

            totalRatingCount: {
              $sum: "$tours.ratingsQuantity",
            },
          },
        },

        {
          $addFields: {
            averageRating: {
              $cond: [
                {
                  $gt: [
                    "$totalRatingCount",
                    0,
                  ],
                },

                {
                  $round: [
                    {
                      $divide: [
                        "$totalRatingPoints",
                        "$totalRatingCount",
                      ],
                    },

                    1,
                  ],
                },

                0,
              ],
            },
          },
        },

        {
          $project: {
            _id: 1,
            companyName: 1,
            logo: 1,

            totalTours: 1,
            publishedTours: 1,
            draftTours: 1,

            totalReviews: 1,
            averageRating: 1,
          },
        },

        {
          $sort: {
            totalTours: -1,
          },
        },

        {
          $limit: 10,
        },
      ]),

      // ============================================
      // 3. Top Reviewed Tours
      // ============================================

      Tour.find({
        isDeleted: false,
        ratingsQuantity: {
          $gt: 0,
        },
      })
        .populate(
          "company",
          "companyName logo"
        )
        .sort({
          ratingsAverage: -1,
          ratingsQuantity: -1,
        })
        .limit(5)
        .select(
          "title from to price ratingsAverage ratingsQuantity coverImage company status"
        ),

      // ============================================
      // 4. Recent Reviews
      // ============================================

      Review.find()
        .populate(
          "user",
          "name profilePicture email"
        )
        .populate(
          "tour",
          "title coverImage"
        )
        .sort({
          createdAt: -1,
        })
        .limit(10),
    ]);

    const stats = tourStats[0] || {
      totalTours: 0,
      publishedTours: 0,
      draftTours: 0,
      avgPlatformRating: 0,
      totalRatingsCount: 0,
    };

    return successResponse(res, {
      statusCode: 200,

      message:
        "Tour analytics fetched successfully.",

      data: {
        stats: {
          totalTours:
            stats.totalTours,

          publishedTours:
            stats.publishedTours,

          draftTours:
            stats.draftTours,

          avgPlatformRating:
            stats.avgPlatformRating
              ? parseFloat(
                  stats.avgPlatformRating.toFixed(1)
                )
              : 0,

          totalRatingsCount:
            stats.totalRatingsCount,
        },

        companyTourDistribution,

        topReviewedTours,

        recentReviews,
      },
    });
  } catch (error) {
    console.error(
      "Tour Analytics Error:",
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

/**
 * @desc    Super Admin Review Moderation
 * @route   DELETE /api/v1/admin/tours/reviews/:reviewId
 * @access  Private (Super Admin)
 */
const deleteReviewAdmin = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review =
      await Review.findById(reviewId);

    if (!review) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Review not found.",
      });
    }

    await Review.findByIdAndDelete(
      reviewId
    );

    if (
      typeof Review.calcAverageRating ===
      "function"
    ) {
      await Review.calcAverageRating(
        review.tour
      );
    }

    return successResponse(res, {
      statusCode: 200,
      message:
        "Review moderated and deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Admin Delete Review Error:",
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

module.exports = {
  getTourAnalytics,
  deleteReviewAdmin,
};