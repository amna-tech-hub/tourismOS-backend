const SubscriptionPlan = require("../models/SubscriptionPlan.model");


exports.createPlan = async (req, res) => {
  try {
    console.log(req.body);
    
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const CompanySubscription = require("../models/CompanySubscription.model");
const Payment = require("../models/Payment.model");
const { successResponse, errorResponse } = require("../utils/response.util");

/**
 * @desc    Get all plans (including inactive for admin view)
 * @route   GET /api/v1/admin/subscriptions/plans
 * @access  Private (Super Admin)
 */
exports.getAllPlansAdmin = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
    return successResponse(res, {
      statusCode: 200,
      message: "Subscription plans retrieved successfully.",
      data: plans,
    });
  } catch (error) {
    return errorResponse(res, { statusCode: 500, message: error.message });
  }
};

/**
 * @desc    Update a Subscription Plan
 * @route   PUT /api/v1/admin/subscriptions/plans/:id
 * @access  Private (Super Admin)
 */
exports.updatePlan = async (req, res) => {
  try {
    console.log(req.body,"request came");
    
    const { id } = req.params;
    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedPlan) {
      return errorResponse(res, { statusCode: 404, message: "Subscription plan not found." });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Subscription plan updated successfully.",
      data: updatedPlan,
    });
  } catch (error) {
    return errorResponse(res, { statusCode: 400, message: error.message });
  }
};

/**
 * @desc    Toggle Plan Active Status (Archive/Activate)
 * @route   PATCH /api/v1/admin/subscriptions/plans/:id/toggle
 * @access  Private (Super Admin)
 */
exports.togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);

    if (!plan) {
      return errorResponse(res, { statusCode: 404, message: "Plan not found." });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    return successResponse(res, {
      statusCode: 200,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: plan,
    });
  } catch (error) {
    return errorResponse(res, { statusCode: 500, message: error.message });
  }
};

/**
 * @desc    Get All Active Company Subscriptions (Ledger)
 * @route   GET /api/v1/admin/subscriptions/company-subscriptions
 * @access  Private (Super Admin)
 */
exports.getCompanySubscriptions = async (req, res) => {
  try {
    const subscriptions = await CompanySubscription.find()
      .populate("company", "companyName email status logo")
      .populate("plan", "name price aiCredits currency")
      .populate("payment", "status provider amount transactionId paidAt")
      .sort({ createdAt: -1 });

    // Aggregate subscription revenue from paid subscription payments
    const revenueAggregation = await Payment.aggregate([
      { $match: { purpose: "subscription", status: "paid" } },
      { $group: { _id: null, totalSubscriptionRevenue: { $sum: "$amount" } } },
    ]);

    const totalRevenue = revenueAggregation[0]?.totalSubscriptionRevenue || 0;

    return successResponse(res, {
      statusCode: 200,
      message: "Company subscriptions fetched successfully.",
      data: {
        subscriptions,
        stats: {
          totalRevenue,
          activeSubscriptions: subscriptions.filter(s => s.status === "active").length,
          totalSubscriptions: subscriptions.length,
        },
      },
    });
  } catch (error) {
    return errorResponse(res, { statusCode: 500, message: error.message });
  }
};