/**
 * Enhanced Error Handler - Centralized error management and user notifications
 */
class ErrorHandler {
    constructor() {
        this.notifications = new Map();
        this.errorLog = [];
        this.maxLogSize = 100;
        this.notificationContainer = null;
        
        this.initializeNotificationContainer();
        this.setupGlobalErrorHandling();
    }
    
    initializeNotificationContainer() {
        // Create notification container if it doesn't exist
        this.notificationContainer = document.getElementById('notification-container');
        
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'notification-container';
            this.notificationContainer.className = 'notification-container';
            document.body.appendChild(this.notificationContainer);
        }
        
        // Add CSS if not already present
        this.addNotificationStyles();
    }
    
    addNotificationStyles() {
        if (document.getElementById('error-handler-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'error-handler-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s ease;
                border-left: 4px solid #ccc;
                position: relative;
                max-width: 100%;
                word-wrap: break-word;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification.success {
                border-left-color: #28a745;
                background: #f8fff9;
            }
            
            .notification.error {
                border-left-color: #dc3545;
                background: #fff8f8;
            }
            
            .notification.warning {
                border-left-color: #ffc107;
                background: #fffdf5;
            }
            
            .notification.info {
                border-left-color: #17a2b8;
                background: #f8fcff;
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .notification-title {
                font-weight: bold;
                font-size: 14px;
                margin: 0;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            .notification-message {
                font-size: 13px;
                line-height: 1.4;
                margin: 0;
                color: #333;
            }
            
            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }
            
            .notification-action {
                background: #007bff;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .notification-action:hover {
                background: #0056b3;
            }
            
            .notification-action.secondary {
                background: #6c757d;
            }
            
            .notification-action.secondary:hover {
                background: #545b62;
            }
            
            .field-error, .field-warning, .field-info {
                font-size: 12px;
                margin-top: 4px;
                padding: 4px 8px;
                border-radius: 4px;
                display: block;
            }
            
            .field-error {
                background: #fff5f5;
                color: #c53030;
                border: 1px solid #fed7d7;
            }
            
            .field-warning {
                background: #fffbeb;
                color: #d69e2e;
                border: 1px solid #feebc8;
            }
            
            .field-info {
                background: #ebf8ff;
                color: #3182ce;
                border: 1px solid #bee3f8;
            }
            
            .form-field.has-error input,
            .form-field.has-error select,
            .form-field.has-error textarea {
                border-color: #e53e3e;
                box-shadow: 0 0 0 1px #e53e3e;
            }
            
            .form-field.has-warning input,
            .form-field.has-warning select,
            .form-field.has-warning textarea {
                border-color: #d69e2e;
                box-shadow: 0 0 0 1px #d69e2e;
            }
            
            .form-field.has-info input,
            .form-field.has-info select,
            .form-field.has-info textarea {
                border-color: #3182ce;
                box-shadow: 0 0 0 1px #3182ce;
            }
            
            @media (max-width: 768px) {
                .notification-container {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
                
                .notification {
                    transform: translateY(-100%);
                }
                
                .notification.show {
                    transform: translateY(0);
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupGlobalErrorHandling() {
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            // Don't treat successful API responses as errors
            if (event.reason && event.reason.data && event.reason.status >= 200 && event.reason.status < 300) {
                console.warn('Ignoring successful API response in error handler');
                event.preventDefault();
                return;
            }
            
            this.logError(event.reason, 'Unhandled Promise Rejection');
        });
        
        // Capture JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError(event.error, 'JavaScript Error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
    }
    
    logError(error, type = 'Error', context = {}) {
        const errorEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            type,
            message: error?.message || error,
            stack: error?.stack,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.errorLog.push(errorEntry);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        console.error(`[${type}]`, error, context);
        
        return errorEntry.id;
    }
    
    showNotification(options = {}) {
        const {
            title = 'Notification',
            message = '',
            type = 'info', // success, error, warning, info
            autoHide = 5000,
            actions = [],
            persistent = false
        } = options;
        
        const id = this.generateId();
        const notification = this.createNotificationElement(id, title, message, type, actions);
        
        // Store notification reference
        this.notifications.set(id, {
            element: notification,
            autoHide,
            persistent,
            timestamp: Date.now()
        });
        
        // Add to container
        this.notificationContainer.appendChild(notification);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-hide if specified
        if (autoHide && !persistent) {
            setTimeout(() => {
                this.hideNotification(id);
            }, autoHide);
        }
        
        return id;
    }
    
    createNotificationElement(id, title, message, type, actions) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.dataset.id = id;
        
        const header = document.createElement('div');
        header.className = 'notification-header';
        
        const titleElement = document.createElement('h4');
        titleElement.className = 'notification-title';
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', () => this.hideNotification(id));
        
        header.appendChild(titleElement);
        header.appendChild(closeButton);
        
        const messageElement = document.createElement('p');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;
        
        notification.appendChild(header);
        notification.appendChild(messageElement);
        
        // Add actions if provided
        if (actions && actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'notification-actions';
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `notification-action ${action.type || 'primary'}`;
                button.textContent = action.label;
                button.addEventListener('click', () => {
                    if (action.action) {
                        action.action();
                    }
                    if (action.closeOnClick !== false) {
                        this.hideNotification(id);
                    }
                });
                
                actionsContainer.appendChild(button);
            });
            
            notification.appendChild(actionsContainer);
        }
        
        return notification;
    }
    
    hideNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        notification.element.classList.remove('show');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.delete(id);
        }, 300);
    }
    
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.hideNotification(id);
        });
    }
    
    handleValidationErrors(errors, options = {}) {
        const {
            clearPrevious = true,
            showNotification = true,
            groupByField = true,
            autoHide = false
        } = options;
        
        if (clearPrevious) {
            this.clearFieldErrors();
        }
        
        if (!Array.isArray(errors)) {
            errors = [errors];
        }
        
        // Group errors by field if requested
        const errorsByField = groupByField ? this.groupErrorsByField(errors) : { general: errors };
        
        let totalErrors = 0;
        
        Object.entries(errorsByField).forEach(([field, fieldErrors]) => {
            if (field === 'general') {
                // Show general errors as notifications
                fieldErrors.forEach(error => {
                    if (showNotification) {
                        this.showNotification({
                            title: 'Validation Error',
                            message: error.getUserMessage ? error.getUserMessage() : error.message,
                            type: 'error',
                            autoHide: autoHide
                        });
                    }
                });
            } else {
                // Show field-specific errors
                this.displayFieldErrors(field, fieldErrors);
            }
            
            totalErrors += fieldErrors.length;
        });
        
        // Show summary notification if there are many errors
        if (showNotification && totalErrors > 3) {
            this.showNotification({
                title: 'Multiple Validation Errors',
                message: `Found ${totalErrors} validation errors. Please check the form fields.`,
                type: 'error',
                autoHide: autoHide
            });
        }
        
        return totalErrors;
    }
    
    groupErrorsByField(errors) {
        const grouped = {};
        
        errors.forEach(error => {
            const field = error.field || 'general';
            if (!grouped[field]) {
                grouped[field] = [];
            }
            grouped[field].push(error);
        });
        
        return grouped;
    }
    
    displayFieldErrors(fieldName, errors) {
        const field = document.getElementById(fieldName);
        const fieldContainer = field?.closest('.form-field');
        
        if (!fieldContainer) {
            console.warn(`Field container not found for: ${fieldName}`);
            return;
        }
        
        // Clear existing errors
        const existingErrors = fieldContainer.querySelectorAll('.field-error, .field-warning, .field-info');
        existingErrors.forEach(el => el.remove());
        
        // Remove existing classes
        fieldContainer.classList.remove('has-error', 'has-warning', 'has-info');
        
        if (errors.length === 0) return;
        
        // Determine the highest severity
        const hasError = errors.some(e => e.severity === 'error' || !e.severity);
        const hasWarning = errors.some(e => e.severity === 'warning');
        const hasInfo = errors.some(e => e.severity === 'info');
        
        let severity = 'info';
        if (hasError) severity = 'error';
        else if (hasWarning) severity = 'warning';
        
        fieldContainer.classList.add(`has-${severity}`);
        
        // Add error messages
        errors.forEach(error => {
            const errorElement = document.createElement('div');
            const errorSeverity = error.severity || 'error';
            errorElement.className = `field-${errorSeverity}`;
            errorElement.textContent = error.getUserMessage ? error.getUserMessage() : error.message;
            
            fieldContainer.appendChild(errorElement);
        });
    }
    
    clearFieldErrors() {
        // Remove all field error indicators
        document.querySelectorAll('.field-error, .field-warning, .field-info').forEach(el => {
            el.remove();
        });
        
        // Remove error classes from form fields
        document.querySelectorAll('.form-field').forEach(field => {
            field.classList.remove('has-error', 'has-warning', 'has-info');
        });
    }
    
    handleBatchErrors(batchResult, options = {}) {
        const {
            showSummary = true,
            showDetails = false,
            autoHide = false
        } = options;
        
        if (!batchResult || !batchResult.errors) return;
        
        const { errors, summary } = batchResult;
        
        if (showSummary && summary) {
            const message = `Batch processing completed with ${summary.invalidRecords} errors out of ${summary.totalRecords} records.`;
            
            this.showNotification({
                title: 'Batch Processing Results',
                message: message,
                type: summary.invalidRecords > 0 ? 'warning' : 'success',
                autoHide: autoHide,
                actions: showDetails ? [{
                    label: 'View Details',
                    action: () => this.showBatchErrorDetails(errors)
                }] : []
            });
        }
        
        if (showDetails) {
            this.showBatchErrorDetails(errors);
        }
    }
    
    showBatchErrorDetails(errors) {
        // Create a modal or detailed view for batch errors
        const modal = document.createElement('div');
        modal.className = 'batch-error-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Batch Processing Errors</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="error-list">
                            ${errors.map((error, index) => `
                                <div class="error-item">
                                    <strong>Record ${error.index || index + 1}:</strong>
                                    <span>${error.message}</span>
                                    ${error.field ? `<small>Field: ${error.field}</small>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary modal-close">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        const modalStyles = document.createElement('style');
        modalStyles.textContent = `
            .batch-error-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10001;
            }
            
            .modal-overlay {
                background: rgba(0, 0, 0, 0.5);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .modal-content {
                background: white;
                border-radius: 8px;
                max-width: 600px;
                max-height: 80vh;
                width: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .modal-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                text-align: right;
            }
            
            .error-list {
                max-height: 400px;
                overflow-y: auto;
            }
            
            .error-item {
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .error-item:last-child {
                border-bottom: none;
            }
            
            .error-item strong {
                color: #dc3545;
            }
            
            .error-item small {
                color: #666;
                font-size: 12px;
            }
        `;
        
        document.head.appendChild(modalStyles);
        document.body.appendChild(modal);
        
        // Add close handlers
        const closeModal = () => {
            document.body.removeChild(modal);
            document.head.removeChild(modalStyles);
        };
        
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeModal();
            }
        });
    }
    
    generateId() {
        return 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getErrorLog() {
        return [...this.errorLog];
    }
    
    clearErrorLog() {
        this.errorLog = [];
    }
    
    exportErrorLog() {
        const logData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errors: this.errorLog
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `scp-card-generator-errors-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// Make available globally
window.ErrorHandler = ErrorHandler;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.errorHandler) {
            window.errorHandler = new ErrorHandler();
        }
    });
} else {
    if (!window.errorHandler) {
        window.errorHandler = new ErrorHandler();
    }
}