/**
 * Performance Optimizer - Client-side performance enhancements
 */
class PerformanceOptimizer {
    constructor() {
        this.isOptimized = false;
        this.metrics = {
            renderTimes: [],
            apiCallTimes: [],
            memoryUsage: [],
            frameRates: []
        };
        
        this.optimizations = {
            canvasOptimization: false,
            imageOptimization: false,
            debouncing: false,
            lazyLoading: false,
            caching: false
        };
        
        this.cache = new Map();
        this.imageCache = new Map();
        this.debounceTimers = new Map();
        
        this.initializeOptimizations();
    }
    
    initializeOptimizations() {
        // Enable basic optimizations
        this.enableCanvasOptimization();
        this.enableImageOptimization();
        this.enableDebouncing();
        this.enableCaching();
        
        // Monitor performance
        this.startPerformanceMonitoring();
        
        this.isOptimized = true;
        console.log('🚀 Performance optimizations enabled');
    }
    
    // Canvas Optimization
    enableCanvasOptimization() {
        if (this.optimizations.canvasOptimization) return;
        
        // Optimize canvas rendering
        this.optimizeCanvasRendering();
        
        // Enable hardware acceleration hints
        this.enableHardwareAcceleration();
        
        this.optimizations.canvasOptimization = true;
        console.log('✅ Canvas optimization enabled');
    }
    
    optimizeCanvasRendering() {
        // Override canvas context creation to add optimizations
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        
        HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes = {}) {
            if (contextType === '2d') {
                // Add performance-oriented context attributes
                const optimizedAttributes = {
                    alpha: false, // Disable alpha channel if not needed
                    desynchronized: true, // Allow desynchronized rendering
                    willReadFrequently: false, // Optimize for writing
                    ...contextAttributes
                };
                
                const ctx = originalGetContext.call(this, contextType, optimizedAttributes);
                
                if (ctx) {
                    // Set optimal rendering settings
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.textBaseline = 'top';
                    
                    // Add performance tracking to render methods
                    this.addRenderTracking(ctx);
                }
                
                return ctx;
            }
            
            return originalGetContext.call(this, contextType, contextAttributes);
        }.bind(this);
    }
    
    addRenderTracking(ctx) {
        const originalDrawImage = ctx.drawImage;
        const originalFillText = ctx.fillText;
        const originalFillRect = ctx.fillRect;
        
        ctx.drawImage = (...args) => {
            const start = performance.now();
            const result = originalDrawImage.apply(ctx, args);
            this.recordRenderTime(performance.now() - start);
            return result;
        };
        
        ctx.fillText = (...args) => {
            const start = performance.now();
            const result = originalFillText.apply(ctx, args);
            this.recordRenderTime(performance.now() - start);
            return result;
        };
        
        ctx.fillRect = (...args) => {
            const start = performance.now();
            const result = originalFillRect.apply(ctx, args);
            this.recordRenderTime(performance.now() - start);
            return result;
        };
    }
    
    enableHardwareAcceleration() {
        // Add CSS hints for hardware acceleration
        const style = document.createElement('style');
        style.textContent = `
            canvas {
                will-change: transform;
                transform: translateZ(0);
            }
            
            .card-preview-container {
                contain: layout style paint;
            }
            
            .form-field {
                contain: layout style;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Image Optimization
    enableImageOptimization() {
        if (this.optimizations.imageOptimization) return;
        
        this.setupImageCaching();
        this.setupImagePreloading();
        this.setupImageCompression();
        
        this.optimizations.imageOptimization = true;
        console.log('✅ Image optimization enabled');
    }
    
    setupImageCaching() {
        // Cache loaded images to avoid reloading
        const originalLoadImage = window.loadImage || function(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        };
        
        window.loadImage = async (src) => {
            if (this.imageCache.has(src)) {
                return this.imageCache.get(src);
            }
            
            const img = await originalLoadImage(src);
            this.imageCache.set(src, img);
            return img;
        };
    }
    
    setupImagePreloading() {
        // Preload common images
        const commonImages = [
            'assets/scp-logo.svg',
            'assets/logo-dark.svg'
        ];
        
        commonImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }
    
    setupImageCompression() {
        // Add image compression for uploaded photos
        window.compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    // Calculate new dimensions
                    let { width, height } = img;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                
                img.src = URL.createObjectURL(file);
            });
        };
    }
    
    // Debouncing
    enableDebouncing() {
        if (this.optimizations.debouncing) return;
        
        // Create optimized debounce function
        window.optimizedDebounce = (func, delay, immediate = false) => {
            const key = func.toString();
            
            return (...args) => {
                const callNow = immediate && !this.debounceTimers.has(key);
                
                if (this.debounceTimers.has(key)) {
                    clearTimeout(this.debounceTimers.get(key));
                }
                
                this.debounceTimers.set(key, setTimeout(() => {
                    this.debounceTimers.delete(key);
                    if (!immediate) func.apply(this, args);
                }, delay));
                
                if (callNow) func.apply(this, args);
            };
        };
        
        // Create throttle function for high-frequency events
        window.optimizedThrottle = (func, delay) => {
            let lastCall = 0;
            return (...args) => {
                const now = Date.now();
                if (now - lastCall >= delay) {
                    lastCall = now;
                    func.apply(this, args);
                }
            };
        };
        
        this.optimizations.debouncing = true;
        console.log('✅ Debouncing optimization enabled');
    }
    
    // Caching
    enableCaching() {
        if (this.optimizations.caching) return;
        
        // Setup intelligent caching
        this.setupAPIResponseCaching();
        this.setupComputationCaching();
        this.setupDOMQueryCaching();
        
        this.optimizations.caching = true;
        console.log('✅ Caching optimization enabled');
    }
    
    setupAPIResponseCaching() {
        // Cache API responses with TTL
        const apiCache = new Map();
        const cacheTTL = 5 * 60 * 1000; // 5 minutes
        
        window.cachedFetch = async (url, options = {}) => {
            const cacheKey = `${url}_${JSON.stringify(options)}`;
            const cached = apiCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < cacheTTL) {
                return cached.response.clone();
            }
            
            const response = await fetch(url, options);
            
            if (response.ok) {
                apiCache.set(cacheKey, {
                    response: response.clone(),
                    timestamp: Date.now()
                });
            }
            
            return response;
        };
    }
    
    setupComputationCaching() {
        // Cache expensive computations
        window.memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
            const cache = new Map();
            
            return (...args) => {
                const key = keyGenerator(...args);
                
                if (cache.has(key)) {
                    return cache.get(key);
                }
                
                const result = fn(...args);
                cache.set(key, result);
                
                // Limit cache size
                if (cache.size > 100) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                
                return result;
            };
        };
    }
    
    setupDOMQueryCaching() {
        // Cache DOM queries
        const domCache = new Map();
        
        window.cachedQuerySelector = (selector) => {
            if (domCache.has(selector)) {
                const cached = domCache.get(selector);
                // Verify element is still in DOM
                if (document.contains(cached)) {
                    return cached;
                }
                domCache.delete(selector);
            }
            
            const element = document.querySelector(selector);
            if (element) {
                domCache.set(selector, element);
            }
            
            return element;
        };
        
        window.cachedQuerySelectorAll = (selector) => {
            const cacheKey = `all_${selector}`;
            if (domCache.has(cacheKey)) {
                const cached = domCache.get(cacheKey);
                // Simple check if first element is still in DOM
                if (cached.length === 0 || document.contains(cached[0])) {
                    return cached;
                }
                domCache.delete(cacheKey);
            }
            
            const elements = Array.from(document.querySelectorAll(selector));
            domCache.set(cacheKey, elements);
            
            return elements;
        };
    }
    
    // Performance Monitoring
    startPerformanceMonitoring() {
        // Monitor frame rate
        this.monitorFrameRate();
        
        // Monitor memory usage
        this.monitorMemoryUsage();
        
        // Monitor long tasks
        this.monitorLongTasks();
        
        // Setup performance observer
        this.setupPerformanceObserver();
        
        console.log('📊 Performance monitoring started');
    }
    
    monitorFrameRate() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.metrics.frameRates.push(fps);
                
                // Keep only last 60 measurements
                if (this.metrics.frameRates.length > 60) {
                    this.metrics.frameRates.shift();
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    monitorMemoryUsage() {
        if (!performance.memory) return;
        
        setInterval(() => {
            const memory = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
                timestamp: Date.now()
            };
            
            this.metrics.memoryUsage.push(memory);
            
            // Keep only last 100 measurements
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }
            
            // Warn if memory usage is high
            if (memory.used > memory.limit * 0.8) {
                console.warn('⚠️ High memory usage detected:', memory);
                this.suggestMemoryOptimization();
            }
        }, 10000); // Every 10 seconds
    }
    
    monitorLongTasks() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // Tasks longer than 50ms
                            console.warn('⚠️ Long task detected:', {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.log('Long task monitoring not supported');
            }
        }
    }
    
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'measure') {
                            this.recordCustomMetric(entry.name, entry.duration);
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['measure'] });
            } catch (error) {
                console.log('Performance observer not fully supported');
            }
        }
    }
    
    // Utility Methods
    recordRenderTime(duration) {
        this.metrics.renderTimes.push(duration);
        
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }
    }
    
    recordAPICallTime(duration) {
        this.metrics.apiCallTimes.push(duration);
        
        if (this.metrics.apiCallTimes.length > 100) {
            this.metrics.apiCallTimes.shift();
        }
    }
    
    recordCustomMetric(name, value) {
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }
        
        this.metrics[name].push(value);
        
        if (this.metrics[name].length > 100) {
            this.metrics[name].shift();
        }
    }
    
    // Performance Analysis
    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            optimizations: this.optimizations,
            metrics: {
                averageRenderTime: this.calculateAverage(this.metrics.renderTimes),
                averageAPICallTime: this.calculateAverage(this.metrics.apiCallTimes),
                averageFrameRate: this.calculateAverage(this.metrics.frameRates),
                currentMemoryUsage: this.getCurrentMemoryUsage(),
                cacheHitRates: this.getCacheHitRates()
            },
            recommendations: this.getPerformanceRecommendations()
        };
        
        return report;
    }
    
    calculateAverage(array) {
        if (array.length === 0) return 0;
        return array.reduce((sum, value) => sum + value, 0) / array.length;
    }
    
    getCurrentMemoryUsage() {
        if (!performance.memory) return null;
        
        return {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
    }
    
    getCacheHitRates() {
        return {
            imageCache: this.imageCache.size,
            apiCache: this.cache.size,
            domCache: this.cache.size // Simplified
        };
    }
    
    getPerformanceRecommendations() {
        const recommendations = [];
        
        const avgRenderTime = this.calculateAverage(this.metrics.renderTimes);
        if (avgRenderTime > 16) { // 60fps = 16.67ms per frame
            recommendations.push('Consider reducing canvas rendering complexity');
        }
        
        const avgFrameRate = this.calculateAverage(this.metrics.frameRates);
        if (avgFrameRate < 30) {
            recommendations.push('Frame rate is low, consider optimizing animations');
        }
        
        const memory = this.getCurrentMemoryUsage();
        if (memory && memory.used > memory.limit * 0.7) {
            recommendations.push('Memory usage is high, consider clearing caches');
        }
        
        return recommendations;
    }
    
    // Optimization Suggestions
    suggestMemoryOptimization() {
        console.log('💡 Memory optimization suggestions:');
        console.log('- Clear image cache:', () => this.imageCache.clear());
        console.log('- Clear API cache:', () => this.cache.clear());
        console.log('- Reduce canvas resolution for preview');
    }
    
    // Manual Optimizations
    optimizeForBatchMode() {
        console.log('⚡ Optimizing for batch mode...');
        
        // Reduce preview updates
        this.disableRealTimePreview();
        
        // Increase debounce delays
        this.increaseDebouncingDelays();
        
        // Clear non-essential caches
        this.clearNonEssentialCaches();
    }
    
    optimizeForSingleMode() {
        console.log('⚡ Optimizing for single mode...');
        
        // Enable real-time preview
        this.enableRealTimePreview();
        
        // Reduce debounce delays
        this.reduceDebouncingDelays();
        
        // Preload common resources
        this.preloadCommonResources();
    }
    
    disableRealTimePreview() {
        window.DISABLE_REAL_TIME_PREVIEW = true;
    }
    
    enableRealTimePreview() {
        window.DISABLE_REAL_TIME_PREVIEW = false;
    }
    
    increaseDebouncingDelays() {
        window.DEBOUNCE_DELAY_MULTIPLIER = 2;
    }
    
    reduceDebouncingDelays() {
        window.DEBOUNCE_DELAY_MULTIPLIER = 1;
    }
    
    clearNonEssentialCaches() {
        // Keep only essential cached items
        const essentialKeys = ['sites', 'departments'];
        
        for (const [key, value] of this.cache.entries()) {
            if (!essentialKeys.some(essential => key.includes(essential))) {
                this.cache.delete(key);
            }
        }
    }
    
    preloadCommonResources() {
        // Preload resources commonly used in single mode
        const resources = [
            '/api/sites',
            '/api/departments'
        ];
        
        resources.forEach(url => {
            window.cachedFetch(url).catch(() => {
                // Ignore preload errors
            });
        });
    }
    
    // Cleanup
    cleanup() {
        this.cache.clear();
        this.imageCache.clear();
        this.debounceTimers.clear();
        
        // Clear metrics
        Object.keys(this.metrics).forEach(key => {
            this.metrics[key] = [];
        });
        
        console.log('🧹 Performance optimizer cleaned up');
    }
}

// Auto-initialize performance optimizer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceOptimizer = new PerformanceOptimizer();
    });
} else {
    window.performanceOptimizer = new PerformanceOptimizer();
}

// Make available globally
window.PerformanceOptimizer = PerformanceOptimizer;