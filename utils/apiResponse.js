// API Response Template Function
exports.apiResponse = (statusCode, success, message, data) => {
    return {
        statusCode,
        success,
        message,
        data: data || null,
    }
};

// Success Response Helper
exports.successResponse = (message, data) => {
    return {
        statusCode: 200,
        success: true,
        message,
        data: data || null,
    }
};

// Error Response Helper
exports.errorResponse = (message, error = null) => {
    return {
        statusCode: 400,
        success: false,
        message,
        error: error || null,
    }
};
