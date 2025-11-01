/**
 * Server-side Personnel Validator
 * Enhanced validation for batch processing and server-side operations
 */

const { ValidationError } = require('../models/ValidationError');

class PersonnelValidator {
    constructor(siteManager = null) {
        this.siteManager = siteManager;
        this.validationRules = this.initializeValidationRules();
        this.batchValidationConfig = this.initializeBatchValidationConfig();
    }

    /**
     * Initialize validation rules (server-side version)
     * @returns {Object} Validation rules configuration
     */
    initializeValidationRules() {
        return {
            fullName: {
                required: true,
                minLength: 2,
                maxLength: 50,
                pattern: /^[a-zA-Z\s\-\.\']+$/,
                sanitize: (value) => value.trim().replace(/\s+/g, ' ')
            },
            employeeId: {
                required: true,
                pattern: /^SCP-\d{4}-\d{3}$/,
                unique: true, // Check for uniqueness in batch processing
                sanitize: (value) => value.toUpperCase().trim()
            },
            siteDesignation: {
                required: true,
                validate: (value) => this.validateSiteExists(value)
            },
            department: {
                required: true,
                validate: (value, data) => this.validateDepartmentForSite(value, data.siteDesignation)
            },
            clearanceLevel: {
                required: true,
                type: 'number',
                min: 0,
                max: 5,
                validate: (value, data) => this.validateClearanceForSite(value, data.siteDesignation)
            },
            position: {
                required: true,
                minLength: 2,
                maxLength: 50,
                sanitize: (value) => value.trim()
            },
            issueDate: {
                required: true,
                type: 'date',
                validate: (value) => this.validateIssueDate(value)
            },
            expirationDate: {
                required: true,
                type: 'date',
                validate: (value, data) => this.validateExpirationDate(value, data.issueDate)
            },
            dateOfBirth: {
                required: false,
                type: 'date',
                validate: (value) => this.validateDateOfBirth(value)
            },
            emergencyContact: {
                required: false,
                maxLength: 100,
                sanitize: (value) => value.trim()
            },
            cardType: {
                required: true,
                allowedValues: ['researcher', 'security', 'dclass', 'o5', 'mtf'],
                default: 'researcher'
            }
        };
    }

    /**
     * Initialize batch validation configuration
     * @returns {Object} Batch validation settings
     */
    initializeBatchValidationConfig() {
        return {
            maxBatchSize: 1000,
            allowPartialSuccess: true,
            stopOnFirstError: false,
            validateUniqueIds: true,
            sanitizeData: true,
            generateMissingIds: false,
            defaultCardType: 'researcher'
        };
    }

    /**
     * Validate single personnel record
     * @param {Object} data - Personnel data
     * @param {string} cardType - Card type
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    async validatePersonnelRecord(data, cardType = 'researcher', options = {}) {
        const errors = [];
        const warnings = [];
        const sanitizedData = { ...data };

        try {
            // Sanitize data first
            if (options.sanitize !== false) {
                this.sanitizePersonnelData(sanitizedData);
            }

            // Get card type configuration
            const cardTypeConfig = this.getCardTypeConfig(cardType);
            const requiredFields = cardTypeConfig.requiredFields || [];

            // Validate each field
            for (const [fieldName, value] of Object.entries(sanitizedData)) {
                const fieldErrors = await this.validateField(fieldName, value, sanitizedData, cardType);
                errors.push(...fieldErrors);
            }

            // Check for missing required fields
            for (const requiredField of requiredFields) {
                if (!sanitizedData[requiredField] || 
                    (typeof sanitizedData[requiredField] === 'string' && sanitizedData[requiredField].trim() === '')) {
                    errors.push(new ValidationError(
                        requiredField,
                        `${requiredField} is required for ${cardType} cards`,
                        'REQUIRED_FIELD',
                        { cardType, severity: 'error' }
                    ));
                }
            }

            // Card type specific validations
            const typeSpecificErrors = await this.validateCardTypeSpecific(sanitizedData, cardType);
            errors.push(...typeSpecificErrors);

            // Cross-field validations
            const crossFieldErrors = await this.validateCrossFields(sanitizedData, cardType);
            errors.push(...crossFieldErrors);

            // Generate warnings
            const potentialWarnings = this.generateWarnings(sanitizedData, cardType);
            warnings.push(...potentialWarnings);

            return {
                isValid: errors.length === 0,
                errors: errors,
                warnings: warnings,
                sanitizedData: sanitizedData,
                originalData: data,
                cardType: cardType,
                validationTimestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                isValid: false,
                errors: [new ValidationError(
                    'validation',
                    `Validation process failed: ${error.message}`,
                    'VALIDATION_PROCESS_ERROR',
                    { originalError: error.message, stack: error.stack }
                )],
                warnings: [],
                sanitizedData: data,
                originalData: data,
                cardType: cardType,
                validationTimestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Validate batch of personnel records
     * @param {Array} personnelArray - Array of personnel data
     * @param {Object} options - Batch validation options
     * @returns {Object} Batch validation result
     */
    async validatePersonnelBatch(personnelArray, options = {}) {
        const config = { ...this.batchValidationConfig, ...options };
        const results = [];
        const summary = {
            totalRecords: personnelArray.length,
            validRecords: 0,
            invalidRecords: 0,
            recordsWithWarnings: 0,
            duplicateIds: [],
            criticalErrors: [],
            processingTime: 0
        };

        const startTime = Date.now();

        try {
            // Check batch size limit
            if (personnelArray.length > config.maxBatchSize) {
                throw new Error(`Batch size ${personnelArray.length} exceeds maximum allowed ${config.maxBatchSize}`);
            }

            // Validate unique employee IDs if required
            if (config.validateUniqueIds) {
                const duplicates = this.findDuplicateEmployeeIds(personnelArray);
                summary.duplicateIds = duplicates;
                
                if (duplicates.length > 0 && !config.allowPartialSuccess) {
                    throw new Error(`Duplicate employee IDs found: ${duplicates.join(', ')}`);
                }
            }

            // Process each record
            for (let i = 0; i < personnelArray.length; i++) {
                const record = personnelArray[i];
                const recordIndex = i;

                try {
                    // Determine card type
                    const cardType = record.cardType || config.defaultCardType;

                    // Validate individual record
                    const validation = await this.validatePersonnelRecord(record, cardType, {
                        sanitize: config.sanitizeData,
                        recordIndex: recordIndex
                    });

                    // Add record index to validation result
                    validation.recordIndex = recordIndex;
                    validation.originalIndex = recordIndex;

                    results.push(validation);

                    // Update summary
                    if (validation.isValid) {
                        summary.validRecords++;
                    } else {
                        summary.invalidRecords++;
                        
                        // Check for critical errors
                        const criticalErrors = validation.errors.filter(error => 
                            ['VALIDATION_PROCESS_ERROR', 'REQUIRED_FIELD', 'INVALID_FORMAT'].includes(error.code)
                        );
                        
                        if (criticalErrors.length > 0) {
                            summary.criticalErrors.push({
                                recordIndex: recordIndex,
                                errors: criticalErrors
                            });
                        }
                    }

                    if (validation.warnings.length > 0) {
                        summary.recordsWithWarnings++;
                    }

                    // Stop on first error if configured
                    if (config.stopOnFirstError && !validation.isValid) {
                        break;
                    }

                } catch (recordError) {
                    const errorResult = {
                        isValid: false,
                        errors: [new ValidationError(
                            'record',
                            `Failed to process record ${recordIndex}: ${recordError.message}`,
                            'RECORD_PROCESSING_ERROR',
                            { recordIndex, originalError: recordError.message }
                        )],
                        warnings: [],
                        sanitizedData: record,
                        originalData: record,
                        cardType: record.cardType || config.defaultCardType,
                        recordIndex: recordIndex,
                        validationTimestamp: new Date().toISOString()
                    };

                    results.push(errorResult);
                    summary.invalidRecords++;
                    summary.criticalErrors.push({
                        recordIndex: recordIndex,
                        errors: errorResult.errors
                    });

                    if (config.stopOnFirstError) {
                        break;
                    }
                }
            }

            summary.processingTime = Date.now() - startTime;

            return {
                isValid: summary.invalidRecords === 0,
                summary: summary,
                results: results,
                config: config,
                validationTimestamp: new Date().toISOString()
            };

        } catch (batchError) {
            summary.processingTime = Date.now() - startTime;
            
            return {
                isValid: false,
                summary: summary,
                results: results,
                error: {
                    message: batchError.message,
                    code: 'BATCH_VALIDATION_ERROR',
                    timestamp: new Date().toISOString()
                },
                config: config,
                validationTimestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Validate individual field (async version for server)
     * @param {string} fieldName - Field name
     * @param {*} value - Field value
     * @param {Object} allData - Complete record data
     * @param {string} cardType - Card type
     * @returns {Promise<ValidationError[]>} Array of validation errors
     */
    async validateField(fieldName, value, allData = {}, cardType = 'researcher') {
        const errors = [];
        const rule = this.validationRules[fieldName];

        if (!rule) return errors;

        // Sanitize value if sanitizer exists
        if (rule.sanitize && typeof value === 'string') {
            value = rule.sanitize(value);
            allData[fieldName] = value; // Update the data with sanitized value
        }

        // Required field validation
        if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} is required`,
                'REQUIRED_FIELD',
                { cardType }
            ));
            return errors;
        }

        // Skip other validations if field is empty and not required
        if (!value && !rule.required) return errors;

        // Type validation
        if (rule.type) {
            const typeError = this.validateFieldType(fieldName, value, rule.type);
            if (typeError) errors.push(typeError);
        }

        // Length validation
        if (rule.minLength && value.length < rule.minLength) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} must be at least ${rule.minLength} characters`,
                'INVALID_LENGTH',
                { minLength: rule.minLength, actualLength: value.length }
            ));
        }

        if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} must not exceed ${rule.maxLength} characters`,
                'INVALID_LENGTH',
                { maxLength: rule.maxLength, actualLength: value.length }
            ));
        }

        // Range validation
        if (rule.min !== undefined && value < rule.min) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} must be at least ${rule.min}`,
                'INVALID_RANGE',
                { min: rule.min, max: rule.max, actual: value }
            ));
        }

        if (rule.max !== undefined && value > rule.max) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} must not exceed ${rule.max}`,
                'INVALID_RANGE',
                { min: rule.min, max: rule.max, actual: value }
            ));
        }

        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} format is invalid`,
                'INVALID_FORMAT',
                { pattern: rule.pattern.toString(), value }
            ));
        }

        // Allowed values validation
        if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            errors.push(new ValidationError(
                fieldName,
                `${fieldName} must be one of: ${rule.allowedValues.join(', ')}`,
                'INVALID_VALUE',
                { allowedValues: rule.allowedValues, actualValue: value }
            ));
        }

        // Custom validation function (async)
        if (rule.validate && typeof rule.validate === 'function') {
            try {
                const customValidation = await rule.validate(value, allData);
                if (customValidation && !customValidation.isValid) {
                    errors.push(new ValidationError(
                        fieldName,
                        customValidation.message,
                        customValidation.code || 'CUSTOM_VALIDATION_FAILED',
                        customValidation.context || {}
                    ));
                }
            } catch (error) {
                errors.push(new ValidationError(
                    fieldName,
                    `Validation error: ${error.message}`,
                    'VALIDATION_FUNCTION_ERROR',
                    { originalError: error.message }
                ));
            }
        }

        return errors;
    }

    /**
     * Sanitize personnel data
     * @param {Object} data - Data to sanitize
     */
    sanitizePersonnelData(data) {
        for (const [fieldName, value] of Object.entries(data)) {
            const rule = this.validationRules[fieldName];
            
            if (rule && rule.sanitize && typeof value === 'string') {
                data[fieldName] = rule.sanitize(value);
            }
        }
    }

    /**
     * Find duplicate employee IDs in batch
     * @param {Array} personnelArray - Array of personnel records
     * @returns {Array} Array of duplicate employee IDs
     */
    findDuplicateEmployeeIds(personnelArray) {
        const idCounts = {};
        const duplicates = [];

        personnelArray.forEach((record, index) => {
            const employeeId = record.employeeId;
            if (employeeId) {
                if (idCounts[employeeId]) {
                    idCounts[employeeId].count++;
                    idCounts[employeeId].indices.push(index);
                } else {
                    idCounts[employeeId] = { count: 1, indices: [index] };
                }
            }
        });

        for (const [employeeId, info] of Object.entries(idCounts)) {
            if (info.count > 1) {
                duplicates.push({
                    employeeId: employeeId,
                    count: info.count,
                    indices: info.indices
                });
            }
        }

        return duplicates;
    }

    /**
     * Validate field type (server version)
     * @param {string} fieldName - Field name
     * @param {*} value - Value to validate
     * @param {string} expectedType - Expected type
     * @returns {ValidationError|null} Validation error or null
     */
    validateFieldType(fieldName, value, expectedType) {
        switch (expectedType) {
            case 'number':
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    return new ValidationError(
                        fieldName,
                        `${fieldName} must be a number`,
                        'INVALID_TYPE',
                        { expectedType: 'number', actualType: typeof value, value }
                    );
                }
                break;
            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return new ValidationError(
                        fieldName,
                        `${fieldName} must be a valid date`,
                        'INVALID_DATE',
                        { value }
                    );
                }
                break;
            case 'string':
                if (typeof value !== 'string') {
                    return new ValidationError(
                        fieldName,
                        `${fieldName} must be a string`,
                        'INVALID_TYPE',
                        { expectedType: 'string', actualType: typeof value, value }
                    );
                }
                break;
        }
        return null;
    }

    // Validation helper methods (similar to client-side but with async support)

    async validateSiteExists(siteId) {
        if (!this.siteManager) return { isValid: true };
        
        try {
            const site = await this.siteManager.getSite(siteId);
            return {
                isValid: !!site,
                message: site ? null : `Site ${siteId} not found`,
                code: 'SITE_NOT_FOUND'
            };
        } catch (error) {
            return {
                isValid: false,
                message: `Error validating site: ${error.message}`,
                code: 'SITE_VALIDATION_ERROR'
            };
        }
    }

    async validateDepartmentForSite(departmentId, siteId) {
        if (!this.siteManager || !siteId) return { isValid: true };
        
        try {
            const departments = await this.siteManager.getDepartments(siteId);
            const departmentExists = departments.some(dept => dept.departmentId === departmentId);
            
            return {
                isValid: departmentExists,
                message: departmentExists ? null : `Department ${departmentId} not available at ${siteId}`,
                code: 'DEPARTMENT_NOT_AVAILABLE'
            };
        } catch (error) {
            return {
                isValid: false,
                message: `Error validating department: ${error.message}`,
                code: 'DEPARTMENT_VALIDATION_ERROR'
            };
        }
    }

    async validateClearanceForSite(clearanceLevel, siteId) {
        if (!this.siteManager || !siteId) return { isValid: true };
        
        try {
            const site = await this.siteManager.getSite(siteId);
            if (!site) return { isValid: true }; // Site validation will catch this
            
            return {
                isValid: clearanceLevel <= site.maxClearanceLevel,
                message: clearanceLevel <= site.maxClearanceLevel ? null : 
                    `Clearance level ${clearanceLevel} exceeds maximum for ${siteId} (${site.maxClearanceLevel})`,
                code: 'CLEARANCE_TOO_HIGH'
            };
        } catch (error) {
            return {
                isValid: false,
                message: `Error validating clearance: ${error.message}`,
                code: 'CLEARANCE_VALIDATION_ERROR'
            };
        }
    }

    validateIssueDate(dateValue) {
        const date = new Date(dateValue);
        const today = new Date();
        
        if (date > today) {
            return {
                isValid: false,
                message: 'Issue date cannot be in the future',
                code: 'FUTURE_DATE_INVALID'
            };
        }
        
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(today.getFullYear() - 10);
        
        if (date < tenYearsAgo) {
            return {
                isValid: false,
                message: 'Issue date cannot be more than 10 years ago',
                code: 'DATE_TOO_OLD'
            };
        }
        
        return { isValid: true };
    }

    validateExpirationDate(expirationValue, issueValue) {
        const expirationDate = new Date(expirationValue);
        
        if (issueValue) {
            const issueDate = new Date(issueValue);
            
            if (expirationDate <= issueDate) {
                return {
                    isValid: false,
                    message: 'Expiration date must be after issue date',
                    code: 'INVALID_DATE_RANGE'
                };
            }
        }
        
        const fiveYearsFromNow = new Date();
        fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
        
        if (expirationDate > fiveYearsFromNow) {
            return {
                isValid: false,
                message: 'Expiration date cannot be more than 5 years in the future',
                code: 'DATE_TOO_FAR'
            };
        }
        
        return { isValid: true };
    }

    validateDateOfBirth(dateValue) {
        const birthDate = new Date(dateValue);
        const today = new Date();
        
        if (birthDate > today) {
            return {
                isValid: false,
                message: 'Date of birth cannot be in the future',
                code: 'FUTURE_DATE_INVALID'
            };
        }
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            return {
                isValid: false,
                message: 'Personnel must be at least 18 years old',
                code: 'AGE_TOO_YOUNG'
            };
        }
        
        if (age > 100) {
            return {
                isValid: false,
                message: 'Age seems unrealistic',
                code: 'AGE_TOO_OLD'
            };
        }
        
        return { isValid: true };
    }

    // Card type specific validations (async version)
    async validateCardTypeSpecific(data, cardType) {
        const errors = [];

        switch (cardType) {
            case 'dclass':
                if (!data.expirationDate) {
                    errors.push(new ValidationError(
                        'expirationDate',
                        'D-Class personnel must have an expiration date',
                        'REQUIRED_FIELD',
                        { cardType: 'dclass' }
                    ));
                }
                if (data.clearanceLevel && data.clearanceLevel !== 0) {
                    errors.push(new ValidationError(
                        'clearanceLevel',
                        'D-Class personnel should have clearance level 0',
                        'INVALID_CLEARANCE',
                        { cardType: 'dclass', expectedLevel: 0, actualLevel: data.clearanceLevel }
                    ));
                }
                break;

            case 'o5':
                if (data.clearanceLevel && data.clearanceLevel !== 5) {
                    errors.push(new ValidationError(
                        'clearanceLevel',
                        'O5 Council members must have clearance level 5',
                        'INVALID_CLEARANCE',
                        { cardType: 'o5', expectedLevel: 5, actualLevel: data.clearanceLevel }
                    ));
                }
                break;

            case 'security':
                if (data.clearanceLevel && (data.clearanceLevel < 1 || data.clearanceLevel > 4)) {
                    errors.push(new ValidationError(
                        'clearanceLevel',
                        'Security personnel typically have clearance levels 1-4',
                        'INVALID_RANGE',
                        { cardType: 'security', min: 1, max: 4, actual: data.clearanceLevel, severity: 'warning' }
                    ));
                }
                break;

            case 'researcher':
                if (data.clearanceLevel && (data.clearanceLevel < 2 || data.clearanceLevel > 4)) {
                    errors.push(new ValidationError(
                        'clearanceLevel',
                        'Research personnel typically have clearance levels 2-4',
                        'INVALID_RANGE',
                        { cardType: 'researcher', min: 2, max: 4, actual: data.clearanceLevel, severity: 'warning' }
                    ));
                }
                break;
        }

        return errors;
    }

    // Cross-field validations (async version)
    async validateCrossFields(data, cardType) {
        const errors = [];

        // Issue date vs expiration date
        if (data.issueDate && data.expirationDate) {
            const issueDate = new Date(data.issueDate);
            const expirationDate = new Date(data.expirationDate);

            if (expirationDate <= issueDate) {
                errors.push(new ValidationError(
                    'expirationDate',
                    'Expiration date must be after issue date',
                    'INVALID_DATE_RANGE',
                    { issueDate: data.issueDate, expirationDate: data.expirationDate }
                ));
            }
        }

        // Site and department compatibility
        if (data.siteDesignation && data.department && this.siteManager) {
            const siteValidation = await this.validateDepartmentForSite(data.department, data.siteDesignation);
            if (!siteValidation.isValid) {
                errors.push(new ValidationError(
                    'department',
                    siteValidation.message,
                    'SITE_DEPARTMENT_MISMATCH',
                    { site: data.siteDesignation, department: data.department }
                ));
            }
        }

        // Clearance level and site compatibility
        if (data.clearanceLevel && data.siteDesignation && this.siteManager) {
            const clearanceValidation = await this.validateClearanceForSite(data.clearanceLevel, data.siteDesignation);
            if (!clearanceValidation.isValid) {
                errors.push(new ValidationError(
                    'clearanceLevel',
                    clearanceValidation.message,
                    'CLEARANCE_SITE_MISMATCH',
                    { site: data.siteDesignation, clearanceLevel: data.clearanceLevel }
                ));
            }
        }

        return errors;
    }

    generateWarnings(data, cardType) {
        const warnings = [];

        // Check for expiration date approaching
        if (data.expirationDate) {
            const expirationDate = new Date(data.expirationDate);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                warnings.push(new ValidationError(
                    'expirationDate',
                    `Card expires in ${daysUntilExpiry} days`,
                    'EXPIRING_SOON',
                    { daysUntilExpiry, severity: 'warning' }
                ));
            } else if (daysUntilExpiry <= 0) {
                warnings.push(new ValidationError(
                    'expirationDate',
                    'Card has expired',
                    'EXPIRED_DATE',
                    { daysOverdue: Math.abs(daysUntilExpiry), severity: 'error' }
                ));
            }
        }

        return warnings;
    }

    getCardTypeConfig(cardType) {
        const configs = {
            researcher: {
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate']
            },
            security: {
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate']
            },
            dclass: {
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'expirationDate']
            },
            o5: {
                requiredFields: ['fullName', 'employeeId', 'clearanceLevel']
            },
            mtf: {
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate']
            }
        };
        
        return configs[cardType] || configs.researcher;
    }
}

module.exports = PersonnelValidator;