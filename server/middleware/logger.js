/**
 * Logger Middleware
 * Request logging for monitoring and debugging
 */

const logger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);
    
    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
        console.log('Headers:', req.headers);
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('Body:', JSON.stringify(req.body, null, 2));
        }
        if (req.query && Object.keys(req.query).length > 0) {
            console.log('Query:', req.query);
        }
    }
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        
        // Log response in development (but limit size)
        if (process.env.NODE_ENV === 'development') {
            const responseStr = JSON.stringify(data);
            if (responseStr.length > 1000) {
                console.log('Response:', responseStr.substring(0, 1000) + '... (truncated)');
            } else {
                console.log('Response:', data);
            }
        }
        
        // Log slow requests
        if (duration > 1000) {
            console.warn(`SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms`);
        }
        
        // Log errors
        if (res.statusCode >= 400) {
            console.error(`ERROR RESPONSE: ${req.method} ${req.url} - ${res.statusCode}`, data);
        }
        
        return originalJson.call(this, data);
    };
    
    // Override res.send for non-JSON responses
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        
        if (duration > 1000) {
            console.warn(`SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms`);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
};

module.exports = logger;