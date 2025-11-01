/**
 * Module Loader - Ensures all modules are properly loaded before initialization
 */
class ModuleLoader {
    constructor() {
        this.requiredModules = [
            'PersonnelCard',
            'ValidationError', 
            'PersonnelValidator',
            'ErrorHandler',
            'PerformanceOptimizer',
            'APIClient',
            'ClientSiteManager',
            'SCPCardGenerator',
            'ClientBatchProcessor',
            'UIController',
            'SCPCardApp'
        ];
        
        // Core modules that are absolutely required
        this.coreModules = [
            'PersonnelCard',
            'ValidationError',
            'APIClient',
            'SCPCardApp'
        ];
        
        this.loadedModules = new Set();
        this.checkInterval = null;
        this.maxWaitTime = 5000; // 5 seconds
        this.startTime = Date.now();
    }
    
    /**
     * Wait for all required modules to be loaded
     */
    async waitForModules() {
        return new Promise((resolve, reject) => {
            const checkModules = () => {
                const currentTime = Date.now();
                
                // Check if we've exceeded max wait time
                if (currentTime - this.startTime > this.maxWaitTime) {
                    clearInterval(this.checkInterval);
                    const missing = this.getMissingModules();
                    
                    // Check if core modules are at least available
                    const coreLoaded = this.coreModules.every(moduleName => window[moduleName]);
                    if (coreLoaded) {
                        console.log('⚠️ Timeout reached but core modules available, proceeding...');
                        resolve(this.getModuleStatus());
                        return;
                    }
                    
                    reject(new Error(`Timeout waiting for modules: ${missing.join(', ')}`));
                    return;
                }
                
                // Check which modules are loaded
                this.loadedModules.clear();
                this.requiredModules.forEach(moduleName => {
                    if (window[moduleName]) {
                        this.loadedModules.add(moduleName);
                    }
                });
                
                const loadedCount = this.loadedModules.size;
                const totalCount = this.requiredModules.length;
                
                console.log(`📦 Modules loaded: ${loadedCount}/${totalCount}`);
                
                // Check if core modules are loaded
                const coreLoaded = this.coreModules.every(moduleName => window[moduleName]);
                
                // If all modules are loaded, resolve
                if (loadedCount === totalCount) {
                    clearInterval(this.checkInterval);
                    console.log('✅ All modules loaded successfully');
                    resolve(this.getModuleStatus());
                } else if (coreLoaded && currentTime - this.startTime > 1000) {
                    // If core modules are loaded and we've waited at least 1 second, proceed
                    clearInterval(this.checkInterval);
                    console.log(`⚠️ Proceeding with ${loadedCount}/${totalCount} modules loaded (core modules available)`);
                    resolve(this.getModuleStatus());
                }
            };
            
            // Start checking immediately
            checkModules();
            
            // Continue checking every 100ms
            this.checkInterval = setInterval(checkModules, 100);
        });
    }
    
    /**
     * Get list of missing modules
     */
    getMissingModules() {
        return this.requiredModules.filter(moduleName => !window[moduleName]);
    }
    
    /**
     * Get current module loading status
     */
    getModuleStatus() {
        const missing = this.getMissingModules();
        const loaded = Array.from(this.loadedModules);
        
        return {
            loaded,
            missing,
            loadedCount: loaded.length,
            totalCount: this.requiredModules.length,
            isComplete: missing.length === 0,
            loadTime: Date.now() - this.startTime
        };
    }
    
    /**
     * Initialize application with proper module loading
     */
    async initializeApp() {
        try {
            console.log('🚀 Starting module loading...');
            
            // Wait for all modules to load
            const status = await this.waitForModules();
            
            console.log(`✅ All modules loaded in ${status.loadTime}ms`);
            
            // Initialize the main application
            if (window.SCPCardApp) {
                const app = new SCPCardApp();
                await app.initialize();
                return app;
            } else {
                throw new Error('SCPCardApp not available after module loading');
            }
            
        } catch (error) {
            console.error('❌ Module loading failed:', error);
            
            // Show user-friendly error message
            this.showLoadingError(error);
            
            throw error;
        }
    }
    
    /**
     * Show loading error to user
     */
    showLoadingError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'module-loading-error';
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #f8d7da;
                color: #721c24;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #f5c6cb;
                max-width: 500px;
                z-index: 10000;
                font-family: Arial, sans-serif;
            ">
                <h3 style="margin-top: 0;">⚠️ Loading Error</h3>
                <p>The SCP Card Generator failed to load properly.</p>
                <details>
                    <summary>Error Details</summary>
                    <pre style="background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto;">${error.message}</pre>
                </details>
                <div style="margin-top: 15px;">
                    <button onclick="window.location.reload()" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Reload Page</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Show loading progress
     */
    showLoadingProgress() {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'module-loading-progress';
        progressDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                font-family: Arial, sans-serif;
                text-align: center;
            ">
                <h3 style="margin-top: 0;">🔧 Loading SCP Card Generator</h3>
                <div style="
                    width: 200px;
                    height: 4px;
                    background: #e9ecef;
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 15px 0;
                ">
                    <div id="loading-progress-bar" style="
                        height: 100%;
                        background: #007bff;
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
                <p id="loading-status">Initializing modules...</p>
            </div>
        `;
        
        document.body.appendChild(progressDiv);
        
        // Update progress periodically
        const updateProgress = () => {
            const status = this.getModuleStatus();
            const percentage = (status.loadedCount / status.totalCount) * 100;
            
            const progressBar = document.getElementById('loading-progress-bar');
            const statusText = document.getElementById('loading-status');
            
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }
            
            if (statusText) {
                statusText.textContent = `Loading modules... ${status.loadedCount}/${status.totalCount}`;
            }
            
            if (status.isComplete) {
                setTimeout(() => {
                    const progressDiv = document.getElementById('module-loading-progress');
                    if (progressDiv) {
                        progressDiv.remove();
                    }
                }, 500);
            }
        };
        
        const progressInterval = setInterval(() => {
            updateProgress();
            if (this.getModuleStatus().isComplete) {
                clearInterval(progressInterval);
            }
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const moduleLoader = new ModuleLoader();
    
    // Show loading progress
    moduleLoader.showLoadingProgress();
    
    try {
        // Initialize the application with proper module loading
        const app = await moduleLoader.initializeApp();
        
        // Make app globally available
        window.scpCardApp = app;
        
        console.log('🎉 SCP Card Generator initialized successfully');
        
        // Add debug commands to console
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    SCP FOUNDATION                            ║
║                  Card Generator Client                       ║
║                                                              ║
║  Status: OPERATIONAL                                         ║
║  Version: 1.0.0                                              ║
║  Debug: window.scpCardApp.getDebugInfo()                     ║
║  Diagnostics: await window.scpCardApp.runDiagnostics()      ║
║                                                              ║
║  SECURE • CONTAIN • PROTECT                                  ║
╚══════════════════════════════════════════════════════════════╝
        `);
        
    } catch (error) {
        console.error('💥 Failed to initialize SCP Card Generator:', error);
    }
});

// Make ModuleLoader available globally for debugging
window.ModuleLoader = ModuleLoader;