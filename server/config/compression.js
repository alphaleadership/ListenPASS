/**
 * Compression Configuration - Optimized asset compression settings
 */

const compression = require('compression');
const path = require('path');

/**
 * Advanced compression configuration
 */
const compressionConfig = {
    // Compression level (1-9, 6 is good balance)
    level: 6,
    
    // Only compress files larger than 1KB
    threshold: 1024,
    
    // Memory level (1-9, affects memory usage vs compression ratio)
    memLevel: 8,
    
    // Window size (affects compression ratio)
    windowBits: 15,
    
    // Compression strategy
    strategy: compression.constants.Z_DEFAULT_STRATEGY,
    
    // Custom filter function
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
            return false;
        }
        
        // Don't compress already compressed files
        const compressedExtensions = ['.gz', '.br', '.zip', '.rar', '.7z', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mp3'];
        const ext = path.extname(req.path).toLowerCase();
        if (compressedExtensions.includes(ext)) {
            return false;
        }
        
        // Don't compress very small files
        const contentLength = res.getHeader('content-length');
        if (contentLength && parseInt(contentLength) < 1024) {
            return false;
        }
        
        // Use default compression filter for other cases
        return compression.filter(req, res);
    }
};

/**
 * Brotli compression middleware (if supported)
 */
const brotliCompression = () => {
    return (req, res, next) => {
        // Check if client supports Brotli
        const acceptEncoding = req.headers['accept-encoding'] || '';
        
        if (acceptEncoding.includes('br')) {
            // Set Brotli as preferred encoding
            res.set('Content-Encoding', 'br');
        }
        
        next();
    };
};

/**
 * Asset optimization middleware
 */
const assetOptimization = () => {
    return (req, res, next) => {
        const ext = path.extname(req.path).toLowerCase();
        
        // Set appropriate cache headers based on file type
        switch (ext) {
            case '.js':
            case '.css':
                // JavaScript and CSS files
                res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
                res.set('Content-Type', ext === '.js' ? 'application/javascript' : 'text/css');
                break;
                
            case '.png':
            case '.jpg':
            case '.jpeg':
            case '.gif':
            case '.webp':
            case '.svg':
                // Image files
                res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
                break;
                
            case '.woff':
            case '.woff2':
            case '.ttf':
            case '.eot':
                // Font files
                res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
                res.set('Access-Control-Allow-Origin', '*');
                break;
                
            case '.html':
                // HTML files - shorter cache
                res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
                break;
                
            case '.json':
                // JSON files
                res.set('Cache-Control', 'public, max-age=86400'); // 1 day
                res.set('Content-Type', 'application/json');
                break;
                
            default:
                // Other files
                res.set('Cache-Control', 'public, max-age=86400'); // 1 day
        }
        
        // Add ETag for better caching
        if (!res.getHeader('ETag')) {
            const stats = req.stats; // If available from static middleware
            if (stats) {
                res.set('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
            }
        }
        
        next();
    };
};

/**
 * Preload hints middleware
 */
const preloadHints = () => {
    return (req, res, next) => {
        // Add preload hints for critical resources
        if (req.path === '/' || req.path === '/index.html') {
            const preloadResources = [
                '</js/client/app.js>; rel=preload; as=script',
                '</css/design-system.css>; rel=preload; as=style',
                '</css/scp-theme.css>; rel=preload; as=style',
                '</assets/scp-logo.svg>; rel=preload; as=image'
            ];
            
            res.set('Link', preloadResources.join(', '));
        }
        
        next();
    };
};

/**
 * Content Security Policy for assets
 */
const assetCSP = () => {
    return (req, res, next) => {
        // Set CSP headers for better security
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'", // Allow inline scripts for now
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');
        
        res.set('Content-Security-Policy', csp);
        next();
    };
};

/**
 * Resource hints middleware
 */
const resourceHints = () => {
    return (req, res, next) => {
        // Add DNS prefetch for external resources
        const dnsPrefetch = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
        ];
        
        dnsPrefetch.forEach(domain => {
            res.append('Link', `<${domain}>; rel=dns-prefetch`);
        });
        
        next();
    };
};

/**
 * Service Worker registration hint
 */
const serviceWorkerHint = () => {
    return (req, res, next) => {
        if (req.path === '/' || req.path === '/index.html') {
            // Add service worker registration hint
            res.append('Link', '</sw.js>; rel=serviceworker');
        }
        
        next();
    };
};

module.exports = {
    compressionConfig,
    brotliCompression,
    assetOptimization,
    preloadHints,
    assetCSP,
    resourceHints,
    serviceWorkerHint
};