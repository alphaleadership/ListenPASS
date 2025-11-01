/**
 * ValidationError Model - Server-side validation error class
 */

class ValidationError extends Error {
    constructor(field, message, code, context = {}) {
        super(message);
        this.field = field;
        this.code = code;
        this.context = context;
        this.name = 'ValidationError';
        this.timestamp = new Date().toISOString();
        this.severity = context.severity || 'error'; // 'error', 'warning', 'info'
    }

    /**
     * Get user-friendly error message
     * @returns {string} Formatted error message
     */
    getUserMessage() {
        const messages = {
            'REQUIRED_FIELD': `${this.getFieldLabel()} is required`,
            'INVALID_FORMAT': `${this.getFieldLabel()} format is invalid`,
            'INVALID_RANGE': `${this.getFieldLabel()} is out of valid range`,
            'INSUFFICIENT_CLEARANCE': `Insufficient clearance level for ${this.getFieldLabel()}`,
            'INVALID_FILE_TYPE': `Invalid file type for ${this.getFieldLabel()}`,
            'FILE_TOO_LARGE': `File size too large for ${this.getFieldLabel()}`,
            'INVALID_DATE_RANGE': `Invalid date range for ${this.getFieldLabel()}`,
            'SITE_DEPARTMENT_MISMATCH': 'Selected department is not available at the chosen site',
            'CLEARANCE_SITE_MISMATCH': 'Clearance level not authorized for selected site',
            'EXPIRED_DATE': `${this.getFieldLabel()} has expired`,
            'FUTURE_DATE_INVALID': `${this.getFieldLabel()} cannot be in the future`,
            'DUPLICATE_VALUE': `${this.getFieldLabel()} already exists`,
            'NETWORK_ERROR': 'Network connection error occurred',
            'SERVER_ERROR': 'Server error occurred during validation',
            'BATCH_VALIDATION_ERROR': 'Batch validation failed',
            'RECORD_PROCESSING_ERROR': 'Failed to process record',
            'VALIDATION_PROCESS_ERROR': 'Validation process encountered an error'
        };

        return messages[this.code] || this.message;
    }

    /**
     * Get field label for display
     * @returns {string} Human-readable field label
     */
    getFieldLabel() {
        const labels = {
            'fullName': 'Full Name',
            'employeeId': 'Employee ID',
            'siteDesignation': 'Site Designation',
            'department': 'Department',
            'clearanceLevel': 'Clearance Level',
            'position': 'Position',
            'issueDate': 'Issue Date',
            'expirationDate': 'Expiration Date',
            'dateOfBirth': 'Date of Birth',
            'photo': 'Photo',
            'emergencyContact': 'Emergency Contact',
            'cardType': 'Card Type',
            'record': 'Record',
            'validation': 'Validation'
        };

        return labels[this.field] || this.field;
    }

    /**
     * Convert to JSON for API responses
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            field: this.field,
            message: this.message,
            userMessage: this.getUserMessage(),
            code: this.code,
            context: this.context,
            severity: this.severity,
            timestamp: this.timestamp
        };
    }

    /**
     * Create ValidationError from plain object
     * @param {Object} obj - Plain object with error data
     * @returns {ValidationError} ValidationError instance
     */
    static fromObject(obj) {
        return new ValidationError(
            obj.field,
            obj.message,
            obj.code,
            obj.context
        );
    }

    /**
     * Create multiple ValidationErrors from array of objects
     * @param {Array} errorArray - Array of error objects
     * @returns {ValidationError[]} Array of ValidationError instances
     */
    static fromArray(errorArray) {
        return errorArray.map(error => ValidationError.fromObject(error));
    }
}

module.exports = { ValidationError };