const jwt = require("jsonwebtoken");

const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
         return errorResponse(res, {
    statusCode: 401,
    message: "Unauthorized. Please log in.",
});
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Session expired or invalid token."
        });
    }
};

module.exports = isAuth;