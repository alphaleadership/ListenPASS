/**
 * API Client - Unified communication with SCP Card Generator server
 * Handles all HTTP requests with error handling, retry logic, and timeouts
 */
class APIClient {
    constructor() {
        // Detect the current server port from window.location
        const currentPort = window.location.port;
        const currentHost = window.location.hostname;
        const currentProtocol = window.location.protocol;
        
        // Use current server URL or fallback to relative paths
        if (currentPort && currentPort !== '80' && currentPort !== '443') {
            this.baseURL = `${currentProtocol}//${currentHost}:${currentPort}/api`;
        } else {
            this.baseURL = '/api';
        }
        
        this.timeout = 30000; // 30 seconds default timeout
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second base delay
        
        // Endpoint definitions
        this.endpoints = {
            // Card generation
            generateCard: '/generate-card',
            validatePersonnel: '/validate-personnel',
            
            // Sites and departments
            sites: '/sites',
            siteDetails: '/sites/{siteId}',
            siteDepartments: '/sites/{siteId}/departments',
            validateAssignment: '/sites/validate-assignment',
            searchSites: '/sites/search',
            mtfs: '/sites/mtf',
            
            // Batch processing
            uploadData: '/upload-data',
            batchGenerate: '/batch-generate',
            batchStatus: '/batch-status/{batchId}',
            downloadBatch: '/download-batch/{batchId}',
            previewBatch: '/preview-batch',
            cancelBatch: '/batch/{batchId}',
            pauseBatch: '/batch/{batchId}/pause',
            resumeBatch: '/batch/{batchId}/resume',
            
            // System
            status: '/status',
            personnel: '/personnel/{employeeId}'
        };
        
        // Request interceptors
        this.requestInterceptors = [];
        this.responseSuccessInterceptors = [];
        this.responseErrorInterceptors = [];
        
        // Add default interceptors
        this.addDefaultInterceptors();
    }
    
    /**
     * Add default request/response interceptors
     */
    addDefaultInterceptors() {
        // Request interceptor for logging
        this.requestInterceptors.push((config) => {
            console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
            return config;
        });
        
        // Response success interceptor
        this.responseSuccessInterceptors.push((response) => {
            // This is for successful responses
            return response;
        });
        
        // Response error interceptor
        this.responseErrorInterceptors.push((error) => {
            // This is for actual errors only
            if (error && error.message && !error.message.includes('Failed to fetch')) {
                console.error(`[API Error] ${error.message}`);
            }
            return error; // Don't re-throw here, just return
        });
    }
    
    /**
     * Build URL with parameters
     */
    buildURL(endpoint, params = {}) {
        let url = this.baseURL + endpoint;
        
        // Replace path parameters
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        });
        
        return url;
    }
    
    /**
     * Create request configuration
     */
    createRequestConfig(method, url, options = {}) {
        const config = {
            method: method.toUpperCase(),
            url,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: options.timeout || this.timeout,
            ...options
        };
        
        // Apply request interceptors
        return this.requestInterceptors.reduce((config, interceptor) => {
            return interceptor(config) || config;
        }, config);
    }
    
    /**
     * Execute HTTP request with retry logic
     */
    async executeRequest(config, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);
            
            const fetchConfig = {
                method: config.method,
                headers: config.headers,
                signal: controller.signal
            };
            
            // Add body for non-GET requests
            if (config.method !== 'GET' && config.data) {
                if (config.data instanceof FormData) {
                    // Remove Content-Type for FormData (browser sets it automatically)
                    delete fetchConfig.headers['Content-Type'];
                    fetchConfig.body = config.data;
                } else {
                    fetchConfig.body = JSON.stringify(config.data);
                }
            }
            
            const response = await fetch(config.url, fetchConfig);
            clearTimeout(timeoutId);
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new APIError(
                    errorData.error || `HTTP ${response.status}`,
                    response.status,
                    errorData.code,
                    errorData
                );
            }
            
            // Parse response
            const data = await this.parseResponse(response);
            
            // Apply response success interceptors
            const responseObj = { data, status: response.status, headers: response.headers };
            
            this.responseSuccessInterceptors.forEach(interceptor => {
                try {
                    interceptor(responseObj);
                } catch (error) {
                    console.warn('Response success interceptor error:', error);
                }
            });
            
            return data;
            
        } catch (error) {
            // Handle specific error types
            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408, 'TIMEOUT');
            }
            
            if (error instanceof APIError) {
                throw error;
            }
            
            // Network errors - retry if possible
            if (this.shouldRetry(error, retryCount)) {
                const delay = this.calculateRetryDelay(retryCount);
                console.log(`[API] Retrying request in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                
                await this.sleep(delay);
                return this.executeRequest(config, retryCount + 1);
            }
            
            // Apply error interceptors
            this.responseErrorInterceptors.forEach(interceptor => {
                try {
                    interceptor(error);
                } catch (e) {
                    console.warn('Response error interceptor error:', e);
                }
            });
            
            throw error;
        }
    }
    
    /**
     * Parse error response
     */
    async parseErrorResponse(response) {
        try {
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (e) {
            return { error: `HTTP ${response.status}` };
        }
    }
    
    /**
     * Parse successful response
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        if (contentType && contentType.includes('text/')) {
            return await response.text();
        }
        
        return await response.blob();
    }
    
    /**
     * Determine if request should be retried
     */
    shouldRetry(error, retryCount) {
        if (retryCount >= this.maxRetries) return false;
        
        // Retry on network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) return true;
        
        // Retry on specific HTTP status codes
        if (error instanceof APIError) {
            const retryableStatuses = [408, 429, 500, 502, 503, 504];
            return retryableStatuses.includes(error.status);
        }
        
        return false;
    }
    
    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(retryCount) {
        return this.retryDelay * Math.pow(2, retryCount) + Math.random() * 1000;
    }
    
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Generic HTTP methods
     */
    async get(endpoint, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        const config = this.createRequestConfig('GET', url, options);
        return this.executeRequest(config);
    }
    
    async post(endpoint, data = null, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        const config = this.createRequestConfig('POST', url, { ...options, data });
        return this.executeRequest(config);
    }
    
    async put(endpoint, data = null, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        const config = this.createRequestConfig('PUT', url, { ...options, data });
        return this.executeRequest(config);
    }
    
    async delete(endpoint, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        const config = this.createRequestConfig('DELETE', url, options);
        return this.executeRequest(config);
    }
    
    // ==================== CARD GENERATION METHODS ====================
    
    /**
     * Generate a single card on the server
     */
    async generateCardOnServer(cardData, options = {}) {
        const requestData = {
            cardData,
            outputFormat: options.format || 'png',
            resolution: options.resolution || 300,
            includeBackside: options.includeBackside || false
        };
        
        return this.post(this.endpoints.generateCard, requestData);
    }
    
    /**
     * Validate personnel data
     */
    async validatePersonnelData(personnelData) {
        return this.post(this.endpoints.validatePersonnel, { personnelData });
    }
    
    // ==================== SITES AND DEPARTMENTS METHODS ====================
    
    /**
     * Get all available sites
     */
    async getSites() {
        const response = await this.get(this.endpoints.sites);
        return response.sites || [];
    }
    
    /**
     * Get detailed information about a specific site
     */
    async getSiteDetails(siteId) {
        const response = await this.get(this.endpoints.siteDetails, { siteId });
        return response.site;
    }
    
    /**
     * Get departments for a specific site
     */
    async getDepartments(siteId) {
        const response = await this.get(this.endpoints.siteDepartments, { siteId });
        return response.departments || [];
    }
    
    /**
     * Validate personnel assignment
     */
    async validateAssignment(siteId, departmentId, clearanceLevel) {
        const requestData = { siteId, departmentId, clearanceLevel };
        const response = await this.post(this.endpoints.validateAssignment, requestData);
        return response.validation;
    }
    
    /**
     * Search sites by criteria
     */
    async searchSites(criteria = {}) {
        const queryParams = new URLSearchParams();
        
        Object.entries(criteria).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });
        
        const url = `${this.baseURL}${this.endpoints.searchSites}?${queryParams}`;
        const config = this.createRequestConfig('GET', url);
        const response = await this.executeRequest(config);
        
        return response.sites || [];
    }
    
    /**
     * Get all Mobile Task Forces
     */
    async getMTFs() {
        const response = await this.get(this.endpoints.mtfs);
        return response.mtfs || [];
    }
    
    // ==================== BATCH PROCESSING METHODS ====================
    
    /**
     * Upload data file for batch processing
     */
    async uploadDataFile(file, options = {}) {
        const formData = new FormData();
        formData.append('dataFile', file);
        
        const config = {
            timeout: options.timeout || 60000, // 60 seconds for file upload
            headers: {} // Let browser set Content-Type for FormData
        };
        
        return this.post(this.endpoints.uploadData, formData, {}, config);
    }
    
    /**
     * Start batch card generation
     */
    async startBatchGeneration(fileId, config = {}) {
        const requestData = { fileId, config };
        return this.post(this.endpoints.batchGenerate, requestData);
    }
    
    /**
     * Get batch processing status
     */
    async getBatchStatus(batchId, includeErrors = false) {
        const url = `${this.baseURL}${this.endpoints.batchStatus.replace('{batchId}', batchId)}?includeErrors=${includeErrors}`;
        const config = this.createRequestConfig('GET', url);
        return this.executeRequest(config);
    }
    
    /**
     * Download batch results
     */
    async downloadBatchResults(batchId) {
        const url = this.buildURL(this.endpoints.downloadBatch, { batchId });
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new APIError(
                    errorData.error || `HTTP ${response.status}`,
                    response.status,
                    errorData.code,
                    errorData
                );
            }
            
            // Get filename from headers
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `scp-cards-batch-${batchId}.zip`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            // Get blob and create download
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            
            // Trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
            
            return {
                success: true,
                filename,
                size: blob.size,
                downloadedAt: new Date().toISOString()
            };
            
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError('Download failed', 500, 'DOWNLOAD_ERROR', { originalError: error.message });
        }
    }
    
    /**
     * Generate batch preview
     */
    async generateBatchPreview(fileId, sampleSize = 5) {
        const requestData = { fileId, sampleSize };
        return this.post(this.endpoints.previewBatch, requestData);
    }
    
    /**
     * Cancel batch processing
     */
    async cancelBatch(batchId) {
        return this.delete(this.endpoints.cancelBatch, { batchId });
    }
    
    /**
     * Pause batch processing
     */
    async pauseBatch(batchId) {
        return this.post(this.endpoints.pauseBatch, null, { batchId });
    }
    
    /**
     * Resume batch processing
     */
    async resumeBatch(batchId) {
        return this.post(this.endpoints.resumeBatch, null, { batchId });
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Get server status
     */
    async getServerStatus() {
        return this.get(this.endpoints.status);
    }
    
    /**
     * Get personnel information by employee ID
     */
    async getPersonnelInfo(employeeId) {
        const response = await this.get(this.endpoints.personnel, { employeeId });
        return response.personnel;
    }
    
    /**
     * Test server connectivity
     */
    async testConnection() {
        try {
            const status = await this.getServerStatus();
            return {
                connected: true,
                status: status.status,
                timestamp: status.timestamp,
                version: status.version
            };
        } catch (error) {
            console.warn('Server connection test failed:', error.message);
            return {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                fallbackMode: true
            };
        }
    }
    
    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    /**
     * Add response interceptor
     */
    addResponseInterceptor(onSuccess, onError) {
        if (onSuccess) {
            this.responseSuccessInterceptors.push(onSuccess);
        }
        if (onError) {
            this.responseErrorInterceptors.push(onError);
        }
    }
    
    /**
     * Set default timeout
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    
    /**
     * Set max retries
     */
    setMaxRetries(maxRetries) {
        this.maxRetries = maxRetries;
    }
    
    /**
     * Set retry delay
     */
    setRetryDelay(delay) {
        this.retryDelay = delay;
    }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status = 500, code = 'API_ERROR', details = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
    
    /**
     * Check if error is retryable
     */
    isRetryable() {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return retryableStatuses.includes(this.status);
    }
    
    /**
     * Check if error is client error (4xx)
     */
    isClientError() {
        return this.status >= 400 && this.status < 500;
    }
    
    /**
     * Check if error is server error (5xx)
     */
    isServerError() {
        return this.status >= 500;
    }
    
    /**
     * Get user-friendly error message
     */
    getUserMessage() {
        const userMessages = {
            'TIMEOUT': 'Request timed out. Please try again.',
            'NETWORK_ERROR': 'Network connection failed. Please check your internet connection.',
            'FILE_TOO_LARGE': 'File is too large. Please use a smaller file.',
            'INVALID_FORMAT': 'Invalid file format. Please use CSV, JSON, or Excel files.',
            'BATCH_SIZE_EXCEEDED': 'Batch size is too large. Please reduce the number of records.',
            'VALIDATION_ERROR': 'Data validation failed. Please check your input.',
            'UNAUTHORIZED': 'You are not authorized to perform this action.',
            'FORBIDDEN': 'Access denied.',
            'NOT_FOUND': 'The requested resource was not found.',
            'RATE_LIMITED': 'Too many requests. Please wait before trying again.'
        };
        
        return userMessages[this.code] || this.message || 'An unexpected error occurred.';
    }
    
    /**
     * Convert to JSON for logging
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, APIError };
} else {
    // Browser environment - attach to window
    window.APIClient = APIClient;
    window.APIError = APIError;
}