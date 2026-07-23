// sucess res
const successResponse = (
    res,
    {
        statusCode = 200,
        message = "Success",
        data = null,
        meta = null,
    } = {}
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
    });
};

/**
 * Error Response
 */
const errorResponse = (
    res,
    {
        statusCode = 500,
        message = "Internal Server Error",
        errors = null,
    } = {}
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};

module.exports = {
    successResponse,
    errorResponse,
};