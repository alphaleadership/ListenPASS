/**
 * Error Handler Middleware
 * Centralized error handling for the Express application
 */

const errorHandler = (err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    // Default error response
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = null;
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        details = err.errors;
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate entry';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    } else if (err.name === 'MulterError') {
        statusCode = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File too large';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Too many files';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        } else {
            message = 'File upload error';
        }
    } else if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON format';
    } else if (err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Request entity too large';
    }
    
    // In development, include stack trace
    const response = {
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    };
    
    if (details) {
        response.details = details;
    }
    
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.originalError = err.message;
    }
    
    // Log critical errors
    if (statusCode >= 500) {
        console.error('CRITICAL ERROR:', {
            error: err,
            request: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
                params: req.params,
                query: req.query
            }
        });
    }
    
    res.status(statusCode).json(response);
};

module.exports = errorHandler;