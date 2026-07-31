const { errorResponse } = require("../utils/response.util");

const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {statusCode:401, message:"Authentication required."});
    }
console.log(allowedRoles," allowed and the role of the user is ->",req.user.role);

    // 2. Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,{
       statusCode: 403,
       message: `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}`,
     
    });
    }

    next();
  };
};

module.exports = restrictTo;
