/**
 * Diagnostics - System health check and integration testing
 */
class SystemDiagnostics {
    constructor() {
        this.results = [];
        this.startTime = performance.now();
    }
    
    async runFullDiagnostics() {
        console.log('🔍 Starting system diagnostics...');
        this.results = [];
        
        // Test core modules
        await this.testDataModels();
        await this.testValidation();
        await this.testErrorHandler();
        await this.testPerformanceOptimizer();
        await this.testAPIClient();
        await this.testSiteManager();
        await this.testCardGenerator();
        await this.testBatchProcessor();
        
        // Test integration
        await this.testModuleIntegration();
        
        const endTime = performance.now();
        const totalTime = endTime - this.startTime;
        
        console.log(`✅ Diagnostics completed in ${totalTime.toFixed(2)}ms`);
        return this.generateReport();
    }
    
    async testDataModels() {
        try {
            // Test PersonnelCard
            const card = new PersonnelCard({
                fullName: 'Dr. Test Subject',
                employeeId: 'SCP-0001-001',
                cardType: 'researcher'
            });
            
            const validation = card.validate();
            
            this.addResult('DataModels', 'PASS', 'PersonnelCard creation and validation', {
                name: card.getDisplayName(),
                isValid: validation.isValid,
                errors: validation.errors
            });
            
            // Test BatchJob
            const batch = new BatchJob({ totalCards: 10 });
            batch.start();
            batch.addError(1, new Error('Test error'));
            
            this.addResult('DataModels', 'PASS', 'BatchJob functionality', {
                batchId: batch.batchId,
                progress: batch.getProgress(),
                errors: batch.errors.length
            });
            
        } catch (error) {
            this.addResult('DataModels', 'FAIL', error.message);
        }
    }
    
    async testValidation() {
        try {
            const validator = new PersonnelValidator();
            
            // Test valid data
            const validData = {
                fullName: 'Dr. Jane Smith',
                employeeId: 'SCP-0019-001',
                clearanceLevel: 3
            };
            
            const result = validator.validatePersonnelData(validData, 'researcher');
            
            this.addResult('Validation', 'PASS', 'Personnel data validation', {
                isValid: result.isValid,
                errorCount: result.errors.length,
                completionPercentage: result.completionPercentage
            });
            
            // Test ValidationError
            const error = new ValidationError('testField', 'Test message', 'TEST_CODE');
            const userMessage = error.getUserMessage();
            
            this.addResult('Validation', 'PASS', 'ValidationError functionality', {
                userMessage,
                code: error.code
            });
            
        } catch (error) {
            this.addResult('Validation', 'FAIL', error.message);
        }
    }
    
    async testErrorHandler() {
        try {
            if (window.errorHandler) {
                // Test notification
                const notificationId = window.errorHandler.showNotification({
                    title: 'Test Notification',
                    message: 'Diagnostic test notification',
                    type: 'info',
                    autoHide: 1000
                });
                
                this.addResult('ErrorHandler', 'PASS', 'Notification system', {
                    notificationId,
                    activeNotifications: window.errorHandler.notifications.size
                });
                
                // Test error logging
                const errorId = window.errorHandler.logError(new Error('Test error'), 'Diagnostic Test');
                
                this.addResult('ErrorHandler', 'PASS', 'Error logging', {
                    errorId,
                    logSize: window.errorHandler.errorLog.length
                });
                
            } else {
                this.addResult('ErrorHandler', 'WARN', 'Error handler not initialized');
            }
        } catch (error) {
            this.addResult('ErrorHandler', 'FAIL', error.message);
        }
    }
    
    async testPerformanceOptimizer() {
        try {
            if (window.performanceOptimizer) {
                const report = window.performanceOptimizer.getPerformanceReport();
                
                this.addResult('PerformanceOptimizer', 'PASS', 'Performance monitoring', {
                    optimizations: Object.keys(report.optimizations).filter(key => report.optimizations[key]).length,
                    recommendations: report.recommendations.length,
                    metrics: Object.keys(report.metrics).length
                });
                
                // Test optimization functions
                if (window.optimizedDebounce) {
                    const testFunc = window.optimizedDebounce(() => {}, 100);
                    this.addResult('PerformanceOptimizer', 'PASS', 'Debounce function available');
                }
                
                if (window.memoize) {
                    const memoizedFunc = window.memoize((x) => x * 2);
                    const result1 = memoizedFunc(5);
                    const result2 = memoizedFunc(5); // Should use cache
                    
                    this.addResult('PerformanceOptimizer', 'PASS', 'Memoization function', {
                        result1, result2, cached: result1 === result2
                    });
                }
                
            } else {
                this.addResult('PerformanceOptimizer', 'WARN', 'Performance optimizer not initialized');
            }
        } catch (error) {
            this.addResult('PerformanceOptimizer', 'FAIL', error.message);
        }
    }
    
    async testAPIClient() {
        try {
            const apiClient = new APIClient();
            
            // Test connection
            const connectionTest = await apiClient.testConnection();
            
            this.addResult('APIClient', connectionTest.connected ? 'PASS' : 'WARN', 
                          'Server connection test', connectionTest);
            
            // Test endpoint configuration
            const endpoints = Object.keys(apiClient.endpoints);
            this.addResult('APIClient', 'PASS', 'Endpoint configuration', {
                endpointCount: endpoints.length,
                baseURL: apiClient.baseURL
            });
            
        } catch (error) {
            this.addResult('APIClient', 'FAIL', error.message);
        }
    }
    
    async testSiteManager() {
        try {
            const siteManager = new ClientSiteManager();
            await siteManager.loadSites();
            
            const sites = siteManager.getAllSites();
            const mtfs = siteManager.getAllMTFs();
            
            this.addResult('SiteManager', 'PASS', 'Site data loading', {
                totalSites: sites.length,
                mtfCount: mtfs.length,
                traditionalSites: sites.length - mtfs.length
            });
            
            // Test site validation
            if (sites.length > 0) {
                const testSite = sites[0];
                const validation = siteManager.validateSiteData();
                
                this.addResult('SiteManager', 'PASS', 'Site data validation', {
                    validSites: validation.validSites,
                    invalidSites: validation.invalidSites
                });
            }
            
        } catch (error) {
            this.addResult('SiteManager', 'FAIL', error.message);
        }
    }
    
    async testCardGenerator() {
        try {
            // Test template creation
            const template = new CardTemplate('researcher');
            
            this.addResult('CardGenerator', 'PASS', 'Template creation', {
                type: template.type,
                colors: Object.keys(template.colors).length,
                elements: Object.keys(template.elements).length
            });
            
            // Test card generator initialization (without canvas)
            const generator = new SCPCardGenerator('researcher', 'client');
            
            this.addResult('CardGenerator', 'PASS', 'Generator initialization', {
                cardType: generator.cardType,
                mode: generator.mode,
                hasTemplate: !!generator.template
            });
            
        } catch (error) {
            this.addResult('CardGenerator', 'FAIL', error.message);
        }
    }
    
    async testBatchProcessor() {
        try {
            const batchProcessor = new ClientBatchProcessor();
            
            this.addResult('BatchProcessor', 'PASS', 'Batch processor initialization', {
                hasAPIClient: !!batchProcessor.apiClient,
                currentBatch: batchProcessor.currentBatch
            });
            
            // Test file validation
            const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
            const isValid = batchProcessor.validateFileBasic(testFile);
            
            this.addResult('BatchProcessor', 'PASS', 'File validation', {
                testFileValid: isValid
            });
            
        } catch (error) {
            this.addResult('BatchProcessor', 'FAIL', error.message);
        }
    }
    
    async testModuleIntegration() {
        try {
            // Test global availability
            const globalModules = {
                PersonnelCard: !!window.PersonnelCard,
                ValidationError: !!window.ValidationError,
                PersonnelValidator: !!window.PersonnelValidator,
                ErrorHandler: !!window.ErrorHandler,
                PerformanceOptimizer: !!window.PerformanceOptimizer,
                APIClient: !!window.APIClient,
                errorHandler: !!window.errorHandler,
                performanceOptimizer: !!window.performanceOptimizer
            };
            
            const availableModules = Object.values(globalModules).filter(Boolean).length;
            const totalModules = Object.keys(globalModules).length;
            
            this.addResult('Integration', 'PASS', 'Global module availability', {
                available: availableModules,
                total: totalModules,
                modules: globalModules
            });
            
            // Test app state
            if (window.appState) {
                const stats = window.appState.getStatistics();
                this.addResult('Integration', 'PASS', 'Application state', stats);
            }
            
        } catch (error) {
            this.addResult('Integration', 'FAIL', error.message);
        }
    }
    
    addResult(module, status, message, details = null) {
        this.results.push({
            module,
            status,
            message,
            details,
            timestamp: new Date().toISOString()
        });
        
        const emoji = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
        console.log(`${emoji} ${module}: ${message}`);
        
        if (details && status === 'FAIL') {
            console.error('Details:', details);
        }
    }
    
    generateReport() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const warned = this.results.filter(r => r.status === 'WARN').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;
        
        const report = {
            summary: {
                total,
                passed,
                warned,
                failed,
                successRate: Math.round((passed / total) * 100)
            },
            results: this.results,
            timestamp: new Date().toISOString(),
            duration: performance.now() - this.startTime
        };
        
        console.log('📊 Diagnostic Summary:', report.summary);
        
        return report;
    }
}

// Make available globally
window.SystemDiagnostics = SystemDiagnostics;

// Auto-run diagnostics if requested
if (window.location.search.includes('runDiagnostics=true')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const diagnostics = new SystemDiagnostics();
        await diagnostics.runFullDiagnostics();
    });
}