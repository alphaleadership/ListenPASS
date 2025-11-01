/**
 * Enhanced Validation System - Comprehensive validation for SCP Card Generator
 */

class ValidationError extends Error {
    constructor(field, message, code = 'VALIDATION_ERROR', details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.code = code;
        this.details = details;
        this.severity = details.severity || 'error'; // error, warning, info
        this.timestamp = new Date().toISOString();
    }
    
    getUserMessage() {
        const userMessages = {
            'REQUIRED_FIELD': `${this.getFieldLabel()} is required`,
            'INVALID_FORMAT': `${this.getFieldLabel()} format is invalid`,
            'INVALID_LENGTH': `${this.getFieldLabel()} length is invalid`,
            'INVALID_RANGE': `${this.getFieldLabel()} is out of valid range`,
            'INVALID_DATE': `${this.getFieldLabel()} is not a valid date`,
            'INVALID_DATE_RANGE': `${this.getFieldLabel()} is not within valid date range`,
            'INVALID_FILE_TYPE': 'File type is not supported',
            'FILE_TOO_LARGE': 'File size exceeds maximum limit',
            'SITE_ACCESS_DENIED': 'Clearance level insufficient for selected site',
            'DEPARTMENT_ACCESS_DENIED': 'Clearance level insufficient for selected department',
            'INVALID_SITE': 'Selected site is not recognized',
            'INVALID_DEPARTMENT': 'Selected department is not available',
            'CLEARANCE_MISMATCH': 'Clearance level does not match card type requirements'
        };
        
        return userMessages[this.code] || this.message;
    }
    
    getFieldLabel() {
        const fieldLabels = {
            'fullName': 'Full Name',
            'employeeId': 'Employee ID',
            'siteDesignation': 'Site Designation',
            'department': 'Department',
            'clearanceLevel': 'Clearance Level',
            'position': 'Position',
            'dateOfBirth': 'Date of Birth',
            'issueDate': 'Issue Date',
            'expirationDate': 'Expiration Date',
            'photo': 'Photo',
            'emergencyContact': 'Emergency Contact',
            'batchFile': 'Data File'
        };
        
        return fieldLabels[this.field] || this.field;
    }
    
    toJSON() {
        return {
            name: this.name,
            field: this.field,
            message: this.message,
            code: this.code,
            details: this.details,
            severity: this.severity,
            timestamp: this.timestamp,
            userMessage: this.getUserMessage()
        };
    }
}

class PersonnelValidator {
    constructor(siteManager = null) {
        this.siteManager = siteManager;
        this.rules = this.initializeValidationRules();
    }
    
    initializeValidationRules() {
        return {
            fullName: {
                required: true,
                minLength: 2,
                maxLength: 50,
                pattern: /^[a-zA-Z\s\-\.\']+$/,
                transform: (value) => value.trim().replace(/\s+/g, ' ')
            },
            employeeId: {
                required: true,
                pattern: /^SCP-\d{4}-\d{3}$/,
                transform: (value) => value.toUpperCase().trim()
            },
            siteDesignation: {
                required: true,
                validate: (value, data, cardType) => this.validateSiteDesignation(value, data, cardType)
            },
            department: {
                required: (cardType) => !['dclass', 'o5'].includes(cardType),
                validate: (value, data, cardType) => this.validateDepartment(value, data, cardType)
            },
            clearanceLevel: {
                required: true,
                type: 'number',
                min: 0,
                max: 5,
                validate: (value, data, cardType) => this.validateClearanceLevel(value, data, cardType)
            },
            position: {
                required: true,
                minLength: 2,
                maxLength: 50,
                transform: (value) => value.trim()
            },
            dateOfBirth: {
                required: false,
                type: 'date',
                validate: (value) => this.validateDateOfBirth(value)
            },
            issueDate: {
                required: true,
                type: 'date',
                validate: (value, data) => this.validateIssueDate(value, data)
            },
            expirationDate: {
                required: true,
                type: 'date',
                validate: (value, data) => this.validateExpirationDate(value, data)
            },
            photo: {
                required: false,
                type: 'file',
                validate: (file) => this.validatePhoto(file)
            },
            emergencyContact: {
                required: false,
                maxLength: 100,
                transform: (value) => value.trim()
            }
        };
    }
    
    validatePersonnelData(data, cardType = 'researcher') {
        const errors = [];
        const warnings = [];
        const info = [];
        
        // Get card type configuration
        const cardTypeConfig = this.getCardTypeConfig(cardType);
        if (!cardTypeConfig) {
            errors.push(new ValidationError('cardType', `Invalid card type: ${cardType}`, 'INVALID_CARD_TYPE'));
            return { isValid: false, errors, warnings, info };
        }
        
        // Validate each field
        const allFields = [...cardTypeConfig.requiredFields, ...cardTypeConfig.optionalFields];
        
        allFields.forEach(fieldName => {
            const fieldErrors = this.validateField(fieldName, data[fieldName], data, cardType);
            errors.push(...fieldErrors.filter(e => e.severity === 'error'));
            warnings.push(...fieldErrors.filter(e => e.severity === 'warning'));
            info.push(...fieldErrors.filter(e => e.severity === 'info'));
        });
        
        // Cross-field validation
        const crossFieldErrors = this.validateCrossFields(data, cardType);
        errors.push(...crossFieldErrors.filter(e => e.severity === 'error'));
        warnings.push(...crossFieldErrors.filter(e => e.severity === 'warning'));
        info.push(...crossFieldErrors.filter(e => e.severity === 'info'));
        
        // Calculate completion percentage
        const completionPercentage = this.calculateCompletionPercentage(data, cardTypeConfig);
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            info,
            completionPercentage,
            cardType,
            timestamp: new Date().toISOString()
        };
    }
    
    validateField(fieldName, value, data = {}, cardType = 'researcher') {
        const errors = [];
        const rule = this.rules[fieldName];
        
        if (!rule) {
            return errors; // No validation rule for this field
        }
        
        // Check if field is required
        const isRequired = typeof rule.required === 'function' 
            ? rule.required(cardType) 
            : rule.required;
        
        // Handle empty values
        if (value === undefined || value === null || value === '') {
            if (isRequired) {
                errors.push(new ValidationError(
                    fieldName,
                    `${this.getFieldLabel(fieldName)} is required`,
                    'REQUIRED_FIELD'
                ));
            }
            return errors;
        }
        
        // Transform value if transformer exists
        if (rule.transform && typeof value === 'string') {
            value = rule.transform(value);
        }
        
        // Type validation
        if (rule.type) {
            const typeError = this.validateType(fieldName, value, rule.type);
            if (typeError) {
                errors.push(typeError);
                return errors; // Don't continue if type is wrong
            }
        }
        
        // Length validation
        if (typeof value === 'string') {
            if (rule.minLength && value.length < rule.minLength) {
                errors.push(new ValidationError(
                    fieldName,
                    `${this.getFieldLabel(fieldName)} must be at least ${rule.minLength} characters`,
                    'INVALID_LENGTH',
                    { minLength: rule.minLength, actualLength: value.length }
                ));
            }
            
            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(new ValidationError(
                    fieldName,
                    `${this.getFieldLabel(fieldName)} must not exceed ${rule.maxLength} characters`,
                    'INVALID_LENGTH',
                    { maxLength: rule.maxLength, actualLength: value.length }
                ));
            }
        }
        
        // Pattern validation
        if (rule.pattern && typeof value === 'string') {
            if (!rule.pattern.test(value)) {
                errors.push(new ValidationError(
                    fieldName,
                    `${this.getFieldLabel(fieldName)} format is invalid`,
                    'INVALID_FORMAT',
                    { pattern: rule.pattern.toString(), value }
                ));
            }
        }
        
        // Range validation for numbers
        if (typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                errors.push(new ValidationError(
                    fieldName,
                    `${this.getFieldLabel(fieldName)} must be at least ${rule.min}`,
                    'INVALID_RANGE',
                    { min: rule.min, value }
                ));
            }
            
            if (rule.max !== undefined && value > rule.max) {
                errors.push(new ValidationError(
                    fieldName,
                    `${this.getFieldLabel(fieldName)} must not exceed ${rule.max}`,
                    'INVALID_RANGE',
                    { max: rule.max, value }
                ));
            }
        }
        
        // Custom validation
        if (rule.validate) {
            try {
                const customErrors = rule.validate(value, data, cardType);
                if (customErrors) {
                    if (Array.isArray(customErrors)) {
                        errors.push(...customErrors);
                    } else {
                        errors.push(customErrors);
                    }
                }
            } catch (error) {
                errors.push(new ValidationError(
                    fieldName,
                    `Validation error: ${error.message}`,
                    'VALIDATION_ERROR'
                ));
            }
        }
        
        return errors;
    }
    
    validateType(fieldName, value, expectedType) {
        switch (expectedType) {
            case 'string':
                if (typeof value !== 'string') {
                    return new ValidationError(fieldName, 'Must be text', 'INVALID_TYPE');
                }
                break;
                
            case 'number':
                const num = typeof value === 'string' ? parseFloat(value) : value;
                if (isNaN(num)) {
                    return new ValidationError(fieldName, 'Must be a number', 'INVALID_TYPE');
                }
                break;
                
            case 'date':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return new ValidationError(fieldName, 'Must be a valid date', 'INVALID_DATE');
                }
                break;
                
            case 'file':
                if (!(value instanceof File)) {
                    return new ValidationError(fieldName, 'Must be a file', 'INVALID_TYPE');
                }
                break;
        }
        
        return null;
    }
    
    validateSiteDesignation(siteId, data, cardType) {
        const errors = [];
        
        if (!siteId) return errors;
        
        // Skip validation for O5 cards (they don't need site designation)
        if (cardType === 'o5') {
            return errors;
        }
        
        if (!this.siteManager) {
            errors.push(new ValidationError(
                'siteDesignation',
                'Site validation unavailable',
                'VALIDATION_UNAVAILABLE',
                { severity: 'warning' }
            ));
            return errors;
        }
        
        const site = this.siteManager.getSite(siteId);
        if (!site) {
            errors.push(new ValidationError(
                'siteDesignation',
                `Site ${siteId} is not recognized`,
                'INVALID_SITE',
                { siteId }
            ));
            return errors;
        }
        
        // Validate clearance level for site
        if (data.clearanceLevel !== undefined) {
            const clearanceLevel = parseInt(data.clearanceLevel);
            if (!this.siteManager.validateSiteAccess(siteId, clearanceLevel)) {
                errors.push(new ValidationError(
                    'clearanceLevel',
                    `Clearance level ${clearanceLevel} not authorized for ${siteId}`,
                    'SITE_ACCESS_DENIED',
                    { siteId, clearanceLevel, maxClearance: site.maxClearanceLevel }
                ));
            }
        }
        
        return errors;
    }
    
    validateDepartment(departmentId, data, cardType) {
        const errors = [];
        
        if (!departmentId) return errors;
        
        // Skip validation for card types that don't require departments
        if (['dclass', 'o5'].includes(cardType)) {
            return errors;
        }
        
        if (!this.siteManager || !data.siteDesignation) {
            errors.push(new ValidationError(
                'department',
                'Department validation requires site selection',
                'VALIDATION_DEPENDENCY',
                { severity: 'warning' }
            ));
            return errors;
        }
        
        const site = this.siteManager.getSite(data.siteDesignation);
        if (!site) {
            return errors; // Site validation will handle this
        }
        
        const department = site.departments.find(d => 
            d.departmentId === departmentId || d.name === departmentId
        );
        
        if (!department) {
            errors.push(new ValidationError(
                'department',
                `Department ${departmentId} is not available at ${data.siteDesignation}`,
                'INVALID_DEPARTMENT',
                { departmentId, siteId: data.siteDesignation }
            ));
            return errors;
        }
        
        // Validate clearance level for department
        if (data.clearanceLevel !== undefined) {
            const clearanceLevel = parseInt(data.clearanceLevel);
            if (clearanceLevel < department.requiredClearance) {
                errors.push(new ValidationError(
                    'clearanceLevel',
                    `Clearance level ${clearanceLevel} insufficient for ${department.name} (requires level ${department.requiredClearance})`,
                    'DEPARTMENT_ACCESS_DENIED',
                    { 
                        departmentId, 
                        clearanceLevel, 
                        requiredClearance: department.requiredClearance 
                    }
                ));
            }
        }
        
        return errors;
    }
    
    validateClearanceLevel(level, data, cardType) {
        const errors = [];
        
        if (level === undefined || level === null || level === '') {
            return errors;
        }
        
        const clearanceLevel = parseInt(level);
        
        // Validate against card type requirements
        const cardTypeConfig = this.getCardTypeConfig(cardType);
        if (cardTypeConfig && !cardTypeConfig.clearanceLevels.includes(clearanceLevel)) {
            errors.push(new ValidationError(
                'clearanceLevel',
                `Clearance level ${clearanceLevel} not authorized for ${cardType} personnel`,
                'CLEARANCE_MISMATCH',
                { cardType, allowedLevels: cardTypeConfig.clearanceLevels }
            ));
        }
        
        return errors;
    }
    
    validateDateOfBirth(dateString) {
        const errors = [];
        
        if (!dateString) return errors;
        
        const date = new Date(dateString);
        const now = new Date();
        const minAge = 18;
        const maxAge = 100;
        
        // Check if person is at least 18 years old
        const age = now.getFullYear() - date.getFullYear();
        const monthDiff = now.getMonth() - date.getMonth();
        const dayDiff = now.getDate() - date.getDate();
        
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        
        if (actualAge < minAge) {
            errors.push(new ValidationError(
                'dateOfBirth',
                `Personnel must be at least ${minAge} years old`,
                'INVALID_AGE',
                { minAge, actualAge }
            ));
        }
        
        if (actualAge > maxAge) {
            errors.push(new ValidationError(
                'dateOfBirth',
                `Age seems unrealistic (${actualAge} years)`,
                'INVALID_AGE',
                { severity: 'warning', maxAge, actualAge }
            ));
        }
        
        return errors;
    }
    
    validateIssueDate(dateString, data) {
        const errors = [];
        
        if (!dateString) return errors;
        
        const issueDate = new Date(dateString);
        const now = new Date();
        
        // Issue date should not be in the future
        if (issueDate > now) {
            errors.push(new ValidationError(
                'issueDate',
                'Issue date cannot be in the future',
                'INVALID_DATE_RANGE'
            ));
        }
        
        // Issue date should not be too far in the past
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        if (issueDate < oneYearAgo) {
            errors.push(new ValidationError(
                'issueDate',
                'Issue date is more than one year ago',
                'INVALID_DATE_RANGE',
                { severity: 'warning' }
            ));
        }
        
        return errors;
    }
    
    validateExpirationDate(dateString, data) {
        const errors = [];
        
        if (!dateString) return errors;
        
        const expirationDate = new Date(dateString);
        const now = new Date();
        
        // Expiration date should be in the future
        if (expirationDate <= now) {
            errors.push(new ValidationError(
                'expirationDate',
                'Expiration date must be in the future',
                'INVALID_DATE_RANGE'
            ));
        }
        
        // Check against issue date if provided
        if (data.issueDate) {
            const issueDate = new Date(data.issueDate);
            if (expirationDate <= issueDate) {
                errors.push(new ValidationError(
                    'expirationDate',
                    'Expiration date must be after issue date',
                    'INVALID_DATE_RANGE'
                ));
            }
            
            // Check if the validity period is reasonable
            const validityPeriod = (expirationDate - issueDate) / (1000 * 60 * 60 * 24); // days
            
            if (validityPeriod > 365 * 5) { // More than 5 years
                errors.push(new ValidationError(
                    'expirationDate',
                    'Validity period exceeds 5 years',
                    'INVALID_DATE_RANGE',
                    { severity: 'warning', validityDays: Math.round(validityPeriod) }
                ));
            }
            
            if (validityPeriod < 30) { // Less than 30 days
                errors.push(new ValidationError(
                    'expirationDate',
                    'Validity period is less than 30 days',
                    'INVALID_DATE_RANGE',
                    { severity: 'warning', validityDays: Math.round(validityPeriod) }
                ));
            }
        }
        
        return errors;
    }
    
    validatePhoto(file) {
        const errors = [];
        
        if (!file) return errors;
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            errors.push(new ValidationError(
                'photo',
                'Photo must be JPEG, PNG, or WebP format',
                'INVALID_FILE_TYPE',
                { allowedTypes, actualType: file.type }
            ));
        }
        
        // Check file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            errors.push(new ValidationError(
                'photo',
                `Photo size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
                'FILE_TOO_LARGE',
                { maxSize, actualSize: file.size }
            ));
        }
        
        // Check minimum dimensions (if possible)
        if (file.type.startsWith('image/')) {
            // This would require loading the image to check dimensions
            // For now, we'll add it as an info message
            errors.push(new ValidationError(
                'photo',
                'Recommended minimum size: 300x400 pixels',
                'PHOTO_SIZE_RECOMMENDATION',
                { severity: 'info' }
            ));
        }
        
        return errors;
    }
    
    validateFile(file, fieldName) {
        const errors = [];
        
        if (!file) {
            errors.push(new ValidationError(
                fieldName,
                'No file selected',
                'REQUIRED_FIELD'
            ));
            return { isValid: false, errors };
        }
        
        // Check file size (50MB max for batch files)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            errors.push(new ValidationError(
                fieldName,
                `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
                'FILE_TOO_LARGE',
                { maxSize, actualSize: file.size }
            ));
        }
        
        // Check file type for batch files
        if (fieldName === 'batchFile') {
            const allowedTypes = [
                'text/csv',
                'application/json',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ];
            
            const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
                errors.push(new ValidationError(
                    fieldName,
                    'File must be CSV, JSON, or Excel format',
                    'INVALID_FILE_TYPE',
                    { allowedTypes, allowedExtensions, actualType: file.type }
                ));
            }
        }
        
        return { isValid: errors.length === 0, errors };
    }
    
    validateCrossFields(data, cardType) {
        const errors = [];
        
        // Validate site and department combination
        if (data.siteDesignation && data.department && this.siteManager) {
            const validation = this.siteManager.validateCompleteAssignment(
                data.siteDesignation,
                data.department,
                parseInt(data.clearanceLevel)
            );
            
            if (!validation.isValid) {
                validation.errors.forEach(errorMsg => {
                    errors.push(new ValidationError(
                        'assignment',
                        errorMsg,
                        'ASSIGNMENT_VALIDATION_ERROR'
                    ));
                });
            }
            
            validation.warnings.forEach(warningMsg => {
                errors.push(new ValidationError(
                    'assignment',
                    warningMsg,
                    'ASSIGNMENT_WARNING',
                    { severity: 'warning' }
                ));
            });
        }
        
        return errors;
    }
    
    calculateCompletionPercentage(data, cardTypeConfig) {
        const requiredFields = cardTypeConfig.requiredFields;
        let completedFields = 0;
        
        requiredFields.forEach(fieldName => {
            const value = data[fieldName];
            if (value !== undefined && value !== null && value !== '') {
                // Additional check for specific field types
                if (fieldName === 'photo' && !(value instanceof File)) {
                    return; // Photo not properly uploaded
                }
                completedFields++;
            }
        });
        
        return Math.round((completedFields / requiredFields.length) * 100);
    }
    
    getCardTypeConfig(cardType) {
        const cardTypes = {
            researcher: {
                clearanceLevels: [1, 2, 3, 4],
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact']
            },
            security: {
                clearanceLevels: [1, 2, 3, 4, 5],
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact']
            },
            dclass: {
                clearanceLevels: [0],
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth']
            },
            o5: {
                clearanceLevels: [5],
                requiredFields: ['fullName', 'employeeId', 'position'],
                optionalFields: ['photo']
            },
            mtf: {
                clearanceLevels: [2, 3, 4, 5],
                requiredFields: ['fullName', 'employeeId', 'siteDesignation', 'department', 'clearanceLevel', 'position', 'issueDate', 'expirationDate'],
                optionalFields: ['photo', 'dateOfBirth', 'emergencyContact', 'specialDesignations']
            }
        };
        
        return cardTypes[cardType] || null;
    }
    
    getFieldLabel(fieldName) {
        const fieldLabels = {
            'fullName': 'Full Name',
            'employeeId': 'Employee ID',
            'siteDesignation': 'Site Designation',
            'department': 'Department',
            'clearanceLevel': 'Clearance Level',
            'position': 'Position',
            'dateOfBirth': 'Date of Birth',
            'issueDate': 'Issue Date',
            'expirationDate': 'Expiration Date',
            'photo': 'Photo',
            'emergencyContact': 'Emergency Contact'
        };
        
        return fieldLabels[fieldName] || fieldName;
    }
}

// Make classes globally available
window.ValidationError = ValidationError;
window.PersonnelValidator = PersonnelValidator;