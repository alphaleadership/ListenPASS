/**
 * SCP Card Generator - Main Application Entry Point
 * Integrates all client-side modules and initializes the complete application
 */

class SCPCardApp {
    constructor() {
        this.uiController = null;
        this.cardGenerator = null;
        this.siteManager = null;
        this.batchProcessor = null;
        this.apiClient = null;
        
        this.isInitialized = false;
        this.currentMode = 'single';
        this.currentCardType = 'researcher';
        
        // Global error handler
        this.errorHandler = null;
        
        // Performance monitoring
        this.performanceMetrics = {
            initTime: 0,
            renderTime: 0,
            apiCalls: 0
        };
    }
    
    async initialize() {
        const startTime = performance.now();
        
        try {
            console.log('🚀 Initializing SCP Card Generator Application...');
            
            // Initialize core services first
            await this.initializeCoreServices();
            
            // Initialize UI components
            await this.initializeUIComponents();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Initialize error handling
            this.initializeErrorHandling();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // Mark as initialized
            this.isInitialized = true;
            
            const endTime = performance.now();
            this.performanceMetrics.initTime = endTime - startTime;
            
            console.log(`✅ Application initialized successfully in ${Math.round(this.performanceMetrics.initTime)}ms`);
            
            // Dispatch initialization complete event
            this.dispatchEvent('appInitialized', {
                initTime: this.performanceMetrics.initTime,
                version: '1.0.0'
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }
    
    async initializeCoreServices() {
        console.log('📡 Initializing core services...');
        
        // Initialize API client
        this.apiClient = new APIClient();
        
        // Test server connectivity
        const connectionTest = await this.apiClient.testConnection();
        if (connectionTest.connected) {
            console.log('✅ Server connection established');
        } else {
            console.log('⚠️ Server not available - running in offline mode');
            console.log('💡 Make sure the server is running on the correct port');
        }
        
        // Initialize site manager
        this.siteManager = new ClientSiteManager();
        
        // Initialize batch processor
        this.batchProcessor = new ClientBatchProcessor();
        
        // Make services globally available
        window.scpCardApp = this;
        window.apiClient = this.apiClient;
        window.siteManager = this.siteManager;
        window.batchProcessor = this.batchProcessor;
    }
    
    async initializeUIComponents() {
        console.log('🎨 Initializing UI components...');
        
        // Initialize UI controller first
        this.uiController = new UIController();
        
        // Initialize card generator with default type (using UI controller's async method)
        try {
            await this.uiController.initializeCardGenerator(this.currentCardType);
            this.cardGenerator = this.uiController.cardGenerator;
            console.log('✅ Card generator initialized through UI controller');
        } catch (error) {
            console.warn('⚠️ Card generator initialization delayed:', error.message);
            // The UI controller will handle retries
        }
        
        // Make UI components globally available
        window.uiController = this.uiController;
        if (this.cardGenerator) {
            window.cardGenerator = this.cardGenerator;
        }
    }
    
    setupGlobalEventListeners() {
        console.log('🎧 Setting up global event listeners...');
        
        // Listen for card type changes
        document.addEventListener('cardTypeChanged', (event) => {
            this.handleCardTypeChange(event.detail);
        });
        
        // Listen for mode changes
        document.addEventListener('modeChanged', (event) => {
            this.handleModeChange(event.detail);
        });
        
        // Listen for card generation events
        document.addEventListener('cardGenerated', (event) => {
            this.handleCardGenerated(event.detail);
        });
        
        // Listen for batch events
        document.addEventListener('batchStarted', (event) => {
            this.handleBatchStarted(event.detail);
        });
        
        document.addEventListener('batchCompleted', (event) => {
            this.handleBatchCompleted(event.detail);
        });
        
        // Listen for errors
        document.addEventListener('applicationError', (event) => {
            this.handleApplicationError(event.detail);
        });
        
        // Window events
        window.addEventListener('beforeunload', (event) => {
            this.handleBeforeUnload(event);
        });
        
        window.addEventListener('online', () => {
            this.handleConnectionChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionChange(false);
        });
    }
    
    initializeErrorHandling() {
        console.log('🛡️ Initializing error handling...');
        
        // Initialize enhanced error handler if available
        if (window.ErrorHandler) {
            this.errorHandler = new ErrorHandler();
            window.errorHandler = this.errorHandler;
        }
        
        // Global error handlers
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, 'JavaScript Error');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            // Don't treat successful API responses as errors
            if (event.reason && event.reason.data && event.reason.status >= 200 && event.reason.status < 300) {
                console.warn('Preventing successful API response from being treated as unhandled rejection');
                event.preventDefault(); // Prevent the error from being logged
                return;
            }
            
            this.handleGlobalError(event.reason, 'Unhandled Promise Rejection');
        });
    }
    
    async loadInitialData() {
        console.log('📊 Loading initial data...');
        
        try {
            // Load sites and departments
            await this.siteManager.loadSites();
            console.log(`✅ Loaded ${this.siteManager.getAllSites().length} sites`);
            
            // Initialize default form values
            this.setDefaultFormValues();
            
            // Update UI with loaded data
            this.uiController.populateSiteSelector();
            
        } catch (error) {
            console.warn('⚠️ Some initial data failed to load:', error);
            // Continue with offline data
        }
    }
    
    setupPerformanceMonitoring() {
        console.log('📈 Setting up performance monitoring...');
        
        // Monitor API calls
        if (this.apiClient) {
            try {
                this.apiClient.addRequestInterceptor((config) => {
                    this.performanceMetrics.apiCalls++;
                    return config;
                });
            } catch (error) {
                console.warn('Could not add API monitoring:', error);
            }
        }
        
        // Monitor render performance
        const originalRenderCard = this.cardGenerator?.renderCard;
        if (originalRenderCard) {
            this.cardGenerator.renderCard = (...args) => {
                const startTime = performance.now();
                const result = originalRenderCard.apply(this.cardGenerator, args);
                const endTime = performance.now();
                this.performanceMetrics.renderTime = endTime - startTime;
                return result;
            };
        }
    }
    
    setDefaultFormValues() {
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const expiryDate = nextYear.toISOString().split('T')[0];
        
        const issueDateField = document.getElementById('issueDate');
        const expirationDateField = document.getElementById('expirationDate');
        
        if (issueDateField && !issueDateField.value) {
            issueDateField.value = today;
        }
        
        if (expirationDateField && !expirationDateField.value) {
            expirationDateField.value = expiryDate;
        }
    }
    
    // Event Handlers
    
    handleCardTypeChange(detail) {
        console.log(`🔄 Card type changed to: ${detail.cardType}`);
        
        this.currentCardType = detail.cardType;
        
        // Update card generator through UI controller
        if (this.uiController) {
            // The UI controller will handle the async initialization
            this.uiController.initializeCardGenerator(detail.cardType).then(() => {
                this.cardGenerator = this.uiController.cardGenerator;
                window.cardGenerator = this.cardGenerator;
            }).catch(error => {
                console.warn('Card generator update delayed:', error.message);
            });
        }
        
        // Update performance metrics
        this.trackUserAction('cardTypeChange', { cardType: detail.cardType });
    }
    
    handleModeChange(detail) {
        console.log(`🔄 Mode changed to: ${detail.mode}`);
        
        this.currentMode = detail.mode;
        
        // Update UI components based on mode
        if (detail.mode === 'batch') {
            this.optimizeForBatchMode();
        } else {
            this.optimizeForSingleMode();
        }
        
        this.trackUserAction('modeChange', { mode: detail.mode });
    }
    
    handleCardGenerated(detail) {
        console.log('✅ Card generated successfully');
        
        // Update performance metrics
        this.trackUserAction('cardGenerated', {
            cardType: detail.cardType,
            renderTime: this.performanceMetrics.renderTime
        });
        
        // Show success notification
        if (this.errorHandler) {
            this.errorHandler.showNotification({
                title: 'Success',
                message: 'Card generated successfully',
                type: 'success',
                autoHide: 3000
            });
        }
    }
    
    handleBatchStarted(detail) {
        console.log(`🚀 Batch generation started: ${detail.totalCards} cards`);
        
        this.trackUserAction('batchStarted', {
            totalCards: detail.totalCards,
            format: detail.format
        });
    }
    
    handleBatchCompleted(detail) {
        console.log(`✅ Batch generation completed: ${detail.successCount}/${detail.totalCards} cards`);
        
        this.trackUserAction('batchCompleted', {
            totalCards: detail.totalCards,
            successCount: detail.successCount,
            failedCount: detail.failedCount,
            duration: detail.duration
        });
        
        // Show completion notification
        if (this.errorHandler) {
            this.errorHandler.showNotification({
                title: 'Batch Complete',
                message: `Generated ${detail.successCount} cards successfully`,
                type: 'success',
                autoHide: 5000
            });
        }
    }
    
    handleApplicationError(detail) {
        console.error('❌ Application error:', detail);
        
        this.trackUserAction('error', {
            type: detail.type,
            message: detail.message,
            component: detail.component
        });
        
        // Show error notification
        if (this.errorHandler) {
            this.errorHandler.showNotification({
                title: 'Error',
                message: detail.message,
                type: 'error',
                autoHide: false
            });
        }
    }
    
    handleGlobalError(error, type) {
        // Don't treat successful API responses as errors
        if (error && error.data && error.status >= 200 && error.status < 300) {
            console.warn('Ignoring successful response treated as error:', error);
            return;
        }
        
        console.error(`❌ Global ${type}:`, error);
        
        // Prevent error loops
        if (this.isHandlingError) return;
        this.isHandlingError = true;
        
        try {
            this.dispatchEvent('applicationError', {
                type: type,
                message: error.message || error,
                stack: error.stack,
                component: 'global'
            });
        } finally {
            this.isHandlingError = false;
        }
    }
    
    handleBeforeUnload(event) {
        // Check if there are unsaved changes or ongoing operations
        if (this.batchProcessor?.currentBatch && this.batchProcessor.currentBatch.status === 'processing') {
            event.preventDefault();
            event.returnValue = 'Batch generation is in progress. Are you sure you want to leave?';
            return event.returnValue;
        }
    }
    
    handleConnectionChange(isOnline) {
        console.log(`🌐 Connection status: ${isOnline ? 'Online' : 'Offline'}`);
        
        if (this.errorHandler) {
            this.errorHandler.showNotification({
                title: isOnline ? 'Back Online' : 'Offline',
                message: isOnline 
                    ? 'Server connection restored' 
                    : 'Working in offline mode',
                type: isOnline ? 'success' : 'warning',
                autoHide: 3000
            });
        }
        
        // Update UI to reflect connection status
        document.body.classList.toggle('offline', !isOnline);
    }
    
    handleInitializationError(error) {
        // Show critical error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'critical-error';
        errorMessage.innerHTML = `
            <div class="error-content">
                <h2>⚠️ Application Failed to Initialize</h2>
                <p>The SCP Card Generator could not start properly.</p>
                <details>
                    <summary>Error Details</summary>
                    <pre>${error.message}\n${error.stack}</pre>
                </details>
                <button onclick="window.location.reload()" class="btn-primary">
                    Reload Application
                </button>
            </div>
        `;
        
        document.body.appendChild(errorMessage);
    }
    
    // Optimization Methods
    
    optimizeForBatchMode() {
        console.log('⚡ Optimizing for batch mode...');
        
        // Disable real-time preview updates
        if (this.cardGenerator) {
            this.cardGenerator.disableRealTimePreview = true;
        }
        
        // Reduce UI update frequency
        this.uiUpdateThrottle = 1000; // 1 second
    }
    
    optimizeForSingleMode() {
        console.log('⚡ Optimizing for single mode...');
        
        // Enable real-time preview updates
        if (this.cardGenerator) {
            this.cardGenerator.disableRealTimePreview = false;
        }
        
        // Increase UI update frequency
        this.uiUpdateThrottle = 150; // 150ms
    }
    
    // Utility Methods
    
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }
    
    trackUserAction(action, data = {}) {
        // Simple analytics tracking
        const actionData = {
            action,
            timestamp: new Date().toISOString(),
            sessionId: this.getSessionId(),
            ...data
        };
        
        // Store in localStorage for basic analytics
        try {
            const actions = JSON.parse(localStorage.getItem('scpCardGenerator_actions') || '[]');
            actions.push(actionData);
            
            // Keep only last 100 actions
            if (actions.length > 100) {
                actions.splice(0, actions.length - 100);
            }
            
            localStorage.setItem('scpCardGenerator_actions', JSON.stringify(actions));
        } catch (error) {
            console.warn('Could not track user action:', error);
        }
    }
    
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return this.sessionId;
    }
    
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null,
            timing: performance.timing ? {
                loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            } : null
        };
    }
    
    // Public API Methods
    
    async switchCardType(cardType) {
        if (!this.isInitialized) {
            throw new Error('Application not initialized');
        }
        
        if (this.uiController) {
            this.uiController.switchCardType(cardType);
        }
    }
    
    async switchMode(mode) {
        if (!this.isInitialized) {
            throw new Error('Application not initialized');
        }
        
        if (this.uiController) {
            this.uiController.toggleMode(mode);
        }
    }
    
    async generateCard(formData) {
        if (!this.isInitialized) {
            throw new Error('Application not initialized');
        }
        
        if (this.cardGenerator) {
            return this.cardGenerator.generateCard(formData);
        }
    }
    
    async startBatchGeneration(file, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Application not initialized');
        }
        
        if (this.batchProcessor) {
            return this.batchProcessor.uploadFile(file);
        }
    }
    
    // Debug Methods
    
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentMode: this.currentMode,
            currentCardType: this.currentCardType,
            performanceMetrics: this.getPerformanceMetrics(),
            components: {
                uiController: !!this.uiController,
                cardGenerator: !!this.cardGenerator,
                siteManager: !!this.siteManager,
                batchProcessor: !!this.batchProcessor,
                apiClient: !!this.apiClient,
                errorHandler: !!this.errorHandler
            },
            sites: this.siteManager ? this.siteManager.getAllSites().length : 0,
            version: '1.0.0'
        };
    }
    
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            components: {},
            connectivity: {},
            performance: this.getPerformanceMetrics(),
            errors: []
        };
        
        // Test components
        try {
            diagnostics.components.uiController = this.uiController ? 'OK' : 'Missing';
            diagnostics.components.cardGenerator = this.cardGenerator ? 'OK' : 'Missing';
            diagnostics.components.siteManager = this.siteManager ? 'OK' : 'Missing';
            diagnostics.components.batchProcessor = this.batchProcessor ? 'OK' : 'Missing';
            diagnostics.components.apiClient = this.apiClient ? 'OK' : 'Missing';
        } catch (error) {
            diagnostics.errors.push(`Component test failed: ${error.message}`);
        }
        
        // Test connectivity
        try {
            if (this.apiClient) {
                const connectionTest = await this.apiClient.testConnection();
                diagnostics.connectivity.server = connectionTest.connected ? 'Connected' : 'Offline';
                diagnostics.connectivity.serverVersion = connectionTest.version;
            }
        } catch (error) {
            diagnostics.connectivity.server = 'Error';
            diagnostics.errors.push(`Connectivity test failed: ${error.message}`);
        }
        
        // Test site data
        try {
            if (this.siteManager) {
                const sites = this.siteManager.getAllSites();
                diagnostics.components.siteData = `${sites.length} sites loaded`;
                
                const validation = this.siteManager.validateSiteData();
                diagnostics.components.siteValidation = `${validation.validSites} valid, ${validation.invalidSites} invalid`;
            }
        } catch (error) {
            diagnostics.errors.push(`Site data test failed: ${error.message}`);
        }
        
        return diagnostics;
    }
}

// Note: Application initialization is now handled by module-loader.js
// This ensures all modules are properly loaded before initialization

// Make class globally available
window.SCPCardApp = SCPCardApp;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SCPCardApp;
}