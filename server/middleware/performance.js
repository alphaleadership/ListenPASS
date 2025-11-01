/**
 * Server Performance Middleware - Optimizations for Express.js server
 */

const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Response caching middleware
 */
const responseCache = () => {
    const cache = new Map();
    const maxCacheSize = 100;
    const defaultTTL = 5 * 60 * 1000; // 5 minutes
    
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }
        
        // Skip caching for certain routes
        const skipCache = [
            '/api/batch-status',
            '/api/download-batch',
            '/health'
        ];
        
        if (skipCache.some(route => req.path.includes(route))) {
            return next();
        }
        
        const cacheKey = `${req.method}:${req.originalUrl}`;
        const cached = cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < defaultTTL) {
            res.set(cached.headers);
            res.set('X-Cache', 'HIT');
            return res.status(cached.status).send(cached.data);
        }
        
        // Override res.send to cache the response
        const originalSend = res.send;
        res.send = function(data) {
            // Set cache header before sending
            if (!res.headersSent) {
                res.set('X-Cache', 'MISS');
            }
            
            // Cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Manage cache size
                if (cache.size >= maxCacheSize) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                
                cache.set(cacheKey, {
                    status: res.statusCode,
                    headers: res.getHeaders(),
                    data: data,
                    timestamp: Date.now()
                });
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Request timing middleware
 */
const requestTiming = () => {
    return (req, res, next) => {
        const startTime = process.hrtime.bigint();
        
        // Set the header before the response starts
        const originalSend = res.send;
        res.send = function(data) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            
            // Only set header if headers haven't been sent
            if (!res.headersSent) {
                res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
            }
            
            // Log slow requests
            if (duration > 1000) {
                console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Memory monitoring middleware
 */
const memoryMonitoring = () => {
    let lastMemoryCheck = 0;
    const checkInterval = 30000; // 30 seconds
    
    return (req, res, next) => {
        const now = Date.now();
        
        if (now - lastMemoryCheck > checkInterval) {
            const memUsage = process.memoryUsage();
            const memoryMB = {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            };
            
            // Warn if memory usage is high
            if (memoryMB.heapUsed > 500) { // 500MB threshold
                console.warn('⚠️ High memory usage:', memoryMB);
            }
            
            lastMemoryCheck = now;
        }
        
        next();
    };
};

/**
 * Request size limiting middleware
 */
const requestSizeLimit = () => {
    return (req, res, next) => {
        const maxSize = 50 * 1024 * 1024; // 50MB
        
        if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
            return res.status(413).json({
                error: 'Request entity too large',
                maxSize: '50MB'
            });
        }
        
        next();
    };
};

/**
 * Batch processing rate limiting
 */
const batchRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 batch jobs per hour per IP
    message: {
        error: 'Too many batch processing requests. Please try again later.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
        res.status(429).json({
            error: 'Too many batch processing requests. Please try again later.',
            retryAfter: '1 hour'
        });
    }
});

/**
 * API rate limiting
 */
const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes per IP
    message: {
        error: 'Too many API requests. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Error handling optimization
 */
const optimizedErrorHandler = (err, req, res, next) => {
    // Log error details
    console.error('Error occurred:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let statusCode = err.statusCode || err.status || 500;
    let message = 'Internal Server Error';
    
    if (statusCode < 500) {
        message = err.message;
    } else if (isDevelopment) {
        message = err.message;
    }
    
    res.status(statusCode).json({
        error: message,
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
    });
};

/**
 * Request ID middleware for tracking
 */
const requestId = () => {
    return (req, res, next) => {
        req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        res.set('X-Request-ID', req.id);
        next();
    };
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
    const shutdown = (signal) => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);
        
        server.close((err) => {
            if (err) {
                console.error('Error during server shutdown:', err);
                process.exit(1);
            }
            
            console.log('Server closed successfully');
            process.exit(0);
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Health check optimization
 */
const healthCheck = () => {
    return (req, res) => {
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        const health = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            environment: process.env.NODE_ENV || 'development',
            version: require('../../package.json').version,
            nodeVersion: process.version
        };
        
        // Check if memory usage is concerning
        if (health.memory.heapUsed > 500) {
            health.status = 'WARNING';
            health.warning = 'High memory usage detected';
        }
        
        res.json(health);
    };
};

/**
 * Static file optimization
 */
const staticFileOptimization = () => {
    return (req, res, next) => {
        // Set cache headers for static assets
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            const maxAge = process.env.NODE_ENV === 'production' ? '1y' : '1h';
            res.set('Cache-Control', `public, max-age=${maxAge === '1y' ? 31536000 : 3600}`);
            res.set('ETag', `"${Date.now()}"`);
        }
        
        next();
    };
};

/**
 * Compression optimization
 */
const optimizedCompression = compression({
    level: 6, // Good balance between compression and CPU usage
    threshold: 1024, // Only compress files larger than 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
            return false;
        }
        
        // Use compression filter
        return compression.filter(req, res);
    }
});

/**
 * Security headers optimization
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Disable for canvas operations
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

/**
 * Performance monitoring
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            totalResponseTime: 0,
            slowRequests: 0
        };
        
        this.startTime = Date.now();
        this.resetInterval = setInterval(() => {
            this.logMetrics();
            this.resetMetrics();
        }, 60000); // Log every minute
    }
    
    recordRequest(duration, isError = false) {
        this.metrics.requests++;
        this.metrics.totalResponseTime += duration;
        
        if (isError) {
            this.metrics.errors++;
        }
        
        if (duration > 1000) {
            this.metrics.slowRequests++;
        }
    }
    
    logMetrics() {
        const avgResponseTime = this.metrics.requests > 0 
            ? (this.metrics.totalResponseTime / this.metrics.requests).toFixed(2)
            : 0;
        
        const errorRate = this.metrics.requests > 0
            ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)
            : 0;
        
        console.log('📊 Performance Metrics (last minute):', {
            requests: this.metrics.requests,
            avgResponseTime: `${avgResponseTime}ms`,
            errorRate: `${errorRate}%`,
            slowRequests: this.metrics.slowRequests,
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        });
    }
    
    resetMetrics() {
        this.metrics = {
            requests: 0,
            errors: 0,
            totalResponseTime: 0,
            slowRequests: 0
        };
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }
    
    cleanup() {
        if (this.resetInterval) {
            clearInterval(this.resetInterval);
        }
    }
}

module.exports = {
    responseCache,
    requestTiming,
    memoryMonitoring,
    requestSizeLimit,
    batchRateLimit,
    apiRateLimit,
    optimizedErrorHandler,
    requestId,
    gracefulShutdown,
    healthCheck,
    staticFileOptimization,
    optimizedCompression,
    securityHeaders,
    PerformanceMonitor
};