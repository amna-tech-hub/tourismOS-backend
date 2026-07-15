    module.exports = {
    

    HTTP_STATUS: {
        // Success
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204,
        
        // Client Errors
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        METHOD_NOT_ALLOWED: 405,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        TOO_MANY_REQUESTS: 429,
        
        // Server Errors
        INTERNAL_SERVER_ERROR: 500,
        NOT_IMPLEMENTED: 501,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504,
    },


    ERROR_MESSAGES: {
        // Auth
        INVALID_CREDENTIALS: 'Invalid email or password',
        UNAUTHORIZED: 'Unauthorized access',
        FORBIDDEN: 'Access forbidden',
        TOKEN_EXPIRED: 'Token expired',
        INVALID_TOKEN: 'Invalid token',
        TOKEN_REQUIRED: 'Token required',
        
        // User
        USER_NOT_FOUND: 'User not found',
        USER_EXISTS: 'User already exists',
        EMAIL_EXISTS: 'Email already registered',
        PHONE_EXISTS: 'Phone number already registered',
        
        // Validation
        VALIDATION_ERROR: 'Validation error',
        INVALID_INPUT: 'Invalid input provided',
        INVALID_EMAIL: 'Invalid email address',
        INVALID_PHONE: 'Invalid phone number',
        PASSWORD_TOO_WEAK: 'Password is too weak',
        
        // Resources
        NOT_FOUND: 'Resource not found',
        ALREADY_EXISTS: 'Resource already exists',
        INVALID_ID: 'Invalid resource ID',
        
   
        // Server
        INTERNAL_ERROR: 'Internal server error',
        SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
        DATABASE_ERROR: 'Database error',
       
    }
}