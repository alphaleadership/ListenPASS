/**
 * SCP Card Generator - Main Server Application
 * Express.js server with API endpoints for batch processing and card generation
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const apiRoutes = require('./routes/api');
const siteRoutes = require('./routes/sites');
const batchRoutes = require('./routes/batch');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import performance middleware
const {
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
} = require('./middleware/performance');

// Import services
const { initializeDefaultSites } = require('./services/siteService');

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Performance middleware (order matters)
app.use(requestId());
app.use(requestTiming());
app.use(memoryMonitoring());
app.use(requestSizeLimit());

// Security middleware
app.use(securityHeaders);

// Compression middleware
app.use(optimizedCompression);

// CORS middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://scp-foundation.org', 'https://cards.scp-foundation.org']
        : true,
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(logger);

// Response caching middleware
app.use(responseCache());

// Rate limiting
app.use('/api/', apiRateLimit);
app.use('/api/batch-generate', batchRateLimit);

// Static file optimization
app.use(staticFileOptimization());

// Serve static files (client-side application)
app.use(express.static(path.join(__dirname, '../'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// Create necessary directories
const requiredDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'output'),
    path.join(__dirname, 'temp')
];

requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api', batchRoutes);

// Health check endpoint with performance metrics
app.get('/health', healthCheck());

// Performance metrics endpoint
app.get('/api/metrics', (req, res) => {
    res.json({
        performance: performanceMonitor.getMetrics(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Serve the main application for all non-API routes
app.get('*', (req, res) => {
    // Don't serve index.html for API routes or static assets
    if (req.path.startsWith('/api/') || 
        req.path.includes('.') || 
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware (must be last)
app.use(optimizedErrorHandler);

// Initialize services
async function initializeServer() {
    try {
        // Initialize default SCP sites
        await initializeDefaultSites();
        console.log('✓ Default SCP sites initialized');
        
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    SCP FOUNDATION                            ║
║                  Card Generator Server                       ║
║                                                              ║
║  Status: OPERATIONAL                                         ║
║  Port: ${PORT.toString().padEnd(53)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(46)}║
║  Time: ${new Date().toISOString().padEnd(49)}║
║                                                              ║
║  Performance: OPTIMIZED                                      ║
║  Security Level: CLEARANCE LEVEL 2 REQUIRED                 ║
║  Access: http://localhost:${PORT.toString().padEnd(38)}║
║  Metrics: http://localhost:${PORT}/api/metrics${' '.repeat(25)}║
╚══════════════════════════════════════════════════════════════╝
            `);
        });
        
        // Setup graceful shutdown
        gracefulShutdown(server);
        
    } catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Initialize and start server
initializeServer();

module.exports = app;